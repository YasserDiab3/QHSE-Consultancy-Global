import NextAuth, { NextAuthOptions, DefaultSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

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
          throw new Error('Email and password are required')
        }

        let user
        try {
          user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })
        } catch (dbError: any) {
          console.error('Database connection error:', dbError.message)
          throw new Error('Database connection error. Please try again later.')
        }

        if (!user) {
          throw new Error('Invalid email or password')
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          throw new Error('Invalid email or password')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          language: user.language,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.language = user.language
        token.name = user.name
        token.email = user.email
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
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
