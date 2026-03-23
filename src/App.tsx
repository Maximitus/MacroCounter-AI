/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Camera, Loader2, MoreVertical, X, Images } from 'lucide-react';
import { COMMON_MEALS } from './constants';
import toast, { Toaster } from 'react-hot-toast';
import { generateContentJson } from './geminiBridge';
import {
  formatMacroAmount,
  normalizeAiMacros,
  parseGoalIntInput,
  parseMacroAmountInput,
  sanitizeMacroAmountRaw,
} from './macroUtils';

const MACRO_ORDER = ['calories', 'protein', 'carbs', 'fat'] as const;
type MacroKey = (typeof MACRO_ORDER)[number];

const MACRO_RING_COLORS: Record<MacroKey, string> = {
  calories: 'var(--color-accent)',
  protein: '#38bdf8',
  carbs: '#c4b5fd',
  fat: '#f472b6',
};

function MacroProgressWheel({
  macroKey,
  current,
  goal,
}: {
  macroKey: MacroKey;
  current: number;
  goal: number;
}) {
  const safeGoal = goal > 0 ? goal : 1;
  const ratio = current / safeGoal;
  const displayPct = Math.round(ratio * 100);
  const arcRatio = Math.min(1, ratio);
  const overGoal = ratio >= 1;
  const size = 100;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - arcRatio);
  const ringColor = overGoal ? '#34d399' : MACRO_RING_COLORS[macroKey];
  const label = macroKey.charAt(0).toUpperCase() + macroKey.slice(1);

  return (
    <div
      className="relative mx-auto flex h-[5.25rem] w-[5.25rem] shrink-0 items-center justify-center sm:h-[5.75rem] sm:w-[5.75rem]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(100, displayPct)}
      aria-valuetext={`${displayPct}% of ${label} goal`}
      aria-label={`${label} progress toward daily goal`}
    >
      <svg
        className="absolute inset-0 -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-neutral-700"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <span className="relative text-center leading-tight">
        <span className="block text-lg font-bold tabular-nums text-white sm:text-xl">
          {displayPct}%
        </span>
      </span>
    </div>
  );
}

function toastAiConfigError(error: unknown, fallback: string) {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes('GEMINI_API_KEY') || msg.includes('Missing GEMINI')) {
    toast.error(
      'AI is not configured for this site yet. Add the GEMINI_API_KEY secret to the Cloudflare Worker (Dashboard → Workers & Pages → your worker → Settings → Variables and Secrets).',
      {duration: 9000},
    );
    return;
  }
  toast.error(fallback);
}

function summarizeAiMealItems(items: unknown): {
  mealName: string;
  macros: {calories: number; protein: number; carbs: number; fat: number};
} | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  const normalized = items.map((item: Record<string, unknown>) => ({
    ...item,
    ...normalizeAiMacros(item),
  }));
  const macros = normalizeAiMacros(
    normalized.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
      }),
      {calories: 0, protein: 0, carbs: 0, fat: 0},
    ),
  );
  const mealName =
    normalized
      .map((i) => String(i.name ?? '').trim())
      .filter(Boolean)
      .join(', ') || 'AI meal';
  return {mealName, macros};
}

export default function App() {
  const [macros, setMacros] = useState(() => {
    const saved = localStorage.getItem('macros');
    return saved ? JSON.parse(saved) : { calories: 0, protein: 0, carbs: 0, fat: 0 };
  });
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem('goals');
    return saved ? JSON.parse(saved) : { calories: 2000, protein: 150, carbs: 200, fat: 70 };
  });
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [goalsAiLoading, setGoalsAiLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [manualMacros, setManualMacros] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  /** While focused, keep raw text so values like "12." or "0." stay editable. */
  const [macroFieldDraft, setMacroFieldDraft] = useState<
    Partial<Record<keyof typeof manualMacros, string>>
  >({});
  const [manualMode, setManualMode] = useState<'individual' | 'favorites' | 'common'>('favorites');
  const [favorites, setFavorites] = useState<{name: string, macros: typeof manualMacros}[]>(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [favName, setFavName] = useState('');
  const [textDescription, setTextDescription] = useState('');
  const [history, setHistory] = useState<{id: string, name: string, macros: typeof manualMacros}[]>(() => {
    const saved = localStorage.getItem('history');
    return saved ? JSON.parse(saved) : [];
  });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'manual' | 'ai' | 'picture'>('manual');
  const [aiPrompt, setAiPrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    const lastDate = localStorage.getItem('lastUpdatedDate');
    const today = new Date().toDateString();
    
    if (lastDate !== today) {
      setMacros({ calories: 0, protein: 0, carbs: 0, fat: 0 });
      setHistory([]);
      localStorage.setItem('lastUpdatedDate', today);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('macros', JSON.stringify(macros));
    localStorage.setItem('history', JSON.stringify(history));
    localStorage.setItem('goals', JSON.stringify(goals));
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [macros, history, goals, favorites]);

  useEffect(() => {
    if (isGoalsModalOpen || isModalOpen || cameraOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isGoalsModalOpen, isModalOpen, cameraOpen]);

  type ManualMacroKey = keyof typeof manualMacros;
  const macroInputValue = (key: ManualMacroKey) =>
    macroFieldDraft[key] !== undefined ? macroFieldDraft[key]! : String(manualMacros[key]);

  const handleMacroInputFocus = (key: ManualMacroKey) => {
    setMacroFieldDraft((d) => ({ ...d, [key]: String(manualMacros[key]) }));
  };

  const handleMacroInputBlur = (key: ManualMacroKey) => {
    setMacroFieldDraft((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });
  };

  const handleMacroInputChange = (key: ManualMacroKey, raw: string) => {
    const s = sanitizeMacroAmountRaw(raw);
    setMacroFieldDraft((d) => ({ ...d, [key]: s }));
    setManualMacros((prev) => ({ ...prev, [key]: parseMacroAmountInput(s) }));
  };

  const addMeal = (name: string, macrosToAdd: typeof manualMacros) => {
    setMacros(prev => ({
      calories: prev.calories + macrosToAdd.calories,
      protein: prev.protein + macrosToAdd.protein,
      carbs: prev.carbs + macrosToAdd.carbs,
      fat: prev.fat + macrosToAdd.fat,
    }));
    setHistory(prev => [...prev, {id: Date.now().toString(), name, macros: macrosToAdd}]);
    toast.success(`Added ${name} to daily log`);
  };

  const removeMeal = (id: string, macrosToRemove: typeof manualMacros) => {
    setMacros(prev => ({
      calories: prev.calories - macrosToRemove.calories,
      protein: prev.protein - macrosToRemove.protein,
      carbs: prev.carbs - macrosToRemove.carbs,
      fat: prev.fat - macrosToRemove.fat,
    }));
    setHistory(prev => prev.filter(meal => meal.id !== id));
    toast.success("Meal removed from daily log");
  };

  const handleTextAnalysis = async () => {
    if (!textDescription) return;
    setLoading(true);
    try {
      const text = await generateContentJson({
        parts: [
          {
            text: `Analyze this food description: "${textDescription}". Return a list of food items identified in the description, with their estimated portion size, calories, protein (g), carbs (g), and fat (g) for each item. Return as a JSON array of objects. Format: [{name: string, portion: string, calories: number, protein: number, carbs: number, fat: number}]`,
          },
        ],
      });
      const result = JSON.parse(text);
      const summary = summarizeAiMealItems(result);
      if (!summary) {
        toast.error('No food items could be identified.');
        return;
      }
      addMeal(summary.mealName, summary.macros);
      setTextDescription('');
    } catch (error) {
      console.error("Error analyzing food description:", error);
      toastAiConfigError(error, "Could not analyze description.");
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  };

  const processImageFile = (file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      try {
        const text = await generateContentJson({
          parts: [
            { inlineData: { mimeType: file.type, data: base64String } },
            {
              text: 'Analyze this food image. Return a list of food items identified in the image, with their estimated portion size, calories, protein (g), carbs (g), and fat (g) for each item. Return as a JSON array of objects. Format: [{name: string, portion: string, calories: number, protein: number, carbs: number, fat: number}]',
            },
          ],
        });

        const result = JSON.parse(text);
        const summary = summarizeAiMealItems(result);
        if (!summary) {
          toast.error('No food items could be identified.');
          return;
        }
        addMeal(summary.mealName, summary.macros);
      } catch (error) {
        console.error('Error analyzing food:', error);
        toastAiConfigError(error, 'Could not analyze image.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    processImageFile(file);
  };

  const openDeviceCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      fileInputRef.current?.click();
      return;
    }
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      stopCamera();
      cameraStreamRef.current = stream;
      setCameraOpen(true);
    } catch {
      fileInputRef.current?.click();
    }
  };

  useEffect(() => {
    if (!cameraOpen || !cameraVideoRef.current || !cameraStreamRef.current) return;
    const video = cameraVideoRef.current;
    video.srcObject = cameraStreamRef.current;
    video.play().catch(() => {});
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const closeCameraModal = () => {
    stopCamera();
    setCameraOpen(false);
  };

  const captureFromCamera = () => {
    const video = cameraVideoRef.current;
    if (!video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        closeCameraModal();
        processImageFile(file);
      },
      'image/jpeg',
      0.92,
    );
  };

  const saveFavorite = (name: string, macros: typeof manualMacros) => {
    setFavorites([...favorites, {name, macros}]);
    setIsModalOpen(false);
    toast.success(`Added ${name} to favorites`);
  };

  return (
    <div className="min-h-screen blueprint-bg text-white font-sans">
      <Toaster />
      <header className="p-6 bg-[var(--color-card-dark)] shadow-sm border-b border-neutral-700">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-accent)]">Macro Counter</h1>
      </header>

      <main className="p-6 space-y-8">
        <section className="bg-[var(--color-card-dark)] p-6 rounded-2xl shadow-sm border border-neutral-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-white">Daily Totals</h2>
            <button className="text-sm text-[var(--color-accent)]" onClick={() => setIsGoalsModalOpen(true)}>Set Goals</button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {MACRO_ORDER.map((key) => {
              const value = macros[key];
              const goal = goals[key];
              const unit = key === 'calories' ? 'kcal' : 'g';
              return (
                <div
                  key={key}
                  className="flex flex-col items-center gap-3 bg-[var(--color-surface)] p-4 rounded-xl border border-neutral-700 sm:p-5"
                >
                  <MacroProgressWheel macroKey={key} current={value} goal={goal} />
                  <div className="w-full min-w-0 text-center">
                    <p className="text-sm font-medium capitalize text-[var(--color-text-light)]">{key}</p>
                    <p className="mt-0.5 text-lg font-bold tabular-nums text-white sm:text-xl">
                      {value.toFixed(0)}
                      <span className="font-normal text-[var(--color-text-light)]"> / {goal}</span>
                      <span className="text-sm font-normal text-[var(--color-text-light)] ml-0.5">{unit}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-[var(--color-card-dark)] p-6 rounded-2xl shadow-sm border border-neutral-700">
          <div className="flex gap-4 mb-6">
            <button 
              className={`flex-1 py-3 rounded-full font-medium transition ${mode === 'ai' ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-light)] hover:bg-neutral-700'}`}
              onClick={() => setMode('ai')}
            >
              AI Analysis
            </button>
            <button 
              className={`flex-1 py-3 rounded-full font-medium transition ${mode === 'manual' ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-light)] hover:bg-neutral-700'}`}
              onClick={() => setMode('manual')}
            >
              Manual Entry
            </button>
          </div>

          {mode === 'ai' ? (
            <div className="space-y-5">
                <input
                  id="meal-photo-camera"
                  name="meal_photo_camera"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <input
                  id="meal-photo-gallery"
                  name="meal_photo_gallery"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={galleryInputRef}
                  onChange={handleFileChange}
                />
              <div className="space-y-3">
                <div className="px-0.5">
                  <h3 className="text-base font-semibold text-white">Photo</h3>
                  <p className="mt-0.5 text-sm leading-snug text-[var(--color-text-light)]">
                    Snap your meal or pick one you already have.
                  </p>
                </div>
                {loading ? (
                  <div className="flex min-h-[7.5rem] items-center justify-center rounded-2xl bg-[var(--color-surface)] border border-neutral-700">
                    <Loader2 className="h-10 w-10 text-[var(--color-accent)] animate-spin" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                    <button
                      type="button"
                      className="flex min-h-[3.5rem] flex-1 touch-manipulation items-center gap-4 rounded-2xl bg-[var(--color-accent)] px-4 py-3.5 text-left font-semibold text-white shadow-sm transition active:opacity-90 sm:min-h-[4rem] sm:flex-col sm:justify-center sm:gap-2 sm:py-5"
                      onClick={() => void openDeviceCamera()}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 sm:h-12 sm:w-12">
                        <Camera className="h-6 w-6" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 sm:text-center">Take photo</span>
                    </button>
                    <button
                      type="button"
                      className="flex min-h-[3.5rem] flex-1 touch-manipulation items-center gap-4 rounded-2xl border border-neutral-600 bg-[var(--color-surface)] px-4 py-3.5 text-left font-semibold text-white transition active:bg-neutral-700 sm:min-h-[4rem] sm:flex-col sm:justify-center sm:gap-2 sm:py-5"
                      onClick={() => galleryInputRef.current?.click()}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-800 sm:h-12 sm:w-12">
                        <Images className="h-6 w-6 text-[var(--color-text-light)]" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 sm:text-center">Choose from photos</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-2 border-t border-neutral-700 pt-5">
                <label htmlFor="meal-description" className="block text-sm font-medium text-white">
                  Or describe it
                </label>
                <div className="flex w-full min-w-0 flex-wrap gap-2 items-stretch">
                  <input
                    id="meal-description"
                    name="meal_description"
                    type="text"
                    enterKeyHint="send"
                    autoComplete="off"
                    placeholder="e.g. chicken salad, large"
                    value={textDescription}
                    onChange={(e) => setTextDescription(e.target.value)}
                    className="min-w-0 max-w-full grow shrink basis-[min(100%,12rem)] box-border rounded-xl border border-neutral-600 bg-[var(--color-surface)] px-3 py-3.5 text-base text-white placeholder:text-neutral-500"
                  />
                  <button
                    type="button"
                    className="inline-flex min-h-[3rem] shrink-0 grow-0 touch-manipulation items-center justify-center rounded-xl bg-neutral-700 px-5 py-3 text-base font-medium text-white active:bg-neutral-600 sm:min-h-0"
                    onClick={handleTextAnalysis}
                  >
                    Analyze
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex gap-2">
                <button 
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition ${manualMode === 'favorites' ? 'bg-neutral-700 text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-light)]'}`}
                  onClick={() => setManualMode('favorites')}
                >
                  Favorites
                </button>
                <button 
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition ${manualMode === 'common' ? 'bg-neutral-700 text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-light)]'}`}
                  onClick={() => setManualMode('common')}
                >
                  Common
                </button>
                <button 
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition ${manualMode === 'individual' ? 'bg-neutral-700 text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-light)]'}`}
                  onClick={() => setManualMode('individual')}
                >
                  Individual
                </button>
              </div>

              {manualMode === 'favorites' ? (
                <div className="space-y-4">
                  <button className="w-full bg-neutral-700 text-white py-3 rounded-xl" onClick={() => setIsModalOpen(true)}>Add New Favorite</button>
                  <div className="space-y-2">
                    {favorites.map((fav, index) => (
                      <div 
                        key={index}
                        className="w-full bg-[var(--color-surface)] p-4 rounded-xl text-left flex justify-between items-center"
                      >
                        <button className="flex-1 text-left" onClick={() => addMeal(fav.name, fav.macros)}>
                          <p className="font-bold text-white">{fav.name}</p>
                          <p className="text-sm text-[var(--color-text-light)]">{formatMacroAmount(fav.macros.calories)} kcal, {formatMacroAmount(fav.macros.protein)}g P, {formatMacroAmount(fav.macros.carbs)}g C, {formatMacroAmount(fav.macros.fat)}g F</p>
                        </button>
                        <div className="relative">
                          <button onClick={() => setOpenMenuId(openMenuId === `fav-${index}` ? null : `fav-${index}`)}>
                            <MoreVertical className="text-white" />
                          </button>
                          {openMenuId === `fav-${index}` && (
                            <div className="absolute right-0 mt-2 bg-neutral-800 rounded-lg shadow-lg z-10 p-2 space-y-1">
                              <button className="block w-full text-left text-red-400 hover:text-red-300 px-2 py-1" onClick={() => {setFavorites(favorites.filter((_, i) => i !== index)); setOpenMenuId(null); toast.success("Favorite removed");}}>Remove</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : manualMode === 'common' ? (
                <div className="space-y-2">
                  {COMMON_MEALS.map((meal, index) => (
                    <button 
                      key={index}
                      className="w-full bg-[var(--color-surface)] p-4 rounded-xl text-left hover:bg-neutral-700 transition"
                      onClick={() => addMeal(meal.name, meal.macros)}
                    >
                      <p className="font-bold text-white">{meal.name}</p>
                      <p className="text-sm text-[var(--color-text-light)]">{formatMacroAmount(meal.macros.calories)} kcal, {formatMacroAmount(meal.macros.protein)}g P, {formatMacroAmount(meal.macros.carbs)}g C, {formatMacroAmount(meal.macros.fat)}g F</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.keys(manualMacros).map((key) => (
                    <div key={key} className="flex items-center gap-4">
                      <label htmlFor={`manual-macro-${key}`} className="capitalize w-24 text-[var(--color-text-light)]">
                        {key}
                      </label>
                      <input
                        id={`manual-macro-${key}`}
                        name={`manual_macro_${key}`}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={macroInputValue(key as ManualMacroKey)}
                        onFocus={() => handleMacroInputFocus(key as ManualMacroKey)}
                        onBlur={() => handleMacroInputBlur(key as ManualMacroKey)}
                        onChange={(e) => handleMacroInputChange(key as ManualMacroKey, e.target.value)}
                        className="flex-1 p-3 rounded-xl bg-[var(--color-surface)] border border-neutral-600 focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-white"
                      />
                    </div>
                  ))}
                  <button 
                    className="w-full bg-[var(--color-accent)] text-white py-4 rounded-full font-medium hover:bg-[var(--color-accent-hover)] transition"
                    onClick={() => addMeal("Manual Entry", manualMacros)}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="bg-[var(--color-card-dark)] p-6 rounded-2xl shadow-sm border border-neutral-700">
          <h2 className="text-lg font-semibold mb-6 text-white">Meal History</h2>
          <div className="space-y-2">
            {history.map((meal) => (
              <div key={meal.id} className="flex justify-between items-center bg-[var(--color-surface)] p-4 rounded-xl">
                <div>
                  <p className="font-bold text-white">{meal.name}</p>
                  <p className="text-sm text-[var(--color-text-light)]">{formatMacroAmount(meal.macros.calories)} kcal, {formatMacroAmount(meal.macros.protein)}g P, {formatMacroAmount(meal.macros.carbs)}g C, {formatMacroAmount(meal.macros.fat)}g F</p>
                </div>
                <div className="relative">
                  <button onClick={() => setOpenMenuId(openMenuId === meal.id ? null : meal.id)}>
                    <MoreVertical className="text-white" />
                  </button>
                  {openMenuId === meal.id && (
                    <div className="absolute right-0 mt-2 bg-neutral-800 rounded-lg shadow-lg z-10 p-2 space-y-1">
                      <button className="block w-full text-left text-blue-400 hover:text-blue-300 px-2 py-1" onClick={() => {setFavorites([...favorites, {name: meal.name, macros: meal.macros}]); setOpenMenuId(null); toast.success("Added to favorites");}}>Favorite</button>
                      <button className="block w-full text-left text-red-400 hover:text-red-300 px-2 py-1" onClick={() => {removeMeal(meal.id, meal.macros); setOpenMenuId(null)}}>Remove</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex justify-end mb-2">
            <button
              type="button"
              className="rounded-full bg-neutral-800 p-2 text-white hover:bg-neutral-700"
              onClick={closeCameraModal}
              aria-label="Close camera"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
            <video
              ref={cameraVideoRef}
              className="max-h-[min(70vh,100%)] w-full max-w-lg rounded-xl object-cover"
              autoPlay
              playsInline
              muted
            />
            <div className="flex w-full max-w-lg flex-wrap gap-2">
              <button
                type="button"
                className="flex-1 min-w-[8rem] rounded-xl bg-[var(--color-accent)] py-4 font-medium text-white hover:bg-[var(--color-accent-hover)]"
                onClick={captureFromCamera}
              >
                Capture
              </button>
              <button
                type="button"
                className="flex-1 min-w-[8rem] rounded-xl bg-neutral-700 py-4 font-medium text-white hover:bg-neutral-600"
                onClick={closeCameraModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 [&::-webkit-scrollbar]:hidden">
          <div className="bg-[var(--color-card-dark)] p-6 rounded-2xl shadow-lg w-full max-w-md border border-neutral-700 [&::-webkit-scrollbar]:hidden">
            <h2 className="text-lg font-semibold mb-4 text-white">Add Favorite</h2>
            <div className="flex gap-2 mb-4">
              <button className={`flex-1 py-2 rounded-full ${modalMode === 'manual' ? 'bg-neutral-700' : ''}`} onClick={() => setModalMode('manual')}>Manual</button>
              <button className={`flex-1 py-2 rounded-full ${modalMode === 'ai' ? 'bg-neutral-700' : ''}`} onClick={() => setModalMode('ai')}>AI</button>
              <button className={`flex-1 py-2 rounded-full ${modalMode === 'picture' ? 'bg-neutral-700' : ''}`} onClick={() => setModalMode('picture')}>Picture</button>
            </div>
            {modalMode === 'manual' && (
              <div className="space-y-4">
                <input
                  id="favorite-manual-name"
                  name="favorite_manual_name"
                  type="text"
                  placeholder="Name"
                  value={favName}
                  onChange={(e) => setFavName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--color-surface)] border border-neutral-600 text-white"
                />
                {Object.keys(manualMacros).map((key) => (
                  <input
                    key={key}
                    id={`favorite-manual-macro-${key}`}
                    name={`favorite_manual_macro_${key}`}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder={key}
                    value={macroInputValue(key as ManualMacroKey)}
                    onFocus={() => handleMacroInputFocus(key as ManualMacroKey)}
                    onBlur={() => handleMacroInputBlur(key as ManualMacroKey)}
                    onChange={(e) => handleMacroInputChange(key as ManualMacroKey, e.target.value)}
                    className="w-full p-3 rounded-xl bg-[var(--color-surface)] border border-neutral-600 text-white"
                  />
                ))}
                <button className="w-full bg-[var(--color-accent)] text-white py-3 rounded-full" onClick={() => saveFavorite(favName, manualMacros)}>Save</button>
              </div>
            )}
            {modalMode === 'ai' && (
              <div className="space-y-4">
                <input
                  id="favorite-ai-name"
                  name="favorite_ai_name"
                  type="text"
                  placeholder="Name"
                  value={favName}
                  onChange={(e) => setFavName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--color-surface)] border border-neutral-600 text-white"
                />
                <input
                  id="favorite-ai-description"
                  name="favorite_ai_description"
                  type="text"
                  placeholder="Description"
                  value={textDescription}
                  onChange={(e) => setTextDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--color-surface)] border border-neutral-600 text-white"
                />
                <button className="w-full bg-[var(--color-accent)] text-white py-3 rounded-full" onClick={async () => {
                  setLoading(true);
                  try {
                    const text = await generateContentJson({
                      parts: [
                        {
                          text: `Analyze this food description: "${textDescription}". Return the estimated calories, protein (g), carbs (g), and fat (g) as a JSON object. Format: {calories: number, protein: number, carbs: number, fat: number}`,
                        },
                      ],
                    });
                    const result = JSON.parse(text);
                    saveFavorite(favName, normalizeAiMacros(result));
                  } catch (error) {
                    console.error('Favorite AI description:', error);
                    toastAiConfigError(error, 'Could not analyze favorite.');
                  } finally {
                    setLoading(false);
                  }
                }}>Save</button>
              </div>
            )}
            {modalMode === 'picture' && (
              <div className="space-y-4">
                <input
                  id="favorite-picture-name"
                  name="favorite_picture_name"
                  type="text"
                  placeholder="Name"
                  value={favName}
                  onChange={(e) => setFavName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--color-surface)] border border-neutral-600 text-white"
                />
                <input
                  id="favorite-picture-file"
                  name="favorite_picture_file"
                  type="file"
                  accept="image/*"
                  className="w-full p-3 rounded-xl bg-[var(--color-surface)] border border-neutral-600 text-white"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setLoading(true);
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                      const base64String = (reader.result as string).split(',')[1];
                      try {
                        const text = await generateContentJson({
                          parts: [
                            {inlineData: {mimeType: file.type, data: base64String}},
                            {
                              text: 'Analyze this food image. Return the estimated calories, protein (g), carbs (g), and fat (g) as a JSON object. Format: {calories: number, protein: number, carbs: number, fat: number}',
                            },
                          ],
                        });
                        const result = JSON.parse(text);
                        saveFavorite(favName, normalizeAiMacros(result));
                      } catch (error) {
                        console.error('Favorite AI picture:', error);
                        toastAiConfigError(error, 'Could not analyze image.');
                      } finally {
                        setLoading(false);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
            )}
            <button className="mt-4 text-[var(--color-text-light)]" onClick={() => setIsModalOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      {isGoalsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 [&::-webkit-scrollbar]:hidden">
          <div className="bg-[var(--color-card-dark)] p-6 rounded-2xl shadow-lg w-full max-w-md border border-neutral-700 [&::-webkit-scrollbar]:hidden">
            <h2 className="text-lg font-semibold mb-4 text-white">Set Macro Goals</h2>
            <div className="space-y-4 [&::-webkit-scrollbar]:hidden">
              <div className="bg-[var(--color-surface)] p-4 rounded-xl border border-neutral-600">
                <h3 className="text-sm font-semibold text-white mb-2">AI Goal Setting</h3>
                {goalsAiLoading ? (
                  <div className="flex min-h-[7.5rem] flex-col items-center justify-center gap-3 rounded-xl bg-[var(--color-surface-deep)] border border-neutral-600">
                    <Loader2 className="h-10 w-10 text-[var(--color-accent)] animate-spin" aria-hidden />
                    <span className="text-sm text-[var(--color-text-light)]">Generating goals…</span>
                  </div>
                ) : (
                  <>
                    <textarea
                      id="goals-ai-prompt"
                      name="goals_ai_prompt"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g., I want to lose weight, I am 180lbs and 6ft tall."
                      className="w-full p-3 rounded-xl bg-[var(--color-surface-deep)] border border-neutral-600 text-white mb-2"
                      rows={2}
                    />
                    <button 
                      type="button"
                      className="w-full bg-neutral-700 text-white py-2 rounded-full font-medium hover:bg-neutral-600 transition text-sm"
                      onClick={async () => {
                        setGoalsAiLoading(true);
                        try {
                          const text = await generateContentJson({
                            parts: [
                              {
                                text: `Act as a nutritionist. Based on this user info: "${aiPrompt}", recommend daily macro goals (calories, protein, carbs, fat). Return as JSON: {calories: number, protein: number, carbs: number, fat: number}`,
                              },
                            ],
                          });
                          const result = JSON.parse(text);
                          setGoals(normalizeAiMacros(result));
                          toast.success("Macro goals updated via AI");
                        } catch (error) {
                          console.error("Error generating goals:", error);
                          toastAiConfigError(error, 'Could not generate goals.');
                        } finally {
                          setGoalsAiLoading(false);
                        }
                      }}
                    >
                      Generate Goals with AI
                    </button>
                  </>
                )}
              </div>
              {Object.keys(goals).map((key) => (
                <div key={key} className="flex items-center gap-4">
                  <label htmlFor={`goal-${key}`} className="capitalize w-24 text-[var(--color-text-light)]">
                    {key}
                  </label>
                  <input
                    id={`goal-${key}`}
                    name={`goal_${key}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={String(goals[key as keyof typeof goals])}
                    onChange={(e) =>
                      setGoals((prev) => ({
                        ...prev,
                        [key]: parseGoalIntInput(e.target.value),
                      }))
                    }
                    className="flex-1 p-3 rounded-xl bg-[var(--color-surface)] border border-neutral-600 focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-white"
                  />
                </div>
              ))}
              <button 
                className="w-full bg-[var(--color-accent)] text-white py-3 rounded-full font-medium hover:bg-[var(--color-accent-hover)] transition"
                onClick={() => {setIsGoalsModalOpen(false); toast.success("Macro goals updated");}}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
