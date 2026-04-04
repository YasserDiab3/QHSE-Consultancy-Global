import { prisma } from '@/lib/prisma'

type TableRow = {
  table_name: string
}

type ColumnRow = {
  column_name: string
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

export function isMissingTableOrColumnError(error: unknown) {
  const message = toErrorMessage(error)

  return (
    message.includes('does not exist in the current database') ||
    message.includes('The table') ||
    message.includes('The column') ||
    message.includes('relation') ||
    message.includes('does not exist')
  )
}

async function findPublicTableName(logicalName: string) {
  const rows = await prisma.$queryRaw<TableRow[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND LOWER(table_name) = LOWER(${logicalName})
    LIMIT 1
  `

  return rows[0]?.table_name || null
}

async function getExactColumnNames(tableName: string) {
  const rows = await prisma.$queryRaw<ColumnRow[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
  `

  return rows.map((row) => row.column_name)
}

export async function ensureClientTableCompatibility() {
  const tableName = await findPublicTableName('Client')

  if (!tableName) {
    return
  }

  const columns = await getExactColumnNames(tableName)
  if (columns.includes('userId')) {
    return
  }

  await prisma.$executeRawUnsafe(`ALTER TABLE "public"."${tableName}" ADD COLUMN IF NOT EXISTS "userId" TEXT`)

  if (columns.includes('userid')) {
    await prisma.$executeRawUnsafe(
      `UPDATE "public"."${tableName}" SET "userId" = userid WHERE "userId" IS NULL AND userid IS NOT NULL`
    )
  }

  if (columns.includes('user_id')) {
    await prisma.$executeRawUnsafe(
      `UPDATE "public"."${tableName}" SET "userId" = user_id WHERE "userId" IS NULL AND user_id IS NOT NULL`
    )
  }

  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "${tableName}_userId_key" ON "public"."${tableName}" ("userId")`
  )
}

export async function ensureContactRequestTable() {
  const tableName = await findPublicTableName('ContactRequest')

  if (tableName) {
    return tableName
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "public"."ContactRequest" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "company" TEXT,
      "email" TEXT NOT NULL,
      "phone" TEXT,
      "message" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'NEW',
      "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id")
    )
  `)

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ContactRequest_email_idx" ON "public"."ContactRequest" ("email")`
  )
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ContactRequest_status_idx" ON "public"."ContactRequest" ("status")`
  )
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ContactRequest_createdat_idx" ON "public"."ContactRequest" ("createdat" DESC)`
  )

  return 'ContactRequest'
}
