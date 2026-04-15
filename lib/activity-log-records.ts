import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type ColumnRow = {
  table_name: string
  column_name: string
}

type ActivityLogSchemaInfo = {
  activityLogTable: string
  userTable: string
  activityLog: {
    id: string
    userId: string
    action: string
    entityType: string | null
    entityId: string | null
    details: string | null
    ipAddress: string | null
    createdAt: string | null
  }
  user: {
    id: string
    name: string | null
    email: string | null
    role: string | null
  }
}

type CreateActivityLogInput = {
  userId: string
  action: string
  entityType?: string
  entityId?: string
  details?: string
  ipAddress?: string
}

type RawActivityLogRow = {
  id: string
  action: string
  entityType: string | null
  entityId: string | null
  details: string | null
  ipAddress: string | null
  createdAt: Date | string | null
  userId: string
  userName: string | null
  userEmail: string | null
  userRole: string | null
}

let schemaInfoPromise: Promise<ActivityLogSchemaInfo> | null = null

function escapeSqlString(value: string) {
  return value.replace(/'/g, "''")
}

function sqlValue(value?: string | null) {
  if (value == null || value === '') {
    return 'NULL'
  }

  return `'${escapeSqlString(value)}'`
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`
}

function normalizeIdentifier(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function resolveTableName(rows: ColumnRow[], candidates: string[], label: string) {
  const row = rows.find((entry) =>
    candidates.some((candidate) => normalizeIdentifier(entry.table_name) === normalizeIdentifier(candidate))
  )

  if (!row) {
    throw new Error(`${label} table is missing in the current database`)
  }

  return row.table_name
}

function resolveRequiredColumn(columns: string[], candidates: string[], label: string) {
  const column = columns.find((entry) =>
    candidates.some((candidate) => normalizeIdentifier(entry) === normalizeIdentifier(candidate))
  )

  if (!column) {
    throw new Error(`${label} column is missing in the current database`)
  }

  return column
}

function resolveOptionalColumn(columns: string[], candidates: string[]) {
  return (
    columns.find((entry) =>
      candidates.some((candidate) => normalizeIdentifier(entry) === normalizeIdentifier(candidate))
    ) ?? null
  )
}

function selectExpr(tableAlias: string, column: string | null, alias: string) {
  return column
    ? `${tableAlias}.${quoteIdentifier(column)} AS "${alias}"`
    : `NULL::text AS "${alias}"`
}

async function loadSchemaInfo(): Promise<ActivityLogSchemaInfo> {
  const rows = await prisma.$queryRaw<ColumnRow[]>(Prisma.sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND lower(table_name) IN (${Prisma.join(['activitylog', 'user'])})
  `)

  const activityLogTable = resolveTableName(rows, ['ActivityLog', 'activitylog'], 'Activity log')
  const userTable = resolveTableName(rows, ['User', 'user'], 'User')

  const getColumnsForTable = (tableName: string) =>
    rows.filter((entry) => entry.table_name === tableName).map((entry) => entry.column_name)

  const activityLogColumns = getColumnsForTable(activityLogTable)
  const userColumns = getColumnsForTable(userTable)

  return {
    activityLogTable,
    userTable,
    activityLog: {
      id: resolveRequiredColumn(activityLogColumns, ['id'], 'Activity log id'),
      userId: resolveRequiredColumn(activityLogColumns, ['userId', 'user_id', 'userid'], 'Activity log user reference'),
      action: resolveRequiredColumn(activityLogColumns, ['action'], 'Activity action'),
      entityType: resolveOptionalColumn(activityLogColumns, ['entityType', 'entity_type', 'entitytype']),
      entityId: resolveOptionalColumn(activityLogColumns, ['entityId', 'entity_id', 'entityid']),
      details: resolveOptionalColumn(activityLogColumns, ['details', 'detail']),
      ipAddress: resolveOptionalColumn(activityLogColumns, ['ipAddress', 'ip_address', 'ipaddress']),
      createdAt: resolveOptionalColumn(activityLogColumns, ['createdAt', 'created_at', 'createdat']),
    },
    user: {
      id: resolveRequiredColumn(userColumns, ['id'], 'User id'),
      name: resolveOptionalColumn(userColumns, ['name']),
      email: resolveOptionalColumn(userColumns, ['email']),
      role: resolveOptionalColumn(userColumns, ['role']),
    },
  }
}

async function getSchemaInfo() {
  if (!schemaInfoPromise) {
    schemaInfoPromise = loadSchemaInfo().catch((error) => {
      schemaInfoPromise = null
      throw error
    })
  }

  return schemaInfoPromise
}

export async function createActivityLogRecord(input: CreateActivityLogInput) {
  const schema = await getSchemaInfo()
  const activityLogId = randomUUID()

  const columns = [schema.activityLog.id, schema.activityLog.userId, schema.activityLog.action]
  const values = [sqlValue(activityLogId), sqlValue(input.userId), sqlValue(input.action)]

  if (schema.activityLog.entityType) {
    columns.push(schema.activityLog.entityType)
    values.push(sqlValue(input.entityType))
  }
  if (schema.activityLog.entityId) {
    columns.push(schema.activityLog.entityId)
    values.push(sqlValue(input.entityId))
  }
  if (schema.activityLog.details) {
    columns.push(schema.activityLog.details)
    values.push(sqlValue(input.details))
  }
  if (schema.activityLog.ipAddress) {
    columns.push(schema.activityLog.ipAddress)
    values.push(sqlValue(input.ipAddress))
  }
  if (schema.activityLog.createdAt) {
    columns.push(schema.activityLog.createdAt)
    values.push('CURRENT_TIMESTAMP')
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO ${quoteIdentifier(schema.activityLogTable)} (
      ${columns.map(quoteIdentifier).join(', ')}
    ) VALUES (
      ${values.join(', ')}
    )
  `)

  return activityLogId
}

export async function listActivityLogRecords(take = 100) {
  const schema = await getSchemaInfo()

  const rows = await prisma.$queryRawUnsafe<RawActivityLogRow[]>(`
    SELECT
      a.${quoteIdentifier(schema.activityLog.id)} AS "id",
      a.${quoteIdentifier(schema.activityLog.action)} AS "action",
      ${selectExpr('a', schema.activityLog.entityType, 'entityType')},
      ${selectExpr('a', schema.activityLog.entityId, 'entityId')},
      ${selectExpr('a', schema.activityLog.details, 'details')},
      ${selectExpr('a', schema.activityLog.ipAddress, 'ipAddress')},
      ${
        schema.activityLog.createdAt
          ? `a.${quoteIdentifier(schema.activityLog.createdAt)} AS "createdAt"`
          : 'CURRENT_TIMESTAMP AS "createdAt"'
      },
      a.${quoteIdentifier(schema.activityLog.userId)} AS "userId",
      ${selectExpr('u', schema.user.name, 'userName')},
      ${selectExpr('u', schema.user.email, 'userEmail')},
      ${selectExpr('u', schema.user.role, 'userRole')}
    FROM ${quoteIdentifier(schema.activityLogTable)} a
    LEFT JOIN ${quoteIdentifier(schema.userTable)} u
      ON a.${quoteIdentifier(schema.activityLog.userId)} = u.${quoteIdentifier(schema.user.id)}
    ORDER BY ${
      schema.activityLog.createdAt
        ? `a.${quoteIdentifier(schema.activityLog.createdAt)} DESC`
        : `a.${quoteIdentifier(schema.activityLog.id)} DESC`
    }
    LIMIT ${Number(take) || 100}
  `)

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType ?? undefined,
    entityId: row.entityId ?? undefined,
    details: row.details ?? undefined,
    ipAddress: row.ipAddress ?? undefined,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt || new Date().toISOString(),
    user: {
      name: row.userName || 'Unknown User',
      email: row.userEmail || '-',
      role: row.userRole || '-',
    },
  }))
}
