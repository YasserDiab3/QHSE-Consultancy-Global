import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { sanitizeFilename } from '@/lib/file-validation'

export type StorageFolder = 'observations' | 'resumes' | 'client-documents' | 'branding'

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'qhsse-documents'

const STORAGE_URL_PREFIX = '/api/files/'

let supabaseAdmin: SupabaseClient | null = null

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return null
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  return supabaseAdmin
}

export function isStorageConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function toDataUrl(data: Buffer, contentType: string) {
  return `data:${contentType};base64,${data.toString('base64')}`
}

export function buildStorageUrl(bucket: string, objectPath: string) {
  return `${STORAGE_URL_PREFIX}${bucket}/${objectPath}`
}

export function parseStorageUrl(value: string): { bucket: string; path: string } | null {
  if (!value.startsWith(STORAGE_URL_PREFIX)) {
    return null
  }

  const remainder = value.slice(STORAGE_URL_PREFIX.length)
  const separator = remainder.indexOf('/')
  if (separator <= 0) {
    return null
  }

  let bucket: string
  let path: string

  try {
    bucket = decodeURIComponent(remainder.slice(0, separator))
    path = remainder
      .slice(separator + 1)
      .split('/')
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment))
      .join('/')
  } catch {
    return null
  }

  if (!bucket || !path || path.includes('..') || bucket.includes('/')) {
    return null
  }

  return { bucket, path }
}

type UploadInput = {
  data: Buffer
  contentType: string
  originalName?: string
  folder: StorageFolder
}

/**
 * Stores a file in Supabase Storage when the service role key is configured.
 * Falls back to a base64 data URL so existing deployments keep working before
 * storage credentials are provisioned.
 */
export async function uploadFile({ data, contentType, originalName, folder }: UploadInput): Promise<string> {
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    return toDataUrl(data, contentType)
  }

  const safeName = sanitizeFilename(originalName || `file-${randomUUID()}`)
  const objectPath = `${folder}/${new Date().getUTCFullYear()}/${randomUUID()}-${safeName}`

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(objectPath, data, {
    contentType,
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    // A misconfigured bucket must not block a client upload. Keep the file in
    // the database as a fallback and surface the issue in server logs.
    console.error('Supabase Storage upload failed; falling back to database storage:', error.message)
    return toDataUrl(data, contentType)
  }

  return buildStorageUrl(STORAGE_BUCKET, objectPath)
}

/**
 * Converts an incoming base64 data URL into stored object storage (when
 * configured). Any other value, including external URLs, is returned unchanged.
 */
export async function persistDataUrl(
  value: string,
  options: { folder: StorageFolder; originalName?: string }
): Promise<string> {
  if (!value.startsWith('data:')) {
    return value
  }

  const match = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i.exec(value)
  if (!match) {
    return value
  }

  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.length === 0) {
    return value
  }

  return uploadFile({
    data: buffer,
    contentType: match[1].toLowerCase(),
    originalName: options.originalName,
    folder: options.folder,
  })
}

export async function createSignedStorageUrl(value: string, expiresInSeconds = 60) {
  const parsed = parseStorageUrl(value)
  const supabase = getSupabaseAdmin()

  if (!parsed || !supabase || parsed.bucket !== STORAGE_BUCKET) {
    return null
  }

  const { data, error } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, expiresInSeconds)

  if (error || !data?.signedUrl) {
    return null
  }

  return data.signedUrl
}

export async function deleteStoredFile(value: string) {
  const parsed = parseStorageUrl(value)
  const supabase = getSupabaseAdmin()

  if (!parsed || !supabase || parsed.bucket !== STORAGE_BUCKET) {
    return
  }

  const { error } = await supabase.storage.from(parsed.bucket).remove([parsed.path])
  if (error) {
    console.error('Failed to delete stored file:', error.message)
  }
}
