import { z } from 'zod'

const phonePattern = /^[+()\d\s-]{7,20}$/

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined),
    z.string().max(max).optional()
  )

export const registrationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10).max(128),
  confirmPassword: z.string().min(10).max(128),
  phone: z.string().trim().regex(phonePattern).max(20),
  language: z.enum(['ar', 'en']).optional(),
}).superRefine((value, context) => {
  if (value.password !== value.confirmPassword) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match' })
  }
})

export const contactRequestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  company: optionalText(150),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined),
    z.string().regex(phonePattern).max(20).optional()
  ),
  message: z.string().trim().min(10).max(4000),
})

export const jobApplicationSchema = z.object({
  jobOpeningId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: optionalText(20),
  company: optionalText(150),
  coverLetter: optionalText(4000),
})

export const trainingAnswersSchema = z.record(z.string().uuid(), z.enum(['A', 'B', 'C', 'D'])).refine(
  (answers) => Object.keys(answers).length <= 100,
  'Too many answers'
)

const clientDocumentMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export const clientDocumentSchema = z.object({
  title: z.string().trim().min(1).max(180),
  category: z.string().trim().min(1).max(50).optional(),
  url: z.string().max(12 * 1024 * 1024).refine(
    (value) => value.startsWith('https://') || clientDocumentMimeTypes.some((mime) => value.startsWith(`data:${mime};base64,`)),
    'Document URL or file type is not allowed'
  ),
  originalName: optionalText(180),
  mimeType: z.enum(clientDocumentMimeTypes).optional(),
  size: z.coerce.number().int().min(1).max(8 * 1024 * 1024).optional(),
})

export const financialRecordSchema = z.object({
  title: z.string().trim().min(1).max(180),
  amount: z.coerce.number().finite().min(0).max(1_000_000_000),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
  status: z.enum(['PENDING', 'PAID']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  notes: optionalText(4000),
})

export function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character] || character))
}

export function formatValidationError(error: z.ZodError) {
  return error.issues[0]?.message || 'Invalid request data'
}
