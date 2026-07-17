import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClientAccountById, getClientIdByUserId, updateClientAccount, updateClientContactInfo } from '@/lib/client-records'

export const dynamic = 'force-dynamic'

type PortalSettings = { logoDataUrl?: string; showProfile?: boolean; legacyContactInfo?: string }
const PROFILE_PREFIX = 'QHSSE_PORTAL_PROFILE:'

function readSettings(value?: string) : PortalSettings {
  if (!value?.startsWith(PROFILE_PREFIX)) return value ? { legacyContactInfo: value } : {}
  try { return JSON.parse(value.slice(PROFILE_PREFIX.length)) as PortalSettings } catch { return {} }
}

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
    const { client } = await currentClient()
    const settings = readSettings(client.contactInfo)
    return NextResponse.json({
      client: {
        id: client.id,
        companyName: client.companyName,
        companyNameAr: client.companyNameAr,
        phone: client.phone,
        address: client.address,
        user: client.user,
      },
      settings: { logoDataUrl: settings.logoDataUrl, showProfile: settings.showProfile !== false },
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
    const existing = readSettings(client.contactInfo)
    const profile = body.profile

    if (profile !== undefined) {
      const name = typeof profile.name === 'string' ? profile.name.trim() : client.user.name
      const companyName = typeof profile.companyName === 'string' ? profile.companyName.trim() : client.companyName
      const companyNameAr = typeof profile.companyNameAr === 'string' ? profile.companyNameAr.trim() : client.companyNameAr
      const phone = typeof profile.phone === 'string' ? profile.phone.trim() : client.phone
      const address = typeof profile.address === 'string' ? profile.address.trim() : client.address
      if (!name || name.length > 100 || !companyName || companyName.length > 160 || (companyNameAr?.length || 0) > 160 || (phone?.length || 0) > 40 || (address?.length || 0) > 300) {
        return NextResponse.json({ error: 'Please provide valid profile information' }, { status: 400 })
      }
      await updateClientAccount(client.id, { companyName, companyNameAr: companyNameAr || undefined, phone: phone || undefined, address: address || undefined })
      if (name !== client.user.name) await prisma.user.update({ where: { id: client.user.id }, data: { name } })
    }
    const showProfile = typeof body.showProfile === 'boolean' ? body.showProfile : existing.showProfile !== false
    const logoDataUrl = body.logoDataUrl === null ? undefined : body.logoDataUrl ?? existing.logoDataUrl

    if (logoDataUrl !== undefined && (typeof logoDataUrl !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(logoDataUrl) || logoDataUrl.length > 1_400_000)) {
      return NextResponse.json({ error: 'Logo must be a PNG, JPEG, or WebP image smaller than 1 MB' }, { status: 400 })
    }

    await updateClientContactInfo(client.id, `${PROFILE_PREFIX}${JSON.stringify({
      ...(existing.legacyContactInfo ? { legacyContactInfo: existing.legacyContactInfo } : {}),
      ...(logoDataUrl ? { logoDataUrl } : {}),
      showProfile,
    })}`)

    const updatedClient = await getClientAccountById(client.id)
    return NextResponse.json({ settings: { logoDataUrl, showProfile }, client: updatedClient ? { companyName: updatedClient.companyName, companyNameAr: updatedClient.companyNameAr, phone: updatedClient.phone, address: updatedClient.address, user: updatedClient.user } : undefined })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update profile'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 500 })
  }
}
