import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type RawClientRow = {
  id: string
  companyName: string
  companyNameAr: string | null
  phone: string | null
  address: string | null
  contactInfo: string | null
  userId: string
  userName: string
  userEmail: string
  userRole: string
  reportsCount?: number | bigint | string | null
}

type ColumnRow = {
  table_name: string
  column_name: string
}

type SchemaInfo = {
  clientTable: string
  userTable: string
  reportTable: string | null
  client: {
    id: string
    userId: string
    companyName: string
    companyNameAr: string | null
    phone: string | null
    address: string | null
    contactInfo: string | null
    createdAt: string | null
    updatedAt: string | null
  }
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  report: {
    clientId: string | null
  }
}

let schemaInfoPromise: Promise<SchemaInfo> | null = null

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

function selectExpr(tableAlias: string, column: string | null, alias: string) {
  return column
    ? `${tableAlias}.${quoteIdentifier(column)} AS "${alias}"`
    : `NULL::text AS "${alias}"`
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

async function loadSchemaInfo(): Promise<SchemaInfo> {
  const rows = await prisma.$queryRaw<ColumnRow[]>(Prisma.sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND lower(table_name) IN (${Prisma.join(['client', 'user', 'report'])})
  `)

  const clientTable = resolveTableName(rows, ['Client', 'client'], 'Client')
  const userTable = resolveTableName(rows, ['User', 'user'], 'User')
  const reportTable =
    rows.find((entry) => normalizeIdentifier(entry.table_name) === normalizeIdentifier('Report'))?.table_name ?? null

  const getColumnsForTable = (tableName: string | null) =>
    tableName
      ? rows
          .filter((entry) => entry.table_name === tableName)
          .map((entry) => entry.column_name)
      : []

  const clientColumns = getColumnsForTable(clientTable)
  const userColumns = getColumnsForTable(userTable)
  const reportColumns = getColumnsForTable(reportTable)

  return {
    clientTable,
    userTable,
    reportTable,
    client: {
      id: resolveRequiredColumn(clientColumns, ['id'], 'Client id'),
      userId: resolveRequiredColumn(clientColumns, ['userId', 'user_id', 'userid'], 'Client user reference'),
      companyName: resolveRequiredColumn(
        clientColumns,
        ['companyName', 'company_name', 'companyname'],
        'Client company name'
      ),
      companyNameAr: resolveOptionalColumn(clientColumns, [
        'companyNameAr',
        'company_name_ar',
        'companynamear',
      ]),
      phone: resolveOptionalColumn(clientColumns, ['phone', 'phone_number', 'phonenumber']),
      address: resolveOptionalColumn(clientColumns, ['address', 'clientAddress', 'client_address']),
      contactInfo: resolveOptionalColumn(clientColumns, ['contactInfo', 'contact_info', 'contactinfo']),
      createdAt: resolveOptionalColumn(clientColumns, ['createdAt', 'created_at', 'createdat']),
      updatedAt: resolveOptionalColumn(clientColumns, ['updatedAt', 'updated_at', 'updatedat']),
    },
    user: {
      id: resolveRequiredColumn(userColumns, ['id'], 'User id'),
      name: resolveRequiredColumn(userColumns, ['name'], 'User name'),
      email: resolveRequiredColumn(userColumns, ['email'], 'User email'),
      role: resolveRequiredColumn(userColumns, ['role'], 'User role'),
    },
    report: {
      clientId: resolveOptionalColumn(reportColumns, ['clientId', 'client_id', 'clientid']),
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

function mapClientRow(row: RawClientRow) {
  return {
    id: row.id,
    companyName: row.companyName,
    companyNameAr: row.companyNameAr ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    contactInfo: row.contactInfo ?? undefined,
    userId: row.userId,
    user: {
      id: row.userId,
      name: row.userName,
      email: row.userEmail,
      role: row.userRole,
    },
    _count: {
      reports: Number(row.reportsCount ?? 0),
    },
  }
}

export async function listClientAccounts() {
  const schema = await getSchemaInfo()

  const reportsCountExpr =
    schema.reportTable && schema.report.clientId
      ? `(SELECT COUNT(*) FROM ${quoteIdentifier(schema.reportTable)} r WHERE r.${quoteIdentifier(schema.report.clientId)} = c.${quoteIdentifier(schema.client.id)}) AS "reportsCount"`
      : `0::bigint AS "reportsCount"`

  const orderByColumn = schema.client.createdAt ?? schema.client.updatedAt ?? schema.client.id

  const rows = await prisma.$queryRawUnsafe<RawClientRow[]>(`
    SELECT
      c.${quoteIdentifier(schema.client.id)} AS "id",
      c.${quoteIdentifier(schema.client.companyName)} AS "companyName",
      ${selectExpr('c', schema.client.companyNameAr, 'companyNameAr')},
      ${selectExpr('c', schema.client.phone, 'phone')},
      ${selectExpr('c', schema.client.address, 'address')},
      ${selectExpr('c', schema.client.contactInfo, 'contactInfo')},
      u.${quoteIdentifier(schema.user.id)} AS "userId",
      u.${quoteIdentifier(schema.user.name)} AS "userName",
      u.${quoteIdentifier(schema.user.email)} AS "userEmail",
      u.${quoteIdentifier(schema.user.role)} AS "userRole",
      ${reportsCountExpr}
    FROM ${quoteIdentifier(schema.clientTable)} c
    INNER JOIN ${quoteIdentifier(schema.userTable)} u
      ON c.${quoteIdentifier(schema.client.userId)} = u.${quoteIdentifier(schema.user.id)}
    ORDER BY c.${quoteIdentifier(orderByColumn)} DESC
  `)

  return rows.map(mapClientRow)
}

export async function getClientAccountById(id: string) {
  const schema = await getSchemaInfo()

  const reportsCountExpr =
    schema.reportTable && schema.report.clientId
      ? `(SELECT COUNT(*) FROM ${quoteIdentifier(schema.reportTable)} r WHERE r.${quoteIdentifier(schema.report.clientId)} = c.${quoteIdentifier(schema.client.id)}) AS "reportsCount"`
      : `0::bigint AS "reportsCount"`

  const rows = await prisma.$queryRawUnsafe<RawClientRow[]>(`
    SELECT
      c.${quoteIdentifier(schema.client.id)} AS "id",
      c.${quoteIdentifier(schema.client.companyName)} AS "companyName",
      ${selectExpr('c', schema.client.companyNameAr, 'companyNameAr')},
      ${selectExpr('c', schema.client.phone, 'phone')},
      ${selectExpr('c', schema.client.address, 'address')},
      ${selectExpr('c', schema.client.contactInfo, 'contactInfo')},
      u.${quoteIdentifier(schema.user.id)} AS "userId",
      u.${quoteIdentifier(schema.user.name)} AS "userName",
      u.${quoteIdentifier(schema.user.email)} AS "userEmail",
      u.${quoteIdentifier(schema.user.role)} AS "userRole",
      ${reportsCountExpr}
    FROM ${quoteIdentifier(schema.clientTable)} c
    INNER JOIN ${quoteIdentifier(schema.userTable)} u
      ON c.${quoteIdentifier(schema.client.userId)} = u.${quoteIdentifier(schema.user.id)}
    WHERE c.${quoteIdentifier(schema.client.id)} = ${sqlValue(id)}
    LIMIT 1
  `)

  return rows[0] ? mapClientRow(rows[0]) : null
}

export async function getClientIdByUserId(userId: string) {
  const schema = await getSchemaInfo()

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
    SELECT c.${quoteIdentifier(schema.client.id)} AS "id"
    FROM ${quoteIdentifier(schema.clientTable)} c
    WHERE c.${quoteIdentifier(schema.client.userId)} = ${sqlValue(userId)}
    LIMIT 1
  `)

  return rows[0]?.id ?? null
}

export async function createClientAccount(input: {
  userId: string
  companyName: string
  companyNameAr?: string
  phone?: string
  address?: string
}) {
  const schema = await getSchemaInfo()
  const clientId = randomUUID()

  const columns = [schema.client.id, schema.client.userId, schema.client.companyName]
  const values = [sqlValue(clientId), sqlValue(input.userId), sqlValue(input.companyName)]

  if (schema.client.companyNameAr) {
    columns.push(schema.client.companyNameAr)
    values.push(sqlValue(input.companyNameAr))
  }

  if (schema.client.phone) {
    columns.push(schema.client.phone)
    values.push(sqlValue(input.phone))
  }

  if (schema.client.address) {
    columns.push(schema.client.address)
    values.push(sqlValue(input.address))
  }

  if (schema.client.createdAt) {
    columns.push(schema.client.createdAt)
    values.push('CURRENT_TIMESTAMP')
  }

  if (schema.client.updatedAt) {
    columns.push(schema.client.updatedAt)
    values.push('CURRENT_TIMESTAMP')
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO ${quoteIdentifier(schema.clientTable)} (
      ${columns.map(quoteIdentifier).join(', ')}
    ) VALUES (
      ${values.join(', ')}
    )
  `)

  return clientId
}

export async function updateClientAccount(
  clientId: string,
  input: {
    companyName: string
    companyNameAr?: string
    phone?: string
    address?: string
  }
) {
  const schema = await getSchemaInfo()

  const updates = [`${quoteIdentifier(schema.client.companyName)} = ${sqlValue(input.companyName)}`]

  if (schema.client.companyNameAr) {
    updates.push(`${quoteIdentifier(schema.client.companyNameAr)} = ${sqlValue(input.companyNameAr)}`)
  }

  if (schema.client.phone) {
    updates.push(`${quoteIdentifier(schema.client.phone)} = ${sqlValue(input.phone)}`)
  }

  if (schema.client.address) {
    updates.push(`${quoteIdentifier(schema.client.address)} = ${sqlValue(input.address)}`)
  }

  if (schema.client.updatedAt) {
    updates.push(`${quoteIdentifier(schema.client.updatedAt)} = CURRENT_TIMESTAMP`)
  }

  await prisma.$executeRawUnsafe(`
    UPDATE ${quoteIdentifier(schema.clientTable)}
    SET ${updates.join(', ')}
    WHERE ${quoteIdentifier(schema.client.id)} = ${sqlValue(clientId)}
  `)
}

export async function updateClientContactInfo(clientId: string, contactInfo: string) {
  const schema = await getSchemaInfo()
  if (!schema.client.contactInfo) {
    throw new Error('Client contact information is not available in the current database')
  }

  const updates = [`${quoteIdentifier(schema.client.contactInfo)} = ${sqlValue(contactInfo)}`]
  if (schema.client.updatedAt) {
    updates.push(`${quoteIdentifier(schema.client.updatedAt)} = CURRENT_TIMESTAMP`)
  }

  await prisma.$executeRawUnsafe(`
    UPDATE ${quoteIdentifier(schema.clientTable)}
    SET ${updates.join(', ')}
    WHERE ${quoteIdentifier(schema.client.id)} = ${sqlValue(clientId)}
  `)
}

export async function deleteClientAccount(clientId: string) {
  const schema = await getSchemaInfo()

  await prisma.$executeRawUnsafe(`
    DELETE FROM ${quoteIdentifier(schema.clientTable)}
    WHERE ${quoteIdentifier(schema.client.id)} = ${sqlValue(clientId)}
  `)
}
