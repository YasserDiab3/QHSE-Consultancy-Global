import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClientAccountById, getClientIdByUserId, updateClientAccount, updateClientContactInfo } from '@/lib/client-records'
import { persistDataUrl } from '@/lib/storage'
import { parsePortalSettings, serializePortalSettings, isProfileLocked, PortalSettings } from '@/lib/client-profile'

export const dynamic = 'force-dynamic'

async function currentClient() {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'CLIENT') throw new Error('Forbidden')
  const clientId = await getClientIdByUserId(session.user.id)
  if (!clientId) throw new Error('Client profile not found')
  const client = await getClientAccountById(clientId)
  if (!client) throw new Error('Client profile not found')
  return { client, session }
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({
        client: null,
        settings: { showProfile: false, profileLocked: false },
      }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } })
    }

    const { client } = await currentClient()
    const settings = parsePortalSettings(client.contactInfo)
    const locked = isProfileLocked(settings)

    return NextResponse.json({
      client: {
        id: client.id,
        companyName: client.companyName,
        companyNameAr: client.companyNameAr,
        phone: client.phone,
        address: client.address,
        user: client.user,
      },
      settings: {
        logoDataUrl: settings.logoDataUrl,
        showProfile: settings.showProfile !== false,
        profileLocked: locked,
        lockedAt: settings.lockedAt,
        showFinances: Boolean(settings.showFinances),
      },
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load profile'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { client } = await currentClient()
    const body = await request.json()
    const existing = parsePortalSettings(client.contactInfo)
    const currentlyLocked = isProfileLocked(existing)

    // Once data is registered and saved for the first time, client cannot edit again directly.
    // Modifications are restricted to the system administrator.
    if (currentlyLocked && (body.profile !== undefined || body.logoDataUrl !== undefined)) {
      return NextResponse.json(
        { error: 'الملف الشخصي مقفل بعد الحفظ الأول ولا يمكن تعديله إلا من خلال مدير النظام' },
        { status: 403 }
      )
    }

    const profile = body.profile

    if (profile !== undefined) {
      const name = typeof profile.name === 'string' ? profile.name.trim() : (client.user?.name || client.companyName)
      const companyName = typeof profile.companyName === 'string' ? profile.companyName.trim() : client.companyName
      const companyNameAr = typeof profile.companyNameAr === 'string' ? profile.companyNameAr.trim() : client.companyNameAr
      const phone = typeof profile.phone === 'string' ? profile.phone.trim() : client.phone
      const address = typeof profile.address === 'string' ? profile.address.trim() : client.address

      if (!name || name.length > 100 || !companyName || companyName.length > 160 || (companyNameAr?.length || 0) > 160 || (phone?.length || 0) > 40 || (address?.length || 0) > 300) {
        return NextResponse.json({ error: 'Please provide valid profile information' }, { status: 400 })
      }

      await updateClientAccount(client.id, {
        companyName,
        companyNameAr: companyNameAr || undefined,
        phone: phone || undefined,
        address: address || undefined,
      })

      if (client.user && name !== client.user.name) {
        await prisma.user.update({ where: { id: client.user.id }, data: { name } })
      }
    }

    const showProfile = typeof body.showProfile === 'boolean' ? body.showProfile : existing.showProfile !== false
    const logoDataUrl = body.logoDataUrl === null ? undefined : body.logoDataUrl ?? existing.logoDataUrl

    if (logoDataUrl !== undefined) {
      const isValidDataUrl =
        typeof logoDataUrl === 'string' &&
        /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(logoDataUrl) &&
        logoDataUrl.length <= 1_400_000
      const isValidStoredUrl =
        typeof logoDataUrl === 'string' &&
        logoDataUrl.length <= 2048 &&
        (logoDataUrl.startsWith('/api/files/') || logoDataUrl.startsWith('https://'))

      if (!isValidDataUrl && !isValidStoredUrl) {
        return NextResponse.json({ error: 'Logo must be a PNG, JPEG, or WebP image smaller than 1 MB' }, { status: 400 })
      }
    }

    const storedLogoUrl = logoDataUrl
      ? await persistDataUrl(logoDataUrl, { folder: 'branding', originalName: 'client-logo' })
      : undefined

    // Lock profile on initial save as required:
    // "بعد تسجيل البيانات والحفظ في اول مره اغلاق زر التعديل مره اخري ولايمكن التعديل الا من خلال مدير النظام"
    const willLock = currentlyLocked || profile !== undefined
    const updatedSettings: PortalSettings = {
      ...(existing.legacyContactInfo ? { legacyContactInfo: existing.legacyContactInfo } : {}),
      ...(storedLogoUrl ? { logoDataUrl: storedLogoUrl } : (existing.logoDataUrl ? { logoDataUrl: existing.logoDataUrl } : {})),
      showProfile,
      profileLocked: willLock,
      lockedAt: willLock ? (existing.lockedAt || new Date().toISOString()) : undefined,
      lockedBy: willLock ? (existing.lockedBy || 'CLIENT_INITIAL_SAVE') : undefined,
    }

    await updateClientContactInfo(client.id, serializePortalSettings(updatedSettings))

    const updatedClient = await getClientAccountById(client.id)
    return NextResponse.json({
      settings: {
        logoDataUrl: updatedSettings.logoDataUrl,
        showProfile,
        profileLocked: willLock,
        lockedAt: updatedSettings.lockedAt,
      },
      client: updatedClient ? {
        companyName: updatedClient.companyName,
        companyNameAr: updatedClient.companyNameAr,
        phone: updatedClient.phone,
        address: updatedClient.address,
        user: updatedClient.user,
      } : undefined,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update profile'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 500 })
  }
}
