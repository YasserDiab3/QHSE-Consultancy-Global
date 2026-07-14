import NextAuth, { NextAuthOptions, DefaultSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

const AUTH_SERVICE_UNAVAILABLE = 'AUTH_SERVICE_UNAVAILABLE'

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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })

          if (!user) {
            return null
          }

          const isValid = await bcrypt.compare(credentials.password, user.password)

          if (!isValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            language: user.language,
          }
        } catch (dbError: any) {
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
        role: token.role ?? 'CLIENT',
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
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
