/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent, useEffect, useMemo } from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {
  Camera,
  ClipboardList,
  Loader2,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  X,
  CalendarDays,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Target,
  Scale,
  Plus,
  Sparkles,
  User,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { COMMON_MEALS, SNACK_INGREDIENTS } from './constants';
import toast, { Toaster } from 'react-hot-toast';
import {
  promptAggregateMacrosFromDescription,
  promptAggregateMacrosFromImage,
  promptDailyMacroGoals,
  promptMealItemsFromDescription,
  promptMealItemsFromImage,
  promptSnackFromIngredients,
} from './aiPrompts';
import {AiChatScreen} from './AiChatScreen.tsx';
import {CalorieGoalModePill} from './CalorieGoalModePill.tsx';
import {recentDailyTotalsFromLog} from './aiCoachContext';
import { generateContentJson } from './geminiBridge';
import {useAuth} from './auth/AuthContext.tsx';
import {MacroCloudSyncProvider} from './macroData/MacroCloudSyncContext.tsx';
import {useMacroCloudSync} from './macroData/useMacroCloudSync.ts';
import type {CalorieGoalMode} from './macroData/macroTypes.ts';
import {filterTodayMealHistory} from './macroData/mealHistory.ts';
import {
  calorieGoalModeLabel,
  MACRO_RING_COLORS,
  macroDayIndicator,
  macroGoalFieldLabel,
  macroGoalMet,
  macroGoalMetLegendLabel,
  macroGoalUnmetLegendLabel,
  macroIndicatorChevron,
  macroRingColor,
  normalizeCalorieGoalMode,
  type MacroKey,
} from './macroProgress.ts';
import {MacroSyncConflictModal} from './macroData/MacroSyncConflictModal.tsx';
import {SettingsModal} from './SettingsModal.tsx';
import {SettingsMenu} from './SettingsMenu.tsx';
import {LabeledActionButton} from './DropdownActionButton.tsx';
import {ProfileModal} from './social/SocialModal.tsx';
import {SocialOverviewSection} from './social/SocialOverviewSection.tsx';
import {profileAiSnapshot} from './social/profileAiContext.ts';
import {useApplyProfileBodyWeight} from './social/useApplyProfileBodyWeight.ts';
import {resolveProfileWeightUnit} from './social/profileBody.ts';
import {ProfileUnitSelect} from './social/ProfileUnitSelect.tsx';
import type {ProfileWeightUnit} from './social/socialTypes.ts';
import {useSocial} from './social/SocialContext.tsx';
import {usePublishCalorieStreak} from './social/usePublishCalorieStreak.ts';
import {
  ceilToOneDecimal,
  formatMacroAmount,
  normalizeAiMacros,
  parseGoalIntInput,
  parseMacroAmountInput,
  sanitizeMacroAmountRaw,
} from './macroUtils';

const MACRO_ORDER = ['calories', 'protein', 'carbs', 'fat'] as const;
type ManualMacroKey = (typeof MACRO_ORDER)[number];

const MANUAL_MACRO_LABELS: Record<ManualMacroKey, string> = {
  calories: 'Calories',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
};

const MANUAL_MACRO_UNITS: Record<ManualMacroKey, string> = {
  calories: 'kcal',
  protein: 'g',
  carbs: 'g',
  fat: 'g',
};

const WEIGHT_UNIT_OPTIONS: {value: ProfileWeightUnit; label: string}[] = [
  {value: 'lb', label: 'lb'},
  {value: 'kg', label: 'kg'},
];

function MacroInputGrid({
  idPrefix,
  valueForKey,
  onChange,
  onFocus,
  onBlur,
}: {
  idPrefix: string;
  valueForKey: (key: ManualMacroKey) => string;
  onChange: (key: ManualMacroKey, raw: string) => void;
  onFocus?: (key: ManualMacroKey) => void;
  onBlur?: (key: ManualMacroKey) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {MACRO_ORDER.map((key) => (
        <div key={key}>
          <label
            htmlFor={`${idPrefix}-${key}`}
            className="mb-1 block text-xs font-medium text-[var(--color-text-light)]"
          >
            {MANUAL_MACRO_LABELS[key]}
          </label>
          <div className="flex items-center rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-surface)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]">
            <input
              id={`${idPrefix}-${key}`}
              name={`${idPrefix}_${key}`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={valueForKey(key)}
              onFocus={() => onFocus?.(key)}
              onBlur={() => onBlur?.(key)}
              onChange={(e) => onChange(key, e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-sm tabular-nums text-fg outline-none"
            />
            <span className="shrink-0 pr-2.5 text-xs text-[var(--color-text-light)]">
              {MANUAL_MACRO_UNITS[key]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MacroGoalLegend({
  className,
  macroKey,
  calorieGoalMode,
}: {
  className?: string;
  macroKey?: MacroKey;
  calorieGoalMode?: CalorieGoalMode;
}) {
  const metColor = macroKey ? MACRO_RING_COLORS[macroKey] : undefined;
  const metChevron =
    macroKey && calorieGoalMode
      ? macroIndicatorChevron(macroKey, calorieGoalMode, 'met')
      : 'up';
  const unmetChevron =
    macroKey && calorieGoalMode
      ? macroIndicatorChevron(macroKey, calorieGoalMode, 'unmet')
      : 'down';
  const MetIcon = metChevron === 'up' ? ChevronUp : ChevronDown;
  const UnmetIcon = unmetChevron === 'up' ? ChevronUp : ChevronDown;
  const metLabel =
    macroKey && calorieGoalMode
      ? macroGoalMetLegendLabel(macroKey, calorieGoalMode)
      : 'Met goal (macro color)';
  const unmetLabel =
    macroKey && calorieGoalMode
      ? macroGoalUnmetLegendLabel(macroKey, calorieGoalMode)
      : 'Did not meet goal';

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-light)] ${className ?? ''}`}
    >
      <span className="flex items-center gap-1">
        <MetIcon
          className="h-3.5 w-3.5 shrink-0"
          style={metColor ? {color: metColor} : {color: 'var(--color-accent)'}}
          strokeWidth={3}
          aria-hidden
        />
        {metLabel}
      </span>
      <span className="flex items-center gap-1">
        <UnmetIcon className="h-3.5 w-3.5 shrink-0 text-white" strokeWidth={3} aria-hidden />
        {unmetLabel}
      </span>
    </div>
  );
}

function MacroProgressWheel({
  macroKey,
  current,
  goal,
  calorieGoalMode,
}: {
  macroKey: MacroKey;
  current: number;
  goal: number;
  calorieGoalMode: CalorieGoalMode;
}) {
  const safeGoal = goal > 0 ? goal : 1;
  const ratio = current / safeGoal;
  const displayPct = Math.round(ratio * 100);
  const arcRatio = Math.min(1, ratio);
  const size = 100;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - arcRatio);
  const ringColor = macroRingColor(macroKey, current, goal, calorieGoalMode);
  const met = macroGoalMet(macroKey, current, goal, calorieGoalMode);
  const label = macroGoalFieldLabel(macroKey);
  const statusText = met ? 'goal met' : 'goal not met';

  return (
    <div
      className="relative mx-auto flex h-[5.25rem] w-[5.25rem] shrink-0 items-center justify-center sm:h-[5.75rem] sm:w-[5.75rem]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(100, displayPct)}
      aria-valuetext={`${displayPct}% of ${label}, ${statusText}`}
      aria-label={`${label} progress`}
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
          className="stroke-[var(--color-text-light)]/30"
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
        <span className="block text-lg font-bold tabular-nums text-fg sm:text-xl">
          {displayPct}%
        </span>
      </span>
    </div>
  );
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function MacroCalendar({
  dailyLog,
  todayMacros,
  goals,
  calorieGoalMode,
  onClose,
}: {
  dailyLog: Record<string, MacroTotals>;
  todayMacros: MacroTotals;
  goals: MacroTotals;
  calorieGoalMode: CalorieGoalMode;
  onClose: () => void;
}) {
  const [selectedMacro, setSelectedMacro] = useState<MacroKey>('calories');
  const todayDate = new Date();
  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());

  const todayKey = getTodayKey();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };
  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  const getDayData = (day: number): {status: 'met' | 'unmet'; total: number} | null => {
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let entry: MacroTotals | undefined;
    if (key === todayKey) {
      entry = todayMacros;
    } else {
      entry = dailyLog[key];
    }
    if (!entry) return null;
    const total = entry[selectedMacro];
    if (total <= 0) return null;
    const goal = goals[selectedMacro];
    const status = macroDayIndicator(selectedMacro, total, goal, calorieGoalMode);
    if (!status) return null;
    return {status, total};
  };

  const isToday = (day: number) => {
    return viewYear === todayDate.getFullYear()
      && viewMonth === todayDate.getMonth()
      && day === todayDate.getDate();
  };

  const macroColor = MACRO_RING_COLORS[selectedMacro];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="glass w-full max-w-md rounded-2xl border border-[var(--color-accent)]/10 p-5 shadow-lg accent-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg brand-font">Monthly Calendar</h2>
          <button
            type="button"
            className="rounded-full p-1.5 text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg"
            onClick={onClose}
            aria-label="Close calendar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex gap-1 rounded-full bg-[var(--color-surface)] p-1">
          {MACRO_ORDER.map((key) => (
            <button
              key={key}
              className={`flex-1 rounded-full py-1.5 text-xs font-medium capitalize transition ${selectedMacro === key ? 'text-white shadow-sm' : 'text-[var(--color-text-light)] hover:text-fg'}`}
              style={selectedMacro === key ? { backgroundColor: MACRO_RING_COLORS[key] } : undefined}
              onClick={() => setSelectedMacro(key)}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            className="rounded-lg p-1.5 text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg"
            onClick={goToPrevMonth}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-fg">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            className="rounded-lg p-1.5 text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg"
            onClick={goToNextMonth}
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px text-center text-xs">
          {DAY_LABELS.map((d) => (
            <div key={d} className="py-1.5 font-semibold text-[var(--color-text-light)]">
              {d}
            </div>
          ))}

          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayData = getDayData(day);
            const today = isToday(day);
            const goal = goals[selectedMacro];
            const metChevron =
              dayData?.status === 'met'
                ? macroIndicatorChevron(selectedMacro, calorieGoalMode, 'met', dayData.total, goal)
                : null;
            const unmetChevron =
              dayData?.status === 'unmet'
                ? macroIndicatorChevron(
                    selectedMacro,
                    calorieGoalMode,
                    'unmet',
                    dayData.total,
                    goal,
                  )
                : null;
            const MetIcon = metChevron === 'down' ? ChevronDown : ChevronUp;
            const UnmetIcon = unmetChevron === 'down' ? ChevronDown : ChevronUp;
            return (
              <div
                key={day}
                className="flex flex-col items-center justify-center rounded-lg py-1.5 transition"
                style={today ? { boxShadow: `0 0 0 2px var(--color-bg-dark), 0 0 0 4px ${macroColor}`, borderRadius: '0.5rem' } : undefined}
              >
                <span className={`text-xs tabular-nums ${today ? 'font-bold text-fg' : 'text-[var(--color-text-light)]'}`}>
                  {day}
                </span>
                {dayData?.status === 'met' && (
                  <MetIcon className="h-4 w-4" style={{color: macroColor}} strokeWidth={3} />
                )}
                {dayData?.status === 'unmet' && (
                  <UnmetIcon className="h-4 w-4 text-white" strokeWidth={3} />
                )}
                {!dayData && <div className="h-4 w-4" />}
              </div>
            );
          })}
        </div>

        <MacroGoalLegend
          className="mt-4"
          macroKey={selectedMacro}
          calorieGoalMode={calorieGoalMode}
        />
      </div>
    </div>
  );
}

function sortDateKeysAsc(keys: string[]): string[] {
  return [...keys].sort((a, b) => a.localeCompare(b));
}

function getLatestWeight(weightLog: Record<string, number>): number | null {
  const keys = Object.keys(weightLog).filter((k) => Number.isFinite(weightLog[k]) && weightLog[k] > 0);
  if (keys.length === 0) return null;
  const lastKey = sortDateKeysAsc(keys)[keys.length - 1]!;
  return weightLog[lastKey] ?? null;
}

function buildWeightChartData(weightLog: Record<string, number>) {
  const keys = sortDateKeysAsc(
    Object.keys(weightLog).filter((k) => Number.isFinite(weightLog[k]) && weightLog[k] > 0),
  );
  return keys.map((key) => {
    const [y, m, d] = key.split('-').map((n) => parseInt(n, 10));
    const label =
      Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)
        ? `${m}/${d}`
        : key;
    return { key, label, weight: ceilToOneDecimal(weightLog[key]!) };
  });
}

function parseOptionalAiWeightLb(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n) || n <= 0) return null;
  return ceilToOneDecimal(n);
}

type WeightUnit = 'lb' | 'kg';

const LB_PER_KG = 2.2046226218;

function weightFromLb(lb: number, unit: WeightUnit): number {
  return unit === 'lb' ? ceilToOneDecimal(lb) : ceilToOneDecimal(lb / LB_PER_KG);
}

function weightToLb(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? ceilToOneDecimal(value) : ceilToOneDecimal(value * LB_PER_KG);
}

function WeightSection({
  weightLog,
  weightGoal,
  onLogWeight,
  weightUnit,
  onWeightUnitChange,
}: {
  weightLog: Record<string, number>;
  weightGoal: number;
  onLogWeight: (weight: number) => void;
  weightUnit: WeightUnit;
  onWeightUnitChange: (unit: WeightUnit) => void;
}) {
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logDraft, setLogDraft] = useState('');

  useEffect(() => {
    localStorage.setItem('weightUnit', weightUnit);
  }, [weightUnit]);

  const latest = getLatestWeight(weightLog);
  const chartData = buildWeightChartData(weightLog);
  const displayChartData = chartData.map((p) => ({
    ...p,
    weight: weightFromLb(p.weight, weightUnit),
  }));

  const weights = displayChartData.map((p) => p.weight);
  const goalForDomain =
    weightGoal > 0 ? weightFromLb(ceilToOneDecimal(weightGoal), weightUnit) : null;
  const minData = weights.length ? Math.min(...weights) : null;
  const maxData = weights.length ? Math.max(...weights) : null;
  let yDomain: [number, number] | undefined;
  if (minData !== null && maxData !== null) {
    const candidates = goalForDomain != null ? [minData, maxData, goalForDomain] : [minData, maxData];
    const lo = Math.min(...candidates);
    const hi = Math.max(...candidates);
    const span = hi - lo;
    const pad = span > 0 ? Math.max(0.5, span * 0.08) : 1;
    yDomain = [lo - pad, hi + pad];
  }

  const handleLog = () => {
    const entered = parseMacroAmountInput(logDraft);
    if (!(entered > 0)) {
      toast.error('Enter a weight greater than zero.');
      return;
    }
    onLogWeight(weightToLb(entered, weightUnit));
    setLogDraft('');
    toast.success('Weight logged');
    setLogModalOpen(false);
  };

  const toggleWeightUnit = () => {
    const next: WeightUnit = weightUnit === 'lb' ? 'kg' : 'lb';
    if (logDraft) {
      const val = parseMacroAmountInput(logDraft);
      if (val > 0) {
        setLogDraft(String(weightFromLb(weightToLb(val, weightUnit), next)));
      }
    }
    onWeightUnitChange(next);
  };

  useEffect(() => {
    if (!logModalOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [logModalOpen]);

  return (
    <>
      <section className="glass rounded-2xl border border-[var(--color-accent)]/10 p-4 shadow-lg accent-glow">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex min-w-0 flex-1 items-center gap-2 text-lg font-semibold text-fg brand-font">
            <Scale className="h-5 w-5 shrink-0 text-[var(--color-accent)]" aria-hidden />
            Weight
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="w-fit shrink-0 rounded-lg text-right tabular-nums text-fg transition hover:text-[var(--color-accent)] active:opacity-80"
              onClick={toggleWeightUnit}
              aria-label={
                latest != null
                  ? `Most recent weight ${formatMacroAmount(weightFromLb(latest, weightUnit))} ${weightUnit}. Tap to show ${weightUnit === 'lb' ? 'kilograms' : 'pounds'}.`
                  : `No weight logged. Tap to show ${weightUnit === 'lb' ? 'kilograms' : 'pounds'}.`
              }
            >
              <span className="text-lg font-bold">
                {latest != null ? formatMacroAmount(weightFromLb(latest, weightUnit)) : '—'}
              </span>
              <span className="text-xs font-medium"> {weightUnit}</span>
            </button>
            <button
              type="button"
              className="rounded-lg p-1.5 text-fg transition hover:bg-[var(--color-surface)]"
              onClick={() => setLogModalOpen(true)}
              aria-label="Log weight"
            >
              <Plus className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div>
          {displayChartData.length === 0 ? (
            <p className="rounded-xl border border-[var(--color-accent)]/10 bg-[var(--color-bg-dark)] py-6 text-center text-sm text-[var(--color-text-light)]">
              Log weight on one or more days to see the chart. Use the log button above to add an entry.
            </p>
          ) : (
            <div className="h-44 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-accent)" strokeOpacity={0.12} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--color-text-light)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--color-accent)', strokeOpacity: 0.2 }}
                  />
                  <YAxis
                    domain={yDomain ?? ['auto', 'auto']}
                    width={44}
                    tick={{ fill: 'var(--color-text-light)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--color-accent)', strokeOpacity: 0.2 }}
                    tickFormatter={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(1))}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface-deep)',
                      border: '1px solid rgba(148, 163, 184, 0.22)',
                      borderRadius: '0.75rem',
                    }}
                    labelFormatter={(_label, payload) => {
                      const p = payload?.[0]?.payload as { key?: string } | undefined;
                      return p?.key ? p.key : '';
                    }}
                    formatter={(value: number) => [
                      `${formatMacroAmount(value)} ${weightUnit}`,
                      'Weight',
                    ]}
                  />
                  {goalForDomain != null && (
                    <ReferenceLine
                      y={goalForDomain}
                      stroke="#34d399"
                      strokeDasharray="5 5"
                      label={{ value: 'Goal', fill: 'var(--color-text-light)', fontSize: 11 }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'var(--color-accent)' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {logModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 [&::-webkit-scrollbar]:hidden"
          onClick={() => setLogModalOpen(false)}
        >
          <div
            className="glass w-full max-w-md rounded-2xl border border-[var(--color-accent)]/10 p-6 shadow-lg accent-glow [&::-webkit-scrollbar]:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-fg brand-font">Log weight</h2>
              <button
                type="button"
                className="rounded-full p-1.5 text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg"
                onClick={() => setLogModalOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="weight-log-input-modal" className="text-xs font-medium text-[var(--color-text-light)]">
                  Today&apos;s weight ({weightUnit})
                </label>
                <input
                  id="weight-log-input-modal"
                  name="weight_log_modal"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={weightUnit === 'lb' ? 'e.g. 175.4' : 'e.g. 79.5'}
                  value={logDraft}
                  onChange={(e) => setLogDraft(sanitizeMacroAmountRaw(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLog();
                  }}
                  className="mt-1 box-border w-full rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface)] px-3 py-2.5 text-sm text-fg placeholder:text-[var(--color-text-light)] focus:border-transparent focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>
              <button
                type="button"
                className="w-full rounded-full bg-[var(--color-accent)] py-3 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)]"
                onClick={handleLog}
              >
                Log weight
              </button>
              <button
                type="button"
                className="w-full rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-surface)] py-3 text-sm font-medium text-fg transition hover:bg-[var(--color-panel-hover)]"
                onClick={() => setLogModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
      .map((i: Record<string, unknown>) => String(i.name ?? '').trim())
      .filter(Boolean)
      .join(', ') || 'AI meal';
  return {mealName, macros};
}

type MacroTotals = { calories: number; protein: number; carbs: number; fat: number };
type TotalsView = 'daily' | 'weekly' | 'monthly';

const TOTALS_VIEWS: TotalsView[] = ['daily', 'weekly', 'monthly'];

function totalsViewLabel(view: TotalsView): string {
  return view === 'daily' ? 'Daily' : view === 'weekly' ? 'Weekly' : 'Monthly';
}

function nextTotalsView(view: TotalsView): TotalsView {
  const i = TOTALS_VIEWS.indexOf(view);
  return TOTALS_VIEWS[(i + 1) % TOTALS_VIEWS.length]!;
}

const ZERO_MACROS: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getTodayKey() {
  return toLocalDateKey(new Date());
}

function sumMacros(entries: MacroTotals[]): MacroTotals {
  return entries.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { ...ZERO_MACROS },
  );
}

function getPeriodTotals(
  dailyLog: Record<string, MacroTotals>,
  todayMacros: MacroTotals,
  view: TotalsView,
): MacroTotals {
  if (view === 'daily') return todayMacros;
  const days = view === 'weekly' ? 7 : 30;
  const today = new Date();
  const todayKey = getTodayKey();
  const entries: MacroTotals[] = [];
  for (let i = 1; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toLocalDateKey(d);
    if (dailyLog[key]) entries.push(dailyLog[key]);
  }
  if (dailyLog[todayKey]) {
    entries.push(dailyLog[todayKey]);
  }
  entries.push(todayMacros);
  return sumMacros(entries);
}

function getPeriodGoals(dailyGoals: MacroTotals, view: TotalsView): MacroTotals {
  const multiplier = view === 'daily' ? 1 : view === 'weekly' ? 7 : 30;
  return {
    calories: dailyGoals.calories * multiplier,
    protein: dailyGoals.protein * multiplier,
    carbs: dailyGoals.carbs * multiplier,
    fat: dailyGoals.fat * multiplier,
  };
}

const STORAGE_SOCIAL_ON_OVERVIEW = 'macrocounter_social_on_overview_v1';
const STORAGE_SHOW_WEIGHT = 'macrocounter_show_weight_v1';

function loadShowSocialOnOverview(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_SOCIAL_ON_OVERVIEW);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

function saveShowSocialOnOverview(show: boolean) {
  try {
    localStorage.setItem(STORAGE_SOCIAL_ON_OVERVIEW, String(show));
  } catch {
    /* ignore */
  }
}

function loadShowWeightSection(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_SHOW_WEIGHT);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

function saveShowWeightSection(show: boolean) {
  try {
    localStorage.setItem(STORAGE_SHOW_WEIGHT, String(show));
  } catch {
    /* ignore */
  }
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const {user, loading: authLoading} = useAuth();
  const {
    enabled: socialEnabled,
    profile: socialProfile,
    saveBodyWeightLb,
    saveWeightUnit,
  } = useSocial();
  const [guestWeightUnit, setGuestWeightUnit] = useState<WeightUnit>(() => {
    const saved = localStorage.getItem('weightUnit');
    return saved === 'kg' ? 'kg' : 'lb';
  });
  const profileWeightUnit = (
    socialEnabled ? resolveProfileWeightUnit(socialProfile?.weightUnit) : guestWeightUnit
  ) as WeightUnit;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTermsOpen, setSettingsTermsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'profile' | 'social'>('profile');
  const [coachOpen, setCoachOpen] = useState(false);
  const [showSocialOnOverview, setShowSocialOnOverview] = useState(loadShowSocialOnOverview);
  const [showWeightSection, setShowWeightSection] = useState(loadShowWeightSection);

  const [macros, setMacros] = useState(() => {
    const saved = localStorage.getItem('macros');
    return saved ? JSON.parse(saved) : { calories: 0, protein: 0, carbs: 0, fat: 0 };
  });
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem('goals');
    return saved ? JSON.parse(saved) : { calories: 2000, protein: 150, carbs: 200, fat: 70 };
  });
  const [totalsView, setTotalsView] = useState<TotalsView>('daily');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dailyLog, setDailyLog] = useState<Record<string, MacroTotals>>(() => {
    const saved = localStorage.getItem('dailyLog');
    return saved ? JSON.parse(saved) : {};
  });
  const [weightGoal, setWeightGoal] = useState(() => {
    const saved = localStorage.getItem('weightGoal');
    if (!saved) return 0;
    const n = parseFloat(saved);
    return Number.isFinite(n) ? n : 0;
  });
  const [calorieGoalMode, setCalorieGoalMode] = useState<CalorieGoalMode>(() =>
    normalizeCalorieGoalMode(localStorage.getItem('calorieGoalMode')),
  );
  const [weightLog, setWeightLog] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('weightLog');
    if (!saved) return {};
    try {
      const parsed = JSON.parse(saved) as Record<string, unknown>;
      const next: Record<string, number> = {};
      for (const [k, v] of Object.entries(parsed)) {
        const num = typeof v === 'number' ? v : parseFloat(String(v));
        if (Number.isFinite(num) && num > 0) next[k] = ceilToOneDecimal(num);
      }
      return next;
    } catch {
      return {};
    }
  });
  const markLocalProfileWeightPush = useApplyProfileBodyWeight(
    socialEnabled,
    user?.uid,
    socialProfile,
    getTodayKey,
    setWeightLog,
  );
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [goalsModalBaseline, setGoalsModalBaseline] = useState<{
    goals: typeof goals;
    weightGoal: number;
    calorieGoalMode: CalorieGoalMode;
  } | null>(null);
  /** Raw text while editing weight goal in Set goals modal (decimals like "165.") */
  const [weightGoalFieldDraft, setWeightGoalFieldDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [goalsAiLoading, setGoalsAiLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [describeOpen, setDescribeOpen] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [aiReview, setAiReview] = useState<{
    mealName: string;
    macros: typeof manualMacros;
    source: 'image' | 'text';
  } | null>(null);
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
    const parsed = saved ? JSON.parse(saved) : [];
    return filterTodayMealHistory(parsed);
  });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editMealName, setEditMealName] = useState('');
  const [editMealMacros, setEditMealMacros] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [editingFavoriteIndex, setEditingFavoriteIndex] = useState<number | null>(null);
  const [editFavoriteName, setEditFavoriteName] = useState('');
  const [editFavoriteMacros, setEditFavoriteMacros] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'manual' | 'ai' | 'picture'>('manual');
  const [aiPrompt, setAiPrompt] = useState('');
  const [addMealChooserOpen, setAddMealChooserOpen] = useState(false);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackIngredients, setSnackIngredients] = useState<string[]>([]);
  const [snackLoading, setSnackLoading] = useState(false);
  const [snackResult, setSnackResult] = useState<{
    name: string;
    ingredientsUsed: { name: string; amount: string }[];
    instructions: string;
    macros: typeof manualMacros;
    notes: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [lastUpdatedDate, setLastUpdatedDate] = useState(() => {
    return localStorage.getItem('lastUpdatedDate') ?? new Date().toDateString();
  });

  const {
    cloudEnabled,
    syncing: cloudSyncing,
    syncConflict,
    resolvingConflict,
    resolveSyncConflict,
  } = useMacroCloudSync({
    user,
    authLoading,
    macros,
    goals,
    dailyLog,
    weightGoal,
    calorieGoalMode,
    weightLog,
    favorites,
    history,
    lastUpdatedDate,
    setMacros,
    setGoals,
    setDailyLog,
    setWeightGoal,
    setCalorieGoalMode,
    setWeightLog,
    setFavorites,
    setHistory,
    setLastUpdatedDate,
  });

  usePublishCalorieStreak(user, dailyLog, goals.calories, macros);

  const aiCoachInputs = useMemo(
    () => ({
      goals,
      calorieGoalMode,
      todayTotals: macros,
      todayMeals: history.map((meal) => ({
        name: meal.name,
        loggedAt: Number.isFinite(Number(meal.id))
          ? new Date(Number(meal.id)).toLocaleString()
          : 'today',
        macros: meal.macros,
      })),
      recentDailyTotals: recentDailyTotalsFromLog(dailyLog, 7, getTodayKey()),
      profile: profileAiSnapshot(socialProfile),
    }),
    [goals, calorieGoalMode, macros, history, dailyLog, socialProfile],
  );

  useEffect(() => {
    if (!coachOpen && !syncConflict) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [coachOpen, syncConflict]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    let changed = false;
    if (params.get('legal') === 'open') {
      setSettingsOpen(true);
      setSettingsTermsOpen(true);
      params.delete('legal');
      changed = true;
    }
    if (params.get('open') === 'settings') {
      setSettingsOpen(true);
      params.delete('open');
      changed = true;
    }
    if (params.get('open') === 'profile' || params.get('open') === 'social') {
      setProfileInitialTab(params.get('open') === 'social' ? 'social' : 'profile');
      setProfileOpen(true);
      params.delete('open');
      changed = true;
    }
    if (changed) {
      const next = params.toString();
      navigate({pathname: '/', search: next ? `?${next}` : ''}, {replace: true});
    }
  }, [location.search, navigate]);

  useEffect(() => {
    const lastDate = lastUpdatedDate;
    const today = new Date().toDateString();

    if (lastDate !== today) {
      if (lastDate) {
        const prevDate = new Date(lastDate);
        const prevKey = toLocalDateKey(prevDate);
        const prevMacros = localStorage.getItem('macros');
        if (prevMacros) {
          setDailyLog((prev) => {
            const next = { ...prev, [prevKey]: JSON.parse(prevMacros) };
            localStorage.setItem('dailyLog', JSON.stringify(next));
            return next;
          });
        }
      }
      setMacros({ calories: 0, protein: 0, carbs: 0, fat: 0 });
      setHistory([]);
      setLastUpdatedDate(today);
      localStorage.setItem('lastUpdatedDate', today);
    }
  }, [lastUpdatedDate]);

  useEffect(() => {
    const todayOnly = filterTodayMealHistory(history);
    if (todayOnly.length !== history.length) {
      setHistory(todayOnly);
    }
  }, [history]);

  useEffect(() => {
    localStorage.setItem('macros', JSON.stringify(macros));
    localStorage.setItem('history', JSON.stringify(history));
    localStorage.setItem('goals', JSON.stringify(goals));
    localStorage.setItem('favorites', JSON.stringify(favorites));
    localStorage.setItem('dailyLog', JSON.stringify(dailyLog));
  }, [macros, history, goals, favorites, dailyLog]);

  useEffect(() => {
    localStorage.setItem('weightLog', JSON.stringify(weightLog));
    localStorage.setItem('weightGoal', JSON.stringify(weightGoal));
    localStorage.setItem('calorieGoalMode', calorieGoalMode);
  }, [weightLog, weightGoal, calorieGoalMode]);

  useEffect(() => {
    if (!syncConflict) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [syncConflict]);

  useEffect(() => {
    if (isGoalsModalOpen) {
      setGoalsModalBaseline({goals: {...goals}, weightGoal, calorieGoalMode});
      setWeightGoalFieldDraft(null);
    } else {
      setGoalsModalBaseline(null);
    }
  }, [isGoalsModalOpen]);

  const goalsModalDirty = useMemo(() => {
    if (!isGoalsModalOpen || !goalsModalBaseline) return false;
    return (
      goals.calories !== goalsModalBaseline.goals.calories ||
      goals.protein !== goalsModalBaseline.goals.protein ||
      goals.carbs !== goalsModalBaseline.goals.carbs ||
      goals.fat !== goalsModalBaseline.goals.fat ||
      weightGoal !== goalsModalBaseline.weightGoal ||
      calorieGoalMode !== goalsModalBaseline.calorieGoalMode
    );
  }, [isGoalsModalOpen, goalsModalBaseline, goals, weightGoal, calorieGoalMode]);

  const saveGoalsModal = () => {
    setGoalsModalBaseline({goals: {...goals}, weightGoal, calorieGoalMode});
    toast.success('Daily goals saved');
  };

  const closeGoalsModal = () => {
    if (goalsModalBaseline) {
      setGoals({...goalsModalBaseline.goals});
      setWeightGoal(goalsModalBaseline.weightGoal);
      setCalorieGoalMode(goalsModalBaseline.calorieGoalMode);
    }
    setWeightGoalFieldDraft(null);
    setIsGoalsModalOpen(false);
  };

  useEffect(() => {
    saveShowSocialOnOverview(showSocialOnOverview);
  }, [showSocialOnOverview]);

  useEffect(() => {
    saveShowWeightSection(showWeightSection);
  }, [showWeightSection]);

  useEffect(() => {
    if (
      isGoalsModalOpen ||
      isModalOpen ||
      editingMealId ||
      editingFavoriteIndex !== null ||
      calendarOpen ||
      describeOpen ||
      manualEntryOpen ||
      aiReview ||
      addMealChooserOpen ||
      snackOpen
    ) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [
    isGoalsModalOpen,
    isModalOpen,
    editingMealId,
    editingFavoriteIndex,
    calendarOpen,
    describeOpen,
    manualEntryOpen,
    aiReview,
    addMealChooserOpen,
    snackOpen,
  ]);

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

  const startEditMeal = (meal: {id: string; name: string; macros: typeof manualMacros}) => {
    setEditingMealId(meal.id);
    setEditMealName(meal.name);
    setEditMealMacros({ ...meal.macros });
    setOpenMenuId(null);
  };

  const handleEditMealMacroChange = (key: keyof typeof manualMacros, raw: string) => {
    const sanitized = sanitizeMacroAmountRaw(raw);
    setEditMealMacros((prev) => ({ ...prev, [key]: parseMacroAmountInput(sanitized) }));
  };

  const saveEditedMeal = () => {
    if (!editingMealId) return;
    const previousMeal = history.find((meal) => meal.id === editingMealId);
    if (!previousMeal) return;
    setHistory((prev) =>
      prev.map((meal) =>
        meal.id === editingMealId
          ? {
              ...meal,
              name: editMealName.trim() || 'Meal',
              macros: { ...editMealMacros },
            }
          : meal,
      ),
    );
    setMacros((prev) => ({
      calories: prev.calories - previousMeal.macros.calories + editMealMacros.calories,
      protein: prev.protein - previousMeal.macros.protein + editMealMacros.protein,
      carbs: prev.carbs - previousMeal.macros.carbs + editMealMacros.carbs,
      fat: prev.fat - previousMeal.macros.fat + editMealMacros.fat,
    }));
    setEditingMealId(null);
    toast.success('Meal updated');
  };

  const startEditFavorite = (index: number) => {
    const favorite = favorites[index];
    if (!favorite) return;
    setEditingFavoriteIndex(index);
    setEditFavoriteName(favorite.name);
    setEditFavoriteMacros({ ...favorite.macros });
    setOpenMenuId(null);
  };

  const handleEditFavoriteMacroChange = (key: keyof typeof manualMacros, raw: string) => {
    const sanitized = sanitizeMacroAmountRaw(raw);
    setEditFavoriteMacros((prev) => ({ ...prev, [key]: parseMacroAmountInput(sanitized) }));
  };

  const saveEditedFavorite = () => {
    if (editingFavoriteIndex === null) return;
    setFavorites((prev) =>
      prev.map((favorite, index) =>
        index === editingFavoriteIndex
          ? {
              name: editFavoriteName.trim() || 'Favorite',
              macros: { ...editFavoriteMacros },
            }
          : favorite,
      ),
    );
    setEditingFavoriteIndex(null);
    toast.success('Favorite updated');
  };

  const toggleSnackIngredient = (name: string) => {
    setSnackIngredients((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const openSnackHelper = () => {
    setSnackResult(null);
    setSnackOpen(true);
  };

  const handleGenerateSnack = async () => {
    if (snackIngredients.length === 0) {
      toast.error('Pick at least one ingredient you have on hand.');
      return;
    }
    const remainingCalories = goals.calories - macros.calories;
    if (remainingCalories <= 0) {
      toast.error("You're already at or past your calorie goal for today.");
      return;
    }
    const remainingProtein = goals.protein - macros.protein;
    const remainingCarbs = goals.carbs - macros.carbs;
    const remainingFat = goals.fat - macros.fat;
    setSnackLoading(true);
    setSnackResult(null);
    try {
      const text = await generateContentJson({
        parts: [
          {
            text: promptSnackFromIngredients({
              availableIngredients: snackIngredients,
              remainingCalories,
              remainingProtein,
              remainingCarbs,
              remainingFat,
            }),
          },
        ],
      });
      const raw = JSON.parse(text) as {
        name?: unknown;
        ingredientsUsed?: unknown;
        instructions?: unknown;
        macros?: unknown;
        notes?: unknown;
      };
      const name = String(raw.name ?? '').trim();
      const macrosOut = normalizeAiMacros(
        (raw.macros as Partial<Record<keyof typeof manualMacros, unknown>>) ?? {},
      );
      const ingredientsUsed = Array.isArray(raw.ingredientsUsed)
        ? raw.ingredientsUsed
            .map((it) => {
              const obj = (it ?? {}) as { name?: unknown; amount?: unknown };
              return {
                name: String(obj.name ?? '').trim(),
                amount: String(obj.amount ?? '').trim(),
              };
            })
            .filter((it) => it.name)
        : [];
      const instructions = String(raw.instructions ?? '').trim();
      const notes = String(raw.notes ?? '').trim();
      if (!name || macrosOut.calories <= 0) {
        toast.error(
          notes ||
            "Couldn't put together a snack from those ingredients within your remaining calories.",
        );
        return;
      }
      if (macrosOut.calories > remainingCalories + 0.5) {
        toast.error('AI suggestion exceeded your remaining calories — try again or pick different ingredients.');
        return;
      }
      setSnackResult({ name, ingredientsUsed, instructions, macros: macrosOut, notes });
    } catch (error) {
      console.error('Error generating snack:', error);
      toastAiConfigError(error, 'Could not generate a snack suggestion.');
    } finally {
      setSnackLoading(false);
    }
  };

  const acceptSnack = () => {
    if (!snackResult) return;
    addMeal(snackResult.name, snackResult.macros);
    setSnackResult(null);
    setSnackOpen(false);
  };

  const handleTextAnalysis = async () => {
    if (!textDescription) return;
    setLoading(true);
    try {
      const text = await generateContentJson({
        parts: [
          {
            text: promptMealItemsFromDescription(textDescription),
          },
        ],
      });
      const result = JSON.parse(text);
      const summary = summarizeAiMealItems(result);
      if (!summary) {
        toast.error('No food items could be identified.');
        return;
      }
      setAiReview({
        mealName: summary.mealName,
        macros: summary.macros,
        source: 'text',
      });
      setDescribeOpen(false);
    } catch (error) {
      console.error("Error analyzing food description:", error);
      toastAiConfigError(error, "Could not analyze description.");
    } finally {
      setLoading(false);
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
              text: promptMealItemsFromImage(),
            },
          ],
        });

        const result = JSON.parse(text);
        const summary = summarizeAiMealItems(result);
        if (!summary) {
          toast.error('No food items could be identified.');
          return;
        }
        setAiReview({
          mealName: summary.mealName,
          macros: summary.macros,
          source: 'image',
        });
        setDescribeOpen(false);
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

  /** Opens the OS camera app on mobile (`capture`); file picker on desktop. */
  const openNativeCamera = () => {
    fileInputRef.current?.click();
  };

  const acceptAiReview = () => {
    if (!aiReview) return;
    addMeal(aiReview.mealName, aiReview.macros);
    setAiReview(null);
    setTextDescription('');
    setDescribeOpen(false);
  };

  const denyAiReview = () => {
    if (!aiReview) return;
    const src = aiReview.source;
    setAiReview(null);
    if (src === 'text') setDescribeOpen(true);
  };

  const retakeAiReview = () => {
    if (!aiReview) return;
    const src = aiReview.source;
    setAiReview(null);
    if (src === 'image') {
      openNativeCamera();
    } else {
      setDescribeOpen(true);
    }
  };

  const saveFavorite = (name: string, macros: typeof manualMacros) => {
    setFavorites([...favorites, {name, macros}]);
    setIsModalOpen(false);
    toast.success(`Added ${name} to favorites`);
  };

  return (
    <MacroCloudSyncProvider value={{cloudEnabled, syncing: cloudSyncing}}>
    <div className="min-h-screen bg-[var(--color-bg-dark)] text-fg font-sans blueprint-bg">
      <Toaster />
      {syncConflict ? (
        <MacroSyncConflictModal
          conflict={syncConflict}
          resolving={resolvingConflict}
          onChoose={resolveSyncConflict}
        />
      ) : null}
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
      <header className="mb-5 flex items-center justify-between gap-4 border-b border-[var(--color-accent)]/20 bg-[var(--color-chrome-bar)] px-4 py-4 shadow-md md:px-8">
        <h1 className="min-w-0 flex-1 text-2xl font-semibold leading-tight tracking-tight text-[var(--color-accent)] brand-font">
          Macro Counter
        </h1>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setCoachOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg"
            aria-label="Open AI Coach"
          >
            <MessageCircle className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => {
              setProfileInitialTab('profile');
              setProfileOpen(true);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg"
            aria-label="Open profile"
          >
            <User className="h-5 w-5" aria-hidden />
          </button>
          <SettingsMenu onOpen={() => setSettingsOpen(true)} />
        </div>
      </header>

      <main className="grid gap-6 px-4 pt-3 pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:px-8 md:pt-5">
        <section className="glass p-6 rounded-2xl border border-[var(--color-accent)]/10 shadow-lg accent-glow">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              type="button"
              className="w-fit shrink-0 rounded-lg text-xl font-semibold text-fg brand-font transition hover:text-[var(--color-accent)] active:opacity-80"
              onClick={() => setTotalsView((v) => nextTotalsView(v))}
              aria-label={`${totalsViewLabel(totalsView)} totals. Tap to switch to ${totalsViewLabel(nextTotalsView(totalsView))}.`}
            >
              {totalsViewLabel(totalsView)} Totals
            </button>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="rounded-lg p-1.5 text-fg transition hover:bg-[var(--color-surface)]"
                onClick={() => setCalendarOpen(true)}
                aria-label="Open monthly calendar"
              >
                <CalendarDays className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="rounded-lg p-1.5 text-fg transition hover:bg-[var(--color-surface)]"
                onClick={() => setIsGoalsModalOpen(true)}
                aria-label="Set daily goals (macros and weight goal)"
              >
                <Target className="h-5 w-5" />
              </button>
            </div>
          </div>
          {(() => {
            const periodMacros = getPeriodTotals(dailyLog, macros, totalsView);
            const periodGoals = getPeriodGoals(goals, totalsView);
            return (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                  {MACRO_ORDER.map((key) => {
                  const value = periodMacros[key];
                  const goal = periodGoals[key];
                  const unit = key === 'calories' ? 'kcal' : 'g';
                  return (
                    <div
                      key={key}
                      className="flex flex-col items-center gap-3 rounded-xl border border-[var(--color-accent)]/10 bg-[var(--color-bg-dark)] p-4 sm:p-5"
                    >
                      <MacroProgressWheel
                        macroKey={key}
                        current={value}
                        goal={goal}
                        calorieGoalMode={calorieGoalMode}
                      />
                      <div className="w-full min-w-0 text-center">
                        <p className="text-sm font-medium capitalize text-[var(--color-text-light)]">{key}</p>
                        <p className="mt-0.5 text-lg font-bold tabular-nums text-fg sm:text-xl">
                          {value.toFixed(0)}
                          <span className="font-normal text-[var(--color-text-light)]"> / {goal}</span>
                          <span className="text-sm font-normal text-[var(--color-text-light)] ml-0.5">{unit}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
                </div>
                <MacroGoalLegend className="mt-4" />
              </>
            );
          })()}
        </section>

        <section className="glass p-6 rounded-2xl border border-[var(--color-accent)]/10 shadow-lg accent-glow relative z-20">
          <h2 className="text-xl font-semibold mb-6 text-fg brand-font">Meal History</h2>
          <div className="space-y-2">
            {history.map((meal) => (
              <div key={meal.id} className="flex justify-between items-center rounded-xl border border-[var(--color-accent)]/10 bg-[var(--color-bg-dark)] p-4">
                <div>
                  <p className="font-bold text-fg">{meal.name}</p>
                  <p className="text-sm text-[var(--color-text-light)]">{formatMacroAmount(meal.macros.calories)} kcal, {formatMacroAmount(meal.macros.protein)}g P, {formatMacroAmount(meal.macros.carbs)}g C, {formatMacroAmount(meal.macros.fat)}g F</p>
                </div>
                <div className="relative">
                  <button onClick={() => setOpenMenuId(openMenuId === meal.id ? null : meal.id)}>
                    <MoreVertical className="text-fg" />
                  </button>
                  {openMenuId === meal.id && (
                    <div className="absolute right-0 mt-2 rounded-lg border border-[var(--color-accent)]/10 bg-[var(--color-surface-deep)] shadow-lg z-10 p-2 space-y-1">
                      <button className="block w-full text-left text-blue-300 hover:text-blue-200 px-2 py-1" onClick={() => startEditMeal(meal)}>Edit</button>
                      <button className="block w-full text-left text-blue-400 hover:text-blue-300 px-2 py-1" onClick={() => {setFavorites([...favorites, {name: meal.name, macros: meal.macros}]); setOpenMenuId(null); toast.success("Added to favorites");}}>Favorite</button>
                      <button className="block w-full text-left text-red-400 hover:text-red-300 px-2 py-1" onClick={() => {removeMeal(meal.id, meal.macros); setOpenMenuId(null)}}>Remove</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <LabeledActionButton
              icon={<Plus className="h-4 w-4 shrink-0" aria-hidden />}
              label="Add meal"
              onClick={() => setAddMealChooserOpen(true)}
              className="w-full"
            />
          </div>
        </section>

        {showSocialOnOverview ? (
          <SocialOverviewSection
            onOpenProfile={() => {
              setProfileInitialTab('social');
              setProfileOpen(true);
            }}
          />
        ) : null}

        {showWeightSection ? (
          <WeightSection
            weightLog={weightLog}
            weightGoal={weightGoal}
            weightUnit={profileWeightUnit}
            onWeightUnitChange={(unit) => {
              if (socialEnabled) {
                void saveWeightUnit(unit).catch((e) =>
                  console.error('Could not save weight unit', e),
                );
              } else {
                setGuestWeightUnit(unit);
              }
            }}
            onLogWeight={(w) => {
              markLocalProfileWeightPush(w);
              setWeightLog((prev) => ({...prev, [getTodayKey()]: w}));
              if (socialEnabled && user) {
                void saveBodyWeightLb(w).catch((e) => console.error('Could not sync weight to profile', e));
              }
            }}
          />
        ) : null}
      </main>

      <footer
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-accent)]/20 bg-[var(--color-chrome-bar)]/95 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] backdrop-blur-md supports-[backdrop-filter]:bg-[var(--color-chrome-bar)]/90"
        role="navigation"
        aria-label="Log a meal"
      >
        <div className="mx-auto flex max-w-lg items-end justify-between gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
          <button
            type="button"
            className="flex min-h-[3.5rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-transparent bg-[var(--color-surface)]/90 py-2 text-xs font-medium text-[var(--color-text-light)] transition hover:border-[var(--color-accent)]/25 hover:text-fg active:bg-[var(--color-panel-hover)]"
            onClick={() => setDescribeOpen(true)}
          >
            <MessageSquare className="h-6 w-6 shrink-0" aria-hidden />
            <span className="leading-tight">Describe</span>
          </button>
          <button
            type="button"
            className="relative -top-3 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/35 transition hover:bg-[var(--color-accent-hover)] active:scale-[0.98] disabled:opacity-60"
            onClick={() => openNativeCamera()}
            disabled={loading}
            aria-label="Take a photo of your meal"
          >
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            ) : (
              <Camera className="h-8 w-8" aria-hidden />
            )}
          </button>
          <button
            type="button"
            className="flex min-h-[3.5rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-transparent bg-[var(--color-surface)]/90 py-2 text-xs font-medium text-[var(--color-text-light)] transition hover:border-[var(--color-accent)]/25 hover:text-fg active:bg-[var(--color-panel-hover)]"
            onClick={() => setManualEntryOpen(true)}
          >
            <ClipboardList className="h-6 w-6 shrink-0" aria-hidden />
            <span className="leading-tight">Manual</span>
          </button>
        </div>
      </footer>

      {describeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 [&::-webkit-scrollbar]:hidden"
          onClick={() => {
            if (!loading) setDescribeOpen(false);
          }}
        >
          <div
            className="glass relative w-full max-w-md rounded-2xl border border-[var(--color-accent)]/10 p-6 shadow-lg accent-glow [&::-webkit-scrollbar]:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-fg brand-font">Describe your meal</h2>
                <p className="mt-1 text-sm text-[var(--color-text-light)]">
                  Tell the AI what you ate in plain language.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-1.5 text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg disabled:opacity-40"
                onClick={() => setDescribeOpen(false)}
                disabled={loading}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative space-y-3">
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[var(--color-bg-dark)]/70">
                  <Loader2 className="h-10 w-10 animate-spin text-[var(--color-accent)]" aria-hidden />
                </div>
              )}
              <label htmlFor="meal-description" className="sr-only">
                Meal description
              </label>
              <input
                id="meal-description"
                name="meal_description"
                type="text"
                enterKeyHint="send"
                autoComplete="off"
                placeholder="e.g. chicken salad, large"
                value={textDescription}
                onChange={(e) => setTextDescription(e.target.value)}
                disabled={loading}
                className="box-border w-full rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface)] px-3 py-3.5 text-base text-fg placeholder:text-[var(--color-text-light)] disabled:opacity-60"
              />
              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  className="flex h-12 w-10 shrink-0 items-center justify-center rounded-full text-[var(--color-text-light)] transition hover:bg-[var(--color-panel-hover)] hover:text-fg disabled:opacity-60"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={loading}
                  aria-label="Choose from photos"
                >
                  <Plus className="h-5 w-5" aria-hidden />
                </button>
                <button
                  type="button"
                  className="min-w-0 flex-1 rounded-xl bg-[var(--color-accent)] py-3.5 text-base font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
                  onClick={() => void handleTextAnalysis()}
                  disabled={loading || !textDescription.trim()}
                >
                  Analyze
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {manualEntryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 [&::-webkit-scrollbar]:hidden"
          onClick={() => setManualEntryOpen(false)}
        >
          <div
            className="glass max-h-[min(90vh,36rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--color-accent)]/10 p-6 shadow-lg accent-glow [&::-webkit-scrollbar]:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-fg brand-font">Manual entry</h2>
              <button
                type="button"
                className="rounded-full p-1.5 text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg"
                onClick={() => setManualEntryOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 rounded-full py-2 text-sm font-medium transition ${manualMode === 'favorites' ? 'bg-[var(--color-panel-hover)] text-fg' : 'bg-[var(--color-surface)] text-[var(--color-text-light)]'}`}
                  onClick={() => setManualMode('favorites')}
                >
                  Favorites
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-full py-2 text-sm font-medium transition ${manualMode === 'common' ? 'bg-[var(--color-panel-hover)] text-fg' : 'bg-[var(--color-surface)] text-[var(--color-text-light)]'}`}
                  onClick={() => setManualMode('common')}
                >
                  Common
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-full py-2 text-sm font-medium transition ${manualMode === 'individual' ? 'bg-[var(--color-panel-hover)] text-fg' : 'bg-[var(--color-surface)] text-[var(--color-text-light)]'}`}
                  onClick={() => setManualMode('individual')}
                >
                  Individual
                </button>
              </div>

              {manualMode === 'favorites' ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    className="w-full rounded-xl bg-[var(--color-surface-deep)] py-3 text-fg transition hover:bg-[var(--color-panel-hover)]"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Add New Favorite
                  </button>
                  <div className="space-y-2">
                    {favorites.map((fav, index) => (
                      <div
                        key={index}
                        className="flex w-full items-center justify-between rounded-xl border border-[var(--color-accent)]/10 bg-[var(--color-bg-dark)] p-4 text-left"
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => {
                            addMeal(fav.name, fav.macros);
                            setManualEntryOpen(false);
                          }}
                        >
                          <p className="font-bold text-fg">{fav.name}</p>
                          <p className="text-sm text-[var(--color-text-light)]">
                            {formatMacroAmount(fav.macros.calories)} kcal, {formatMacroAmount(fav.macros.protein)}g P,{' '}
                            {formatMacroAmount(fav.macros.carbs)}g C, {formatMacroAmount(fav.macros.fat)}g F
                          </p>
                        </button>
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => setOpenMenuId(openMenuId === `fav-${index}` ? null : `fav-${index}`)}
                          >
                            <MoreVertical className="text-fg" />
                          </button>
                          {openMenuId === `fav-${index}` && (
                            <div className="absolute right-0 z-10 mt-2 space-y-1 rounded-lg border border-[var(--color-accent)]/10 bg-[var(--color-surface-deep)] p-2 shadow-lg">
                              <button
                                type="button"
                                className="block w-full px-2 py-1 text-left text-blue-300 hover:text-blue-200"
                                onClick={() => startEditFavorite(index)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="block w-full px-2 py-1 text-left text-red-400 hover:text-red-300"
                                onClick={() => {
                                  setFavorites(favorites.filter((_, i) => i !== index));
                                  setOpenMenuId(null);
                                  toast.success('Favorite removed');
                                }}
                              >
                                Remove
                              </button>
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
                      type="button"
                      className="w-full rounded-xl border border-[var(--color-accent)]/10 bg-[var(--color-bg-dark)] p-4 text-left transition hover:bg-[var(--color-panel-hover)]"
                      onClick={() => {
                        addMeal(meal.name, meal.macros);
                        setManualEntryOpen(false);
                      }}
                    >
                      <p className="font-bold text-fg">{meal.name}</p>
                      <p className="text-sm text-[var(--color-text-light)]">
                        {formatMacroAmount(meal.macros.calories)} kcal, {formatMacroAmount(meal.macros.protein)}g P,{' '}
                        {formatMacroAmount(meal.macros.carbs)}g C, {formatMacroAmount(meal.macros.fat)}g F
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <MacroInputGrid
                    idPrefix="manual-macro"
                    valueForKey={macroInputValue}
                    onChange={handleMacroInputChange}
                    onFocus={handleMacroInputFocus}
                    onBlur={handleMacroInputBlur}
                  />
                  <button
                    type="button"
                    className="w-full rounded-full bg-[var(--color-accent)] py-3 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)]"
                    onClick={() => {
                      addMeal('Manual Entry', manualMacros);
                      setManualEntryOpen(false);
                    }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 [&::-webkit-scrollbar]:hidden">
          <div className="glass w-full max-w-md rounded-2xl border border-[var(--color-accent)]/10 p-6 shadow-lg accent-glow [&::-webkit-scrollbar]:hidden">
            <h2 className="mb-4 text-lg font-semibold text-fg brand-font">Add Favorite</h2>
            <div className="mb-4 flex gap-2">
              <button type="button" className={`flex-1 rounded-full py-2 text-sm font-medium ${modalMode === 'manual' ? 'bg-[var(--color-panel-hover)] text-fg' : 'text-[var(--color-text-light)]'}`} onClick={() => setModalMode('manual')}>Manual</button>
              <button type="button" className={`flex-1 rounded-full py-2 text-sm font-medium ${modalMode === 'ai' ? 'bg-[var(--color-panel-hover)] text-fg' : 'text-[var(--color-text-light)]'}`} onClick={() => setModalMode('ai')}>AI</button>
              <button type="button" className={`flex-1 rounded-full py-2 text-sm font-medium ${modalMode === 'picture' ? 'bg-[var(--color-panel-hover)] text-fg' : 'text-[var(--color-text-light)]'}`} onClick={() => setModalMode('picture')}>Picture</button>
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
                  className="w-full rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface)] p-3 text-fg"
                />
                <MacroInputGrid
                  idPrefix="favorite-manual-macro"
                  valueForKey={macroInputValue}
                  onChange={handleMacroInputChange}
                  onFocus={handleMacroInputFocus}
                  onBlur={handleMacroInputBlur}
                />
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
                  className="w-full rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface)] p-3 text-fg"
                />
                <input
                  id="favorite-ai-description"
                  name="favorite_ai_description"
                  type="text"
                  placeholder="Description"
                  value={textDescription}
                  onChange={(e) => setTextDescription(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface)] p-3 text-fg"
                />
                <button className="w-full bg-[var(--color-accent)] text-white py-3 rounded-full" onClick={async () => {
                  setLoading(true);
                  try {
                    const text = await generateContentJson({
                      parts: [
                        {
                          text: promptAggregateMacrosFromDescription(textDescription),
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
                  className="w-full rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface)] p-3 text-fg"
                />
                <input
                  id="favorite-picture-file"
                  name="favorite_picture_file"
                  type="file"
                  accept="image/*"
                  className="w-full rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface)] p-3 text-fg"
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
                              text: promptAggregateMacrosFromImage(),
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
      {addMealChooserOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
          onClick={() => setAddMealChooserOpen(false)}
        >
          <div
            className="glass w-full max-w-sm rounded-2xl border border-[var(--color-accent)]/10 p-4 shadow-lg accent-glow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-fg brand-font">Add a meal</h2>
              <button
                type="button"
                className="rounded-full p-1.5 text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg"
                onClick={() => setAddMealChooserOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-[var(--color-accent)]/15 bg-[var(--color-bg-dark)] px-3 py-2.5 text-left transition hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-panel-hover)]"
                onClick={() => {
                  setAddMealChooserOpen(false);
                  setDescribeOpen(true);
                }}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
                <span className="text-sm font-medium text-fg">Describe</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-[var(--color-accent)]/15 bg-[var(--color-bg-dark)] px-3 py-2.5 text-left transition hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-panel-hover)]"
                onClick={() => {
                  setAddMealChooserOpen(false);
                  openNativeCamera();
                }}
              >
                <Camera className="h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
                <span className="text-sm font-medium text-fg">Picture</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-[var(--color-accent)]/15 bg-[var(--color-bg-dark)] px-3 py-2.5 text-left transition hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-panel-hover)]"
                onClick={() => {
                  setAddMealChooserOpen(false);
                  setManualEntryOpen(true);
                }}
              >
                <ClipboardList className="h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
                <span className="text-sm font-medium text-fg">Manual</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-[var(--color-accent)]/15 bg-[var(--color-bg-dark)] px-3 py-2.5 text-left transition hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-panel-hover)]"
                onClick={() => {
                  setAddMealChooserOpen(false);
                  openSnackHelper();
                }}
              >
                <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
                <span className="text-sm font-medium text-fg">Snack</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {snackOpen && (() => {
        const remainingCalories = Math.max(0, goals.calories - macros.calories);
        const remainingProtein = Math.max(0, goals.protein - macros.protein);
        const overCalories = goals.calories > 0 && macros.calories >= goals.calories;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => {
              if (!snackLoading) {
                setSnackOpen(false);
                setSnackResult(null);
              }
            }}
          >
            <div
              className="glass max-h-[min(92vh,44rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--color-accent)]/10 p-6 shadow-lg accent-glow"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-fg brand-font">
                    <Sparkles className="h-5 w-5 text-[var(--color-accent)]" aria-hidden />
                    I need a snack
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-text-light)]">
                    Toggle what you have on hand. We&apos;ll suggest something that fits your remaining macros.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full p-1.5 text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg disabled:opacity-40"
                  onClick={() => {
                    setSnackOpen(false);
                    setSnackResult(null);
                  }}
                  disabled={snackLoading}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 rounded-xl border border-[var(--color-accent)]/10 bg-[var(--color-bg-dark)] p-3 text-xs text-[var(--color-text-light)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Remaining today:{' '}
                    <span className={`font-semibold tabular-nums ${overCalories ? 'text-red-300' : 'text-fg'}`}>
                      {formatMacroAmount(remainingCalories)} kcal
                    </span>
                  </span>
                  <span>
                    Protein left:{' '}
                    <span className="font-semibold tabular-nums text-fg">
                      {formatMacroAmount(remainingProtein)} g
                    </span>
                  </span>
                </div>
                {overCalories && (
                  <p className="mt-2 text-red-300">
                    You&apos;re already at your calorie goal — try water, tea, or veggies.
                  </p>
                )}
              </div>

              {!snackResult && (
                <>
                  <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-text-light)]">
                    <span>What do you have? ({snackIngredients.length} selected)</span>
                    {snackIngredients.length > 0 && (
                      <button
                        type="button"
                        className="text-[var(--color-accent)] hover:underline"
                        onClick={() => setSnackIngredients([])}
                        disabled={snackLoading}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="mb-5 flex flex-wrap gap-2">
                    {SNACK_INGREDIENTS.map((ing) => {
                      const active = snackIngredients.includes(ing);
                      return (
                        <button
                          key={ing}
                          type="button"
                          onClick={() => toggleSnackIngredient(ing)}
                          disabled={snackLoading}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                            active
                              ? 'border-transparent bg-[var(--color-accent)] text-white shadow-sm'
                              : 'border-[var(--color-accent)]/25 bg-[var(--color-surface)] text-[var(--color-text-light)] hover:border-[var(--color-accent)]/50 hover:text-fg'
                          }`}
                          aria-pressed={active}
                        >
                          {ing}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
                    onClick={() => void handleGenerateSnack()}
                    disabled={
                      snackLoading || snackIngredients.length === 0 || overCalories
                    }
                  >
                    {snackLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Thinking…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" aria-hidden />
                        Suggest a snack
                      </>
                    )}
                  </button>
                </>
              )}

              {snackResult && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[var(--color-accent)]/15 bg-[var(--color-bg-dark)] p-4">
                    <h3 className="text-base font-bold text-fg brand-font">{snackResult.name}</h3>
                    <p className="mt-1 text-xs tabular-nums text-[var(--color-text-light)]">
                      {formatMacroAmount(snackResult.macros.calories)} kcal ·{' '}
                      {formatMacroAmount(snackResult.macros.protein)}g P ·{' '}
                      {formatMacroAmount(snackResult.macros.carbs)}g C ·{' '}
                      {formatMacroAmount(snackResult.macros.fat)}g F
                    </p>
                    {snackResult.ingredientsUsed.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm text-fg">
                        {snackResult.ingredientsUsed.map((it, i) => (
                          <li key={`${it.name}-${i}`} className="flex justify-between gap-3">
                            <span>{it.name}</span>
                            <span className="text-[var(--color-text-light)]">{it.amount}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {snackResult.instructions && (
                      <p className="mt-3 whitespace-pre-line text-sm text-[var(--color-text-light)]">
                        {snackResult.instructions}
                      </p>
                    )}
                    {snackResult.notes && (
                      <p className="mt-2 text-xs italic text-[var(--color-text-light)]">
                        {snackResult.notes}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-surface)] py-3 text-sm font-medium text-fg transition hover:bg-[var(--color-panel-hover)] disabled:opacity-60"
                      onClick={() => void handleGenerateSnack()}
                      disabled={snackLoading}
                    >
                      {snackLoading ? 'Thinking…' : 'Try another'}
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-[var(--color-accent)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
                      onClick={acceptSnack}
                      disabled={snackLoading}
                    >
                      Add to log
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {editingMealId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 [&::-webkit-scrollbar]:hidden">
          <div className="glass w-full max-w-md rounded-2xl border border-[var(--color-accent)]/10 p-6 shadow-lg accent-glow [&::-webkit-scrollbar]:hidden">
            <h2 className="mb-4 text-lg font-semibold text-fg brand-font">Edit Meal</h2>
            <div className="space-y-4">
              <input
                id="edit-meal-name"
                name="edit_meal_name"
                type="text"
                placeholder="Meal name"
                value={editMealName}
                onChange={(e) => setEditMealName(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface)] p-3 text-fg"
              />
              <MacroInputGrid
                idPrefix="edit-meal-macro"
                valueForKey={(key) => String(editMealMacros[key])}
                onChange={handleEditMealMacroChange}
              />
              <button
                className="w-full rounded-full bg-[var(--color-accent)] py-3 font-medium text-white hover:bg-[var(--color-accent-hover)] transition"
                onClick={saveEditedMeal}
              >
                Save Changes
              </button>
            </div>
            <button className="mt-4 text-[var(--color-text-light)]" onClick={() => setEditingMealId(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {editingFavoriteIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 [&::-webkit-scrollbar]:hidden">
          <div className="glass w-full max-w-md rounded-2xl border border-[var(--color-accent)]/10 p-6 shadow-lg accent-glow [&::-webkit-scrollbar]:hidden">
            <h2 className="mb-4 text-lg font-semibold text-fg brand-font">Edit Favorite</h2>
            <div className="space-y-4">
              <input
                id="edit-favorite-name"
                name="edit_favorite_name"
                type="text"
                placeholder="Favorite name"
                value={editFavoriteName}
                onChange={(e) => setEditFavoriteName(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface)] p-3 text-fg"
              />
              <MacroInputGrid
                idPrefix="edit-favorite-macro"
                valueForKey={(key) => String(editFavoriteMacros[key])}
                onChange={handleEditFavoriteMacroChange}
              />
              <button
                className="w-full rounded-full bg-[var(--color-accent)] py-3 font-medium text-white hover:bg-[var(--color-accent-hover)] transition"
                onClick={saveEditedFavorite}
              >
                Save Changes
              </button>
            </div>
            <button className="mt-4 text-[var(--color-text-light)]" onClick={() => setEditingFavoriteIndex(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {calendarOpen && (
        <MacroCalendar
          dailyLog={dailyLog}
          todayMacros={macros}
          goals={goals}
          calorieGoalMode={calorieGoalMode}
          onClose={() => setCalendarOpen(false)}
        />
      )}
      {isGoalsModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-md py-2">
            <div className="glass w-full rounded-2xl border border-[var(--color-accent)]/10 p-4 shadow-lg accent-glow sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-fg brand-font">Set daily goals</h2>
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--color-accent)]/10 bg-[var(--color-bg-dark)] p-4">
                  <h3 className="mb-2 text-sm font-semibold text-fg brand-font">AI daily goals</h3>
                  {goalsAiLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--color-accent)]/10 bg-[var(--color-surface-deep)] py-8">
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
                      className="mb-2 w-full rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface-deep)] p-3 text-fg"
                      rows={2}
                    />
                    <button 
                      type="button"
                      className="w-full rounded-full bg-[var(--color-surface-deep)] py-2 text-sm font-medium text-fg transition hover:bg-[var(--color-panel-hover)]"
                      onClick={async () => {
                        setGoalsAiLoading(true);
                        try {
                          const text = await generateContentJson({
                            parts: [
                              {
                                text: promptDailyMacroGoals(aiPrompt),
                              },
                            ],
                          });
                          const result = JSON.parse(text) as Record<string, unknown>;
                          setGoals(normalizeAiMacros(result));
                          const cw = parseOptionalAiWeightLb(result.currentWeightLb);
                          const tw = parseOptionalAiWeightLb(result.targetWeightLb);
                          if (cw != null) {
                            markLocalProfileWeightPush(cw);
                            setWeightLog((prev) => ({
                              ...prev,
                              [getTodayKey()]: cw,
                            }));
                            if (socialEnabled && user) {
                              void saveBodyWeightLb(cw).catch((e) =>
                                console.error('Could not sync weight to profile', e),
                              );
                            }
                          }
                          if (tw != null) {
                            setWeightGoal(tw);
                          }
                          if (result.calorieGoalMode != null) {
                            setCalorieGoalMode(normalizeCalorieGoalMode(result.calorieGoalMode));
                          }
                          const parts = ['Daily goals updated via AI.'];
                          if (cw != null) {
                            parts.push(`Logged current weight (${formatMacroAmount(cw)} lb).`);
                          }
                          if (tw != null) {
                            parts.push(`Set goal weight (${formatMacroAmount(tw)} lb).`);
                          }
                          if (result.calorieGoalMode != null) {
                            parts.push(
                              `Calorie goal: ${calorieGoalModeLabel(normalizeCalorieGoalMode(result.calorieGoalMode))}.`,
                            );
                          }
                          toast.success(parts.join(' '));
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
              <div className="rounded-xl border border-[var(--color-accent)]/10 bg-[var(--color-bg-dark)] p-4">
                <h3 className="mb-3 text-sm font-semibold text-fg brand-font">Daily goals</h3>
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-medium text-[var(--color-text-light)]">Calorie goal</p>
                    <CalorieGoalModePill value={calorieGoalMode} onChange={setCalorieGoalMode} />
                  </div>
                  <div>
                    <label
                      htmlFor="goal-weight"
                      className="mb-1 block text-xs font-medium text-[var(--color-text-light)]"
                    >
                      Weight goal
                    </label>
                    <div className="flex gap-2">
                      <div className="flex min-w-0 flex-1 items-center rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-surface)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]">
                        <input
                          id="goal-weight"
                          name="goal_weight"
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder={profileWeightUnit === 'lb' ? 'e.g. 165' : 'e.g. 75'}
                          value={
                            weightGoalFieldDraft !== null
                              ? weightGoalFieldDraft
                              : weightGoal > 0
                                ? formatMacroAmount(weightFromLb(weightGoal, profileWeightUnit))
                                : ''
                          }
                          onChange={(e) => {
                            const s = sanitizeMacroAmountRaw(e.target.value);
                            setWeightGoalFieldDraft(s);
                            setWeightGoal(weightToLb(parseMacroAmountInput(s), profileWeightUnit));
                          }}
                          onBlur={() => setWeightGoalFieldDraft(null)}
                          className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-sm tabular-nums text-fg outline-none"
                        />
                      </div>
                      <ProfileUnitSelect
                        value={profileWeightUnit}
                        options={WEIGHT_UNIT_OPTIONS}
                        ariaLabel="Weight goal unit"
                        onChange={(unit) => {
                          if (weightGoalFieldDraft !== null) {
                            const val = parseMacroAmountInput(weightGoalFieldDraft);
                            if (val > 0) {
                              setWeightGoalFieldDraft(
                                formatMacroAmount(
                                  weightFromLb(weightToLb(val, profileWeightUnit), unit),
                                ),
                              );
                            }
                          }
                          if (socialEnabled) {
                            void saveWeightUnit(unit).catch((e) =>
                              console.error('Could not save weight unit', e),
                            );
                          } else {
                            setGuestWeightUnit(unit);
                          }
                        }}
                      />
                    </div>
                  </div>
                  <MacroInputGrid
                    idPrefix="goal"
                    valueForKey={(key) => String(goals[key])}
                    onChange={(key, raw) =>
                      setGoals((prev) => ({
                        ...prev,
                        [key]: parseGoalIntInput(raw),
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-full bg-[var(--color-surface)] py-3 text-sm font-medium text-fg transition hover:bg-[var(--color-panel-hover)]"
                  onClick={closeGoalsModal}
                >
                  Done
                </button>
                {goalsModalDirty ? (
                  <button
                    type="button"
                    className="shrink-0 rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)]"
                    onClick={saveGoalsModal}
                  >
                    Save
                  </button>
                ) : null}
              </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {aiReview && (
        <div className="fixed inset-0 z-[60] flex min-h-0 flex-col bg-[var(--color-bg-dark)] blueprint-bg">
          <header className="shrink-0 border-b border-[var(--color-accent)]/20 bg-[var(--color-chrome-bar)] px-4 py-4 shadow-md md:px-8">
            <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
              <h1 className="min-w-0 text-xl font-semibold leading-tight text-[var(--color-accent)] brand-font">
                Review AI result
              </h1>
              <button
                type="button"
                className="shrink-0 rounded-full p-2 text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg"
                onClick={denyAiReview}
                aria-label="Discard"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <div className="mx-auto max-w-lg space-y-6">
              <section className="glass rounded-2xl border border-[var(--color-accent)]/10 p-6 shadow-lg accent-glow">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-light)]">Meal</p>
                <p className="mt-1 text-lg font-semibold leading-snug text-fg brand-font">{aiReview.mealName}</p>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {MACRO_ORDER.map((key) => {
                    const unit = key === 'calories' ? 'kcal' : 'g';
                    const macroColor = MACRO_RING_COLORS[key];
                    return (
                      <div
                        key={key}
                        className="rounded-xl border border-[var(--color-accent)]/10 bg-[var(--color-bg-dark)] p-4 text-center"
                        style={{ boxShadow: `inset 0 2px 0 0 ${macroColor}` }}
                      >
                        <p
                          className="text-xs font-medium capitalize"
                          style={{ color: macroColor }}
                        >
                          {key}
                        </p>
                        <p
                          className="mt-1 text-lg font-bold tabular-nums"
                          style={{ color: macroColor }}
                        >
                          {formatMacroAmount(aiReview.macros[key])}
                          <span className="ml-0.5 text-sm font-normal text-[var(--color-text-light)]">{unit}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </main>
          <footer className="shrink-0 border-t border-[var(--color-accent)]/20 bg-[var(--color-chrome-bar)]/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md supports-[backdrop-filter]:bg-[var(--color-chrome-bar)]/90">
            <div className="mx-auto flex max-w-lg flex-col gap-3">
              <button
                type="button"
                className="w-full rounded-full bg-[var(--color-accent)] py-4 text-base font-semibold text-white shadow-lg transition hover:bg-[var(--color-accent-hover)] active:scale-[0.99]"
                onClick={acceptAiReview}
              >
                Add to log
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="flex-1 rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-surface)] py-3.5 text-sm font-medium text-fg transition hover:bg-[var(--color-panel-hover)]"
                  onClick={denyAiReview}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-surface)] py-3.5 text-sm font-medium text-fg transition hover:bg-[var(--color-panel-hover)]"
                  onClick={retakeAiReview}
                >
                  {aiReview.source === 'image' ? 'Retake' : 'Revise description'}
                </button>
              </div>
            </div>
          </footer>
        </div>
      )}

      <SettingsModal
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          setSettingsTermsOpen(false);
        }}
        initialTermsOpen={settingsTermsOpen}
        showWeightSection={showWeightSection}
        onShowWeightSectionChange={setShowWeightSection}
      />
      <ProfileModal
        open={profileOpen}
        initialTab={profileInitialTab}
        onClose={() => setProfileOpen(false)}
        showSocialOnOverview={showSocialOnOverview}
        onShowSocialOnOverviewChange={setShowSocialOnOverview}
      />

      {coachOpen ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-modal="true"
          aria-label="AI Coach"
          onClick={() => setCoachOpen(false)}
        >
          <div
            className="flex h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-[1.25rem] border border-[var(--color-accent)]/20 bg-[var(--color-bg-dark)] shadow-2xl accent-glow"
            onClick={(e) => e.stopPropagation()}
          >
            <AiChatScreen
              layout="modal"
              coachInputs={aiCoachInputs}
              onClose={() => setCoachOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
    </MacroCloudSyncProvider>
  );
}
