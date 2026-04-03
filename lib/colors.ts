export const riskLevelColors = {
  LOW: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
  MEDIUM: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
  },
  HIGH: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
  },
  CRITICAL: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
}

export const statusColors = {
  OPEN: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
  },
  CLOSED: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
  },
  IN_PROGRESS: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-200',
  },
  RESOLVED: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
}

export const categoryColors: Record<string, { bg: string; text: string }> = {
  SAFETY: { bg: 'bg-blue-100', text: 'text-blue-800' },
  FOOD_SAFETY: { bg: 'bg-amber-100', text: 'text-amber-800' },
  QHSE: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  RISK_ASSESSMENT: { bg: 'bg-rose-100', text: 'text-rose-800' },
  AUDIT: { bg: 'bg-teal-100', text: 'text-teal-800' },
  TRAINING: { bg: 'bg-violet-100', text: 'text-violet-800' },
}

export function getRiskLevelColor(level: string): typeof riskLevelColors.LOW {
  return riskLevelColors[level as keyof typeof riskLevelColors] || riskLevelColors.LOW
}

export function getStatusColor(status: string): typeof statusColors.OPEN {
  return statusColors[status as keyof typeof statusColors] || statusColors.OPEN
}

export function getCategoryColor(category: string): { bg: string; text: string } {
  return categoryColors[category] || { bg: 'bg-gray-100', text: 'text-gray-800' }
}
