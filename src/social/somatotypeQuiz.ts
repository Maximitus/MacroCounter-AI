import type {ProfileBodyType} from './socialTypes.ts';

export type SomatotypeQuizQuestion = {
  id: string;
  prompt: string;
  options: {
    label: string;
    scores: Partial<Record<ProfileBodyType, number>>;
  }[];
};

export const SOMATOTYPE_QUIZ_QUESTIONS: SomatotypeQuizQuestion[] = [
  {
    id: 'build',
    prompt: 'Which best describes your natural build?',
    options: [
      {
        label: 'Slim, narrow shoulders, long limbs',
        scores: {ectomorph: 2, mesomorph: 1},
      },
      {
        label: 'Athletic and proportional',
        scores: {mesomorph: 2, ectomorph: 1},
      },
      {
        label: 'Rounder shape, wider hips or midsection',
        scores: {endomorph: 2, mesomorph: 1},
      },
    ],
  },
  {
    id: 'muscle',
    prompt: 'How easily do you gain muscle with training?',
    options: [
      {label: 'Very difficult or slow', scores: {ectomorph: 2}},
      {label: 'Moderate — steady progress', scores: {mesomorph: 2}},
      {label: 'Easier, but I gain fat too', scores: {endomorph: 2, mesomorph: 1}},
    ],
  },
  {
    id: 'fat',
    prompt: 'How easily do you gain body fat?',
    options: [
      {label: 'Hard to gain weight', scores: {ectomorph: 2}},
      {label: 'Moderate', scores: {mesomorph: 2}},
      {label: 'I gain fat easily', scores: {endomorph: 2}},
    ],
  },
  {
    id: 'joints',
    prompt: 'Which best matches your wrist and joint size?',
    options: [
      {label: 'Small and slender', scores: {ectomorph: 2}},
      {label: 'Medium', scores: {mesomorph: 2}},
      {label: 'Large and thick', scores: {endomorph: 2, mesomorph: 1}},
    ],
  },
  {
    id: 'surplus',
    prompt: 'If you eat above maintenance without much exercise…',
    options: [
      {label: 'Little changes', scores: {ectomorph: 2}},
      {label: 'Some muscle and some fat', scores: {mesomorph: 2}},
      {label: 'Mostly fat gain', scores: {endomorph: 2}},
    ],
  },
];

const LABELS: Record<ProfileBodyType, string> = {
  ectomorph: 'Ectomorph',
  mesomorph: 'Mesomorph',
  endomorph: 'Endomorph',
};

export function scoreSomatotypeQuiz(
  answers: number[],
): {type: ProfileBodyType; label: string; scores: Record<ProfileBodyType, number>} {
  const totals: Record<ProfileBodyType, number> = {
    ectomorph: 0,
    mesomorph: 0,
    endomorph: 0,
  };

  answers.forEach((optionIndex, questionIndex) => {
    const question = SOMATOTYPE_QUIZ_QUESTIONS[questionIndex];
    const option = question?.options[optionIndex];
    if (!option) return;
    for (const [type, points] of Object.entries(option.scores) as [ProfileBodyType, number][]) {
      totals[type] += points;
    }
  });

  const ranked = (Object.entries(totals) as [ProfileBodyType, number][]).sort(
    (a, b) => b[1] - a[1],
  );
  const type = ranked[0]?.[0] ?? 'mesomorph';

  return {type, label: LABELS[type], scores: totals};
}
