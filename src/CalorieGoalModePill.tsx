import {useCallback, useRef, useState, type PointerEvent} from 'react';
import type {CalorieGoalMode} from './macroData/macroTypes.ts';
import {calorieGoalModeLabel} from './macroProgress.ts';

const MODES: CalorieGoalMode[] = ['lose', 'maintain', 'gain'];

function clampIndex(index: number) {
  return Math.min(MODES.length - 1, Math.max(0, index));
}

export function CalorieGoalModePill({
  value,
  onChange,
}: {
  value: CalorieGoalMode;
  onChange: (mode: CalorieGoalMode) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  /** Continuous thumb position while dragging; null = snapped to selected value. */
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const selectedIndex = MODES.indexOf(value);

  const indexFromClientX = useCallback((clientX: number): number => {
    const el = trackRef.current;
    if (!el) return selectedIndex;
    const rect = el.getBoundingClientRect();
    const x = Math.min(rect.width, Math.max(0, clientX - rect.left));
    const ratio = rect.width > 0 ? x / rect.width : 0;
    return clampIndex(ratio * (MODES.length - 1));
  }, [selectedIndex]);

  const snapFromClientX = useCallback(
    (clientX: number) => {
      onChange(MODES[Math.round(indexFromClientX(clientX))]);
    },
    [indexFromClientX, onChange],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragIndex(indexFromClientX(e.clientX));
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setDragIndex(indexFromClientX(e.clientX));
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    snapFromClientX(e.clientX);
    setDragIndex(null);
  };

  const endDrag = () => {
    draggingRef.current = false;
    setDragIndex(null);
  };

  const thumbIndex = dragIndex ?? selectedIndex;
  const highlightIndex = Math.round(thumbIndex);
  const isDragging = dragIndex !== null;

  return (
    <div
      ref={trackRef}
      className="relative flex w-full touch-pan-y rounded-full bg-[var(--color-surface)] p-0.5 select-none"
      role="tablist"
      aria-label="Calorie goal"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={endDrag}
    >
      <div
        className={`pointer-events-none absolute top-0.5 bottom-0.5 rounded-full bg-[var(--color-accent)] shadow-sm ${
          isDragging ? '' : 'transition-[left] duration-300 ease-out'
        }`}
        style={{
          width: `calc((100% - 0.25rem) / ${MODES.length})`,
          left: `calc(0.125rem + ${thumbIndex} * ((100% - 0.25rem) / ${MODES.length}))`,
        }}
        aria-hidden
      />
      {MODES.map((mode, i) => (
        <button
          key={mode}
          type="button"
          role="tab"
          aria-selected={value === mode}
          tabIndex={value === mode ? 0 : -1}
          onClick={() => onChange(mode)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' && selectedIndex > 0) {
              e.preventDefault();
              onChange(MODES[selectedIndex - 1]);
            } else if (e.key === 'ArrowRight' && selectedIndex < MODES.length - 1) {
              e.preventDefault();
              onChange(MODES[selectedIndex + 1]);
            }
          }}
          className={`relative z-10 min-w-0 flex-1 cursor-pointer rounded-full px-2 py-2 text-xs font-medium transition-colors duration-200 sm:text-sm ${
            highlightIndex === i ? 'text-white' : 'text-[var(--color-text-light)]'
          }`}
        >
          {calorieGoalModeLabel(mode)}
        </button>
      ))}
    </div>
  );
}
