import type { NextAuthOptions, DefaultSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { enforceRateLimit } from '@/lib/rate-limit'
import { checkAccountLockout, recordFailedAttempt, resetFailedAttempts } from '@/lib/auth-lockout'
import { is2FaEnabledForUser, issueAdmin2FaOtp, verify2FaOtp } from '@/lib/auth-2fa'
import { isEmailConfigured } from '@/lib/email'

const AUTH_SERVICE_UNAVAILABLE = 'AUTH_SERVICE_UNAVAILABLE'

if (process.env.VERCEL) {
  process.env.AUTH_TRUST_HOST = 'true'
  if (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.includes('localhost')) {
    delete process.env.NEXTAUTH_URL
  }
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      language: string
    } & DefaultSession['user']
  }

  interface User {
    id: string
    role: string
    language: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
    language?: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        otp: { label: '2FA OTP', type: 'text' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const lockoutStatus = await checkAccountLockout(credentials.email)
        if (lockoutStatus.locked) {
          throw new Error('ACCOUNT_LOCKED')
        }

        const rateLimit = await enforceRateLimit(
          request,
          { keyPrefix: 'login', limit: 8, windowMs: 15 * 60 * 1000 },
          credentials.email
        )
        if (!rateLimit.success) return null

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })

          if (!user) {
            await recordFailedAttempt(credentials.email)
            return null
          }

          const isValid = await bcrypt.compare(credentials.password, user.password)

          if (!isValid) {
            const attemptResult = await recordFailedAttempt(credentials.email)
            if (attemptResult.locked) {
              throw new Error('ACCOUNT_LOCKED')
            }
            return null
          }

          // Check if 2FA is required for this user
          const is2FaRequired = user.role === 'ADMIN' && (await is2FaEnabledForUser(user.email))
          if (is2FaRequired) {
            const rawOtp = (credentials as any)?.otp?.trim()
            const hasSubmittedOtp = Boolean(
              rawOtp && rawOtp !== 'undefined' && rawOtp !== 'null' && rawOtp !== ''
            )

            if (!hasSubmittedOtp) {
              if (user.twoFactorSecret) {
                // User has Authenticator app (TOTP) active.
                // Optionally dispatch email OTP if SMTP is available, but do not block if unconfigured.
                if (isEmailConfigured()) {
                  issueAdmin2FaOtp(user.email, user.language).catch(() => {})
                }
                throw new Error('2FA_REQUIRED')
              } else {
                const otpResult = await issueAdmin2FaOtp(user.email, user.language)
                if (!otpResult.smtpConfigured) {
                  throw new Error('2FA_SMTP_NOT_CONFIGURED')
                }
                throw new Error('2FA_REQUIRED')
              }
            }

            const isValidOtp = await verify2FaOtp(user.email, rawOtp)
            if (!isValidOtp) {
              throw new Error('INVALID_2FA_CODE')
            }
          }

          await resetFailedAttempts(credentials.email)

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            language: user.language,
          }
        } catch (dbError: any) {
          if (
            dbError?.message === 'ACCOUNT_LOCKED' ||
            dbError?.message === '2FA_REQUIRED' ||
            dbError?.message?.startsWith('2FA_REQUIRED_DEV:') ||
            dbError?.message === 'INVALID_2FA_CODE'
          ) {
            throw dbError
          }
          console.error('Credentials authorization failed:', dbError?.message || dbError)
          throw new Error(AUTH_SERVICE_UNAVAILABLE)
        }
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google' || !user.email) {
        return true
      }

      try {
        const existingUser = await prisma.user.findUnique({ where: { email: user.email } })
        const appUser = existingUser ?? await prisma.user.create({
          data: {
            name: user.name?.trim() || user.email.split('@')[0],
            email: user.email,
            password: await bcrypt.hash(randomUUID(), 12),
            role: 'TRAINEE',
            language: 'en',
          },
        })

        user.id = appUser.id
        ;(user as typeof user & { role?: string; language?: string }).role = appUser.role
        ;(user as typeof user & { role?: string; language?: string }).language = appUser.language
        return true
      } catch (error) {
        console.error('Google sign-in failed:', error)
        return false
      }
    },
    async jwt({ token, user }) {
      if (user) {
        const appUser = user.email
          ? await prisma.user.findUnique({ where: { email: user.email } })
          : null
        token.id = appUser?.id ?? user.id
        token.role = appUser?.role ?? user.role ?? 'TRAINEE'
        token.language = appUser?.language ?? user.language ?? 'en'
        token.name = appUser?.name ?? user.name
        token.email = appUser?.email ?? user.email
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id ?? '',
        role: token.role ?? 'TRAINEE',
        language: token.language ?? 'en',
        name: token.name ?? session.user?.name ?? null,
        email: token.email ?? session.user?.email ?? null,
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (url.startsWith(baseUrl)) return url
      return `${baseUrl}/dashboard`
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}
