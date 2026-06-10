import {useMemo, useState} from 'react';
import {ChevronLeft, X} from 'lucide-react';
import type {ProfileBodyType} from './socialTypes.ts';
import {
  SOMATOTYPE_QUIZ_QUESTIONS,
  scoreSomatotypeQuiz,
} from './somatotypeQuiz.ts';

export function SomatotypeQuizModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (type: ProfileBodyType) => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  const total = SOMATOTYPE_QUIZ_QUESTIONS.length;
  const onResults = step >= total;
  const question = !onResults ? SOMATOTYPE_QUIZ_QUESTIONS[step] : null;
  const selectedOption = answers[step];

  const result = useMemo(
    () => (onResults ? scoreSomatotypeQuiz(answers) : null),
    [answers, onResults],
  );

  if (!open) return null;

  const reset = () => {
    setStep(0);
    setAnswers([]);
  };

  const close = () => {
    reset();
    onClose();
  };

  const pickOption = (optionIndex: number) => {
    const nextAnswers = [...answers];
    nextAnswers[step] = optionIndex;
    setAnswers(nextAnswers);
    if (step + 1 >= total) {
      setStep(total);
      return;
    }
    setStep(step + 1);
  };

  const goBack = () => {
    if (onResults) {
      setStep(total - 1);
      return;
    }
    if (step > 0) setStep(step - 1);
  };

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/50 p-4"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="somatotype-quiz-title"
        className="glass max-h-[min(90vh,28rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-[var(--color-accent)]/10 p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="somatotype-quiz-title" className="text-base font-semibold text-fg brand-font">
              Find your somatotype
            </h2>
            {!onResults ? (
              <p className="mt-0.5 text-xs text-[var(--color-text-light)]">
                Question {step + 1} of {total}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-full p-1.5 text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {onResults && result ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--color-accent)]/10 bg-[var(--color-bg-dark)] p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-light)]">
                Your result
              </p>
              <p className="mt-1 text-xl font-semibold text-fg brand-font">{result.label}</p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-light)]">
                This is a rough guide based on your answers — pick what feels most accurate.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={goBack}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-[var(--color-surface)] py-2.5 text-sm font-medium text-fg transition hover:bg-[var(--color-panel-hover)]"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelect(result.type);
                  close();
                }}
                className="flex-1 rounded-xl bg-[var(--color-accent)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)]"
              >
                Use {result.label}
              </button>
            </div>
            <button
              type="button"
              onClick={reset}
              className="w-full text-center text-xs text-[var(--color-text-light)] transition hover:text-fg"
            >
              Retake quiz
            </button>
          </div>
        ) : question ? (
          <div className="space-y-3">
            <p className="text-sm leading-snug text-fg">{question.prompt}</p>
            <div className="space-y-2">
              {question.options.map((option, index) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => pickOption(index)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    selectedOption === index
                      ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/15 text-fg'
                      : 'border-[var(--color-accent)]/20 bg-[var(--color-surface)] text-fg hover:bg-[var(--color-panel-hover)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {step > 0 ? (
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1 text-xs text-[var(--color-text-light)] transition hover:text-fg"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                Previous question
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
