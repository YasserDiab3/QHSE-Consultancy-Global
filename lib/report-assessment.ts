export const FOOD_SAFETY_ASSESSMENT_KEYS = [
  'site',
  'employees',
  'documents',
  'equipment',
  'infrastructure',
  'storage',
] as const

export type FoodSafetyAssessmentScores = Partial<Record<(typeof FOOD_SAFETY_ASSESSMENT_KEYS)[number], number>>

export function normalizeAssessmentScores(value: unknown): FoodSafetyAssessmentScores | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined

  const source = value as Record<string, unknown>
  const scores: FoodSafetyAssessmentScores = {}
  for (const key of FOOD_SAFETY_ASSESSMENT_KEYS) {
    if (typeof source[key] === 'undefined') continue
    const score = Number(source[key])
    if (!Number.isFinite(score)) continue
    scores[key] = Math.max(0, Math.min(100, Math.round(score)))
  }

  return Object.keys(scores).length ? scores : undefined
}
