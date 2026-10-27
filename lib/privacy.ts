/**
 * Shortens an IP address so analytics cannot identify an individual device.
 * IPv4 keeps the first three octets; IPv6 keeps the first three groups.
 */
export function anonymizeIpAddress(ipAddress?: string) {
  if (!ipAddress) return undefined

  const value = ipAddress.trim()
  if (!value) return undefined

  if (value.includes(':')) {
    const groups = value.split(':').filter(Boolean)
    if (groups.length < 3) return undefined
    return `${groups.slice(0, 3).join(':')}::`
  }

  const octets = value.split('.')
  if (octets.length !== 4 || octets.some((octet) => !/^\d{1,3}$/.test(octet))) {
    return undefined
  }

  return `${octets[0]}.${octets[1]}.${octets[2]}.0`
}
