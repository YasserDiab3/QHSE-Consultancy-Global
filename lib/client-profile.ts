export type PortalSettings = {
  logoDataUrl?: string
  showProfile?: boolean
  legacyContactInfo?: string
  profileLocked?: boolean
  lockedAt?: string
  lockedBy?: string
}

export const PROFILE_PREFIX = 'QHSSE_PORTAL_PROFILE:'

/**
 * Parses client contactInfo string into structured PortalSettings.
 */
export function parsePortalSettings(value?: string | null): PortalSettings {
  if (!value) return {}
  if (!value.startsWith(PROFILE_PREFIX)) {
    return { legacyContactInfo: value }
  }
  try {
    return JSON.parse(value.slice(PROFILE_PREFIX.length)) as PortalSettings
  } catch {
    return {}
  }
}

/**
 * Serializes PortalSettings back to the prefix-tagged string stored in Client.contactInfo.
 */
export function serializePortalSettings(settings: PortalSettings): string {
  return `${PROFILE_PREFIX}${JSON.stringify(settings)}`
}

/**
 * Checks whether a client profile is locked.
 * A profile is locked if:
 * 1. settings.profileLocked is explicitly true
 * 2. settings.profileLocked is NOT explicitly false AND settings has a saved logo or initial portal save
 */
export function isProfileLocked(settings: PortalSettings): boolean {
  if (typeof settings.profileLocked === 'boolean') {
    return settings.profileLocked
  }
  return Boolean(settings.logoDataUrl)
}
