/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Camera, Edit3, Loader2, Check, Plus, MoreVertical, X, Images } from 'lucide-react';
import { COMMON_MEALS } from './constants';
import toast, { Toaster } from 'react-hot-toast';
import { generateContentJson } from './geminiBridge';
import { formatMacroAmount, normalizeAiMacros } from './macroUtils';

interface FoodItem {
  id: string;
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
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
  const [pendingMeal, setPendingMeal] = useState<FoodItem[] | null>(null);
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
    if (isGoalsModalOpen || isModalOpen || pendingMeal || cameraOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isGoalsModalOpen, isModalOpen, pendingMeal, cameraOpen]);

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
      const itemsWithIds = result.map((item: any) => ({
        ...item,
        ...normalizeAiMacros(item),
        id: Date.now().toString() + Math.random(),
      }));
      setPendingMeal(itemsWithIds);
      setTextDescription('');
    } catch (error) {
      console.error("Error analyzing food description:", error);
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
        const itemsWithIds = result.map((item: any) => ({
          ...item,
          ...normalizeAiMacros(item),
          id: Date.now().toString() + Math.random(),
        }));
        setPendingMeal(itemsWithIds);
      } catch (error) {
        console.error('Error analyzing food:', error);
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
    <div className="min-h-screen bg-[var(--color-bg-dark)] text-white font-sans">
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
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(macros).map(([key, value]) => (
              <div key={key} className="bg-[#1e2327] p-5 rounded-xl border border-neutral-700">
                <p className="text-sm text-[var(--color-text-light)] capitalize">{key}</p>
                <p className="text-3xl font-bold text-white">
                  {(value as number).toFixed(0)} / {goals[key as keyof typeof goals]}
                  <span className="text-sm font-normal text-[var(--color-text-light)] ml-1">{key !== 'calories' ? 'g' : ''}</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[var(--color-card-dark)] p-6 rounded-2xl shadow-sm border border-neutral-700">
          <div className="flex gap-4 mb-6">
            <button 
              className={`flex-1 py-3 rounded-full font-medium transition ${mode === 'ai' ? 'bg-[var(--color-accent)] text-white' : 'bg-[#1e2327] text-[var(--color-text-light)] hover:bg-neutral-700'}`}
              onClick={() => setMode('ai')}
            >
              AI Analysis
            </button>
            <button 
              className={`flex-1 py-3 rounded-full font-medium transition ${mode === 'manual' ? 'bg-[var(--color-accent)] text-white' : 'bg-[#1e2327] text-[var(--color-text-light)] hover:bg-neutral-700'}`}
              onClick={() => setMode('manual')}
            >
              Manual Entry
            </button>
          </div>

          {mode === 'ai' ? (
            <div className="space-y-5">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <input
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
                  <div className="flex min-h-[7.5rem] items-center justify-center rounded-2xl bg-[#1e2327] border border-neutral-700">
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
                      className="flex min-h-[3.5rem] flex-1 touch-manipulation items-center gap-4 rounded-2xl border border-neutral-600 bg-[#1e2327] px-4 py-3.5 text-left font-semibold text-white transition active:bg-neutral-700 sm:min-h-[4rem] sm:flex-col sm:justify-center sm:gap-2 sm:py-5"
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
                    type="text"
                    enterKeyHint="send"
                    autoComplete="off"
                    placeholder="e.g. chicken salad, large"
                    value={textDescription}
                    onChange={(e) => setTextDescription(e.target.value)}
                    className="min-w-0 max-w-full grow shrink basis-[min(100%,12rem)] box-border rounded-xl border border-neutral-600 bg-[#1e2327] px-3 py-3.5 text-base text-white placeholder:text-neutral-500"
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
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition ${manualMode === 'favorites' ? 'bg-neutral-700 text-white' : 'bg-[#1e2327] text-[var(--color-text-light)]'}`}
                  onClick={() => setManualMode('favorites')}
                >
                  Favorites
                </button>
                <button 
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition ${manualMode === 'common' ? 'bg-neutral-700 text-white' : 'bg-[#1e2327] text-[var(--color-text-light)]'}`}
                  onClick={() => setManualMode('common')}
                >
                  Common
                </button>
                <button 
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition ${manualMode === 'individual' ? 'bg-neutral-700 text-white' : 'bg-[#1e2327] text-[var(--color-text-light)]'}`}
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
                        className="w-full bg-[#1e2327] p-4 rounded-xl text-left flex justify-between items-center"
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
                      className="w-full bg-[#1e2327] p-4 rounded-xl text-left hover:bg-neutral-700 transition"
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
                      <label className="capitalize w-24 text-[var(--color-text-light)]">{key}</label>
                      <input 
                        type="number" 
                        value={manualMacros[key as keyof typeof manualMacros]}
                        onChange={(e) => setManualMacros(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                        className="flex-1 p-3 rounded-xl bg-[#1e2327] border border-neutral-600 focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-white"
                      />
                    </div>
                  ))}
                  <button 
                    className="w-full bg-[var(--color-accent)] text-white py-4 rounded-full font-medium hover:bg-[#d66e20] transition"
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
              <div key={meal.id} className="flex justify-between items-center bg-[#1e2327] p-4 rounded-xl">
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
                className="flex-1 min-w-[8rem] rounded-xl bg-[var(--color-accent)] py-4 font-medium text-white hover:bg-[#d66e20]"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 [&::-webkit-scrollbar]:hidden">
          <div className="bg-[var(--color-card-dark)] p-6 rounded-2xl shadow-lg w-full max-w-md border border-neutral-700 [&::-webkit-scrollbar]:hidden">
            <h2 className="text-lg font-semibold mb-4 text-white">Add Favorite</h2>
            <div className="flex gap-2 mb-4">
              <button className={`flex-1 py-2 rounded-full ${modalMode === 'manual' ? 'bg-neutral-700' : ''}`} onClick={() => setModalMode('manual')}>Manual</button>
              <button className={`flex-1 py-2 rounded-full ${modalMode === 'ai' ? 'bg-neutral-700' : ''}`} onClick={() => setModalMode('ai')}>AI</button>
              <button className={`flex-1 py-2 rounded-full ${modalMode === 'picture' ? 'bg-neutral-700' : ''}`} onClick={() => setModalMode('picture')}>Picture</button>
            </div>
            {modalMode === 'manual' && (
              <div className="space-y-4">
                <input type="text" placeholder="Name" value={favName} onChange={(e) => setFavName(e.target.value)} className="w-full p-3 rounded-xl bg-[#1e2327] border border-neutral-600 text-white" />
                {Object.keys(manualMacros).map((key) => (
                  <input key={key} type="number" placeholder={key} onChange={(e) => setManualMacros(prev => ({ ...prev, [key]: Number(e.target.value) }))} className="w-full p-3 rounded-xl bg-[#1e2327] border border-neutral-600 text-white" />
                ))}
                <button className="w-full bg-[var(--color-accent)] text-white py-3 rounded-full" onClick={() => saveFavorite(favName, manualMacros)}>Save</button>
              </div>
            )}
            {modalMode === 'ai' && (
              <div className="space-y-4">
                <input type="text" placeholder="Name" value={favName} onChange={(e) => setFavName(e.target.value)} className="w-full p-3 rounded-xl bg-[#1e2327] border border-neutral-600 text-white" />
                <input type="text" placeholder="Description" value={textDescription} onChange={(e) => setTextDescription(e.target.value)} className="w-full p-3 rounded-xl bg-[#1e2327] border border-neutral-600 text-white" />
                <button className="w-full bg-[var(--color-accent)] text-white py-3 rounded-full" onClick={async () => {
                  setLoading(true);
                  const text = await generateContentJson({
                    parts: [
                      {
                        text: `Analyze this food description: "${textDescription}". Return the estimated calories, protein (g), carbs (g), and fat (g) as a JSON object. Format: {calories: number, protein: number, carbs: number, fat: number}`,
                      },
                    ],
                  });
                  const result = JSON.parse(text);
                  saveFavorite(favName, normalizeAiMacros(result));
                  setLoading(false);
                }}>Save</button>
              </div>
            )}
            {modalMode === 'picture' && (
              <div className="space-y-4">
                <input type="text" placeholder="Name" value={favName} onChange={(e) => setFavName(e.target.value)} className="w-full p-3 rounded-xl bg-[#1e2327] border border-neutral-600 text-white" />
                <input type="file" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLoading(true);
                  const reader = new FileReader();
                  reader.onloadend = async () => {
                    const base64String = (reader.result as string).split(',')[1];
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
                    setLoading(false);
                  };
                  reader.readAsDataURL(file);
                }} className="w-full p-3 rounded-xl bg-[#1e2327] border border-neutral-600 text-white" />
              </div>
            )}
            <button className="mt-4 text-[var(--color-text-light)]" onClick={() => setIsModalOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      {pendingMeal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50 overflow-x-hidden [&::-webkit-scrollbar]:hidden">
          <div className="bg-[var(--color-card-dark)] p-6 rounded-2xl shadow-lg w-full max-w-md border border-neutral-700 [&::-webkit-scrollbar]:hidden">
            <h2 className="text-lg font-semibold mb-4 text-white">Review Meal</h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:hidden">
              {pendingMeal.map((item, index) => (
                <div key={item.id} className="p-3 bg-[#1e2327] rounded-xl border border-neutral-600 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={item.name}
                      onChange={(e) => setPendingMeal(prev => prev ? prev.map((i, idx) => idx === index ? {...i, name: e.target.value} : i) : null)}
                      className="flex-1 p-2 rounded-lg bg-[#151a1e] border border-neutral-600 text-white text-sm"
                      placeholder="Food name"
                    />
                    <div className="relative">
                      <button onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}>
                        <MoreVertical className="text-white" />
                      </button>
                      {openMenuId === item.id && (
                        <div className="absolute right-0 mt-2 bg-neutral-800 rounded-lg shadow-lg z-10 p-2 space-y-1">
                          <button className="block w-full text-left text-red-400 hover:text-red-300 px-2 py-1" onClick={() => {setPendingMeal(prev => prev ? prev.filter((_, idx) => idx !== index) : null); setOpenMenuId(null);}}>Remove</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full">
                    <input
                      value={item.portion.split(' ')[0] || ''}
                      onChange={(e) => {
                        let amount = e.target.value.replace(/[^0-9.]/g, '');
                        if (amount.includes('.')) {
                          const [integer, decimal] = amount.split('.');
                          amount = `${integer}.${decimal.slice(0, 1)}`;
                        }
                        setPendingMeal(prev => prev ? prev.map((i, idx) => idx === index ? {...i, portion: `${amount} ${i.portion.split(' ')[1] || 'g'}`} : i) : null);
                      }}
                      className="flex-1 p-2 rounded-lg bg-[#151a1e] border border-neutral-600 text-white text-sm"
                      placeholder="Amt"
                    />
                    <select
                      value={item.portion.split(' ')[1] || 'g'}
                      onChange={(e) => setPendingMeal(prev => prev ? prev.map((i, idx) => idx === index ? {...i, portion: `${i.portion.split(' ')[0] || '1'} ${e.target.value}`} : i) : null)}
                      className="p-2 rounded-lg bg-[#151a1e] border border-neutral-600 text-white text-sm w-20"
                    >
                      <option value="g">g</option>
                      <option value="oz">oz</option>
                      <option value="ml">ml</option>
                      <option value="cup">cup</option>
                      <option value="pcs">pcs</option>
                    </select>
                  </div>
                </div>
              ))}
              <button 
                className="w-full bg-neutral-700 text-white py-2 rounded-full font-medium hover:bg-neutral-600 transition text-sm"
                onClick={() => setPendingMeal(prev => prev ? [...prev, {id: Date.now().toString(), name: 'New Item', portion: '1 g', calories: 0, protein: 0, carbs: 0, fat: 0}] : null)}
              >
                Add Item
              </button>
              <button 
                className="w-full bg-[var(--color-accent)] text-white py-3 rounded-full font-medium hover:bg-[#d66e20] transition"
                onClick={() => {
                  const totalMacros = normalizeAiMacros(
                    pendingMeal.reduce(
                      (acc, item) => ({
                        calories: acc.calories + item.calories,
                        protein: acc.protein + item.protein,
                        carbs: acc.carbs + item.carbs,
                        fat: acc.fat + item.fat,
                      }),
                      {calories: 0, protein: 0, carbs: 0, fat: 0},
                    ),
                  );
                  const mealName = pendingMeal.map(i => i.name).join(', ');
                  addMeal(mealName, totalMacros);
                  setPendingMeal(null);
                }}
              >
                Add to Log
              </button>
              <button 
                className="w-full text-neutral-400 py-2 rounded-full font-medium hover:text-white transition text-sm"
                onClick={() => setPendingMeal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {isGoalsModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 [&::-webkit-scrollbar]:hidden">
          <div className="bg-[var(--color-card-dark)] p-6 rounded-2xl shadow-lg w-full max-w-md border border-neutral-700 [&::-webkit-scrollbar]:hidden">
            <h2 className="text-lg font-semibold mb-4 text-white">Set Macro Goals</h2>
            <div className="space-y-4 [&::-webkit-scrollbar]:hidden">
              <div className="bg-[#1e2327] p-4 rounded-xl border border-neutral-600">
                <h3 className="text-sm font-semibold text-white mb-2">AI Goal Setting</h3>
                {goalsAiLoading ? (
                  <div className="flex min-h-[7.5rem] flex-col items-center justify-center gap-3 rounded-xl bg-[#151a1e] border border-neutral-600">
                    <Loader2 className="h-10 w-10 text-[var(--color-accent)] animate-spin" aria-hidden />
                    <span className="text-sm text-[var(--color-text-light)]">Generating goals…</span>
                  </div>
                ) : (
                  <>
                    <textarea 
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g., I want to lose weight, I am 180lbs and 6ft tall."
                      className="w-full p-3 rounded-xl bg-[#151a1e] border border-neutral-600 text-white mb-2"
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
                          toast.error("Error generating goals");
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
                  <label className="capitalize w-24 text-[var(--color-text-light)]">{key}</label>
                  <input 
                    type="number" 
                    value={goals[key as keyof typeof goals]}
                    onChange={(e) => setGoals(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                    className="flex-1 p-3 rounded-xl bg-[#1e2327] border border-neutral-600 focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-white"
                  />
                </div>
              ))}
              <button 
                className="w-full bg-[var(--color-accent)] text-white py-3 rounded-full font-medium hover:bg-[#d66e20] transition"
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
