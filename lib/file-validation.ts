import { extname } from 'path'

const RESUME_TYPES = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function startsWith(bytes: Buffer, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value)
}

function detectImageMimeType(bytes: Buffer) {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  if (bytes.subarray(0, 6).toString('ascii') === 'GIF87a' || bytes.subarray(0, 6).toString('ascii') === 'GIF89a') return 'image/gif'
  return null
}

export function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 180) || 'upload'
}

export function validateResumeFile(file: File, bytes: Buffer) {
  const extension = extname(file.name || '').toLowerCase() as keyof typeof RESUME_TYPES
  const mimeType = RESUME_TYPES[extension]
  if (!mimeType) throw new Error('Unsupported resume file type')

  const signatureMatches =
    (extension === '.pdf' && bytes.subarray(0, 5).toString('ascii') === '%PDF-') ||
    (extension === '.doc' && startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) ||
    (extension === '.docx' && startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]))

  if (!signatureMatches) throw new Error('Resume content does not match its file type')
  if (file.type && file.type !== 'application/octet-stream' && file.type !== mimeType) {
    throw new Error('Resume MIME type does not match its file type')
  }

  return { mimeType, originalName: sanitizeFilename(file.name || `resume${extension}`) }
}

export function validateImageFile(file: File, bytes: Buffer) {
  const mimeType = detectImageMimeType(bytes)
  if (!mimeType || !IMAGE_TYPES.has(mimeType)) throw new Error('Unsupported or invalid image file')
  if (file.type && file.type !== mimeType && !(file.type === 'image/jpg' && mimeType === 'image/jpeg')) {
    throw new Error('Image MIME type does not match its content')
  }

  return { mimeType, originalName: sanitizeFilename(file.name || 'image') }
}
