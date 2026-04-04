import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type ColumnRow = {
  table_name: string
  column_name: string
}

type RawReportRow = {
  id: string
  date: Date | string
  siteName: string
  siteNameAr: string | null
  category: string
  status: string
  notes: string | null
  notesAr: string | null
  consultantId: string | null
  clientId: string
  clientCompanyName: string | null
  clientUserEmail: string | null
  consultantName: string | null
}

type ReportSchemaInfo = {
  reportTable: string
  clientTable: string
  userTable: string
  report: {
    id: string
    clientId: string
    date: string
    siteName: string
    siteNameAr: string | null
    category: string
    consultantId: string | null
    notes: string | null
    notesAr: string | null
    status: string | null
    createdAt: string | null
    updatedAt: string | null
  }
  client: {
    id: string
    companyName: string | null
    userId: string | null
  }
  user: {
    id: string
    email: string | null
    name: string | null
  }
}

type ListReportOptions = {
  id?: string
  clientId?: string
  status?: string | null
  category?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  riskLevel?: string | null
  take?: number
}

type CreateReportInput = {
  clientId: string
  date: string
  siteName: string
  siteNameAr?: string
  category: string
  consultantId?: string
  notes?: string
  notesAr?: string
  status?: string
}

type UpdateReportInput = {
  date?: string
  siteName?: string
  siteNameAr?: string
  category?: string
  consultantId?: string
  notes?: string
  notesAr?: string
  status?: string
}

let schemaInfoPromise: Promise<ReportSchemaInfo> | null = null

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

async function loadSchemaInfo(): Promise<ReportSchemaInfo> {
  const rows = await prisma.$queryRaw<ColumnRow[]>(Prisma.sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND lower(table_name) IN (${Prisma.join(['report', 'client', 'user'])})
  `)

  const reportTable = resolveTableName(rows, ['Report', 'report'], 'Report')
  const clientTable = resolveTableName(rows, ['Client', 'client'], 'Client')
  const userTable = resolveTableName(rows, ['User', 'user'], 'User')

  const getColumnsForTable = (tableName: string) =>
    rows.filter((entry) => entry.table_name === tableName).map((entry) => entry.column_name)

  const reportColumns = getColumnsForTable(reportTable)
  const clientColumns = getColumnsForTable(clientTable)
  const userColumns = getColumnsForTable(userTable)

  return {
    reportTable,
    clientTable,
    userTable,
    report: {
      id: resolveRequiredColumn(reportColumns, ['id'], 'Report id'),
      clientId: resolveRequiredColumn(reportColumns, ['clientId', 'client_id', 'clientid'], 'Report client reference'),
      date: resolveRequiredColumn(reportColumns, ['date', 'visitDate', 'visit_date'], 'Report date'),
      siteName: resolveRequiredColumn(reportColumns, ['siteName', 'site_name', 'sitename'], 'Report site name'),
      siteNameAr: resolveOptionalColumn(reportColumns, ['siteNameAr', 'site_name_ar', 'sitenamear']),
      category: resolveRequiredColumn(reportColumns, ['category'], 'Report category'),
      consultantId: resolveOptionalColumn(reportColumns, ['consultantId', 'consultant_id', 'consultantid']),
      notes: resolveOptionalColumn(reportColumns, ['notes', 'note']),
      notesAr: resolveOptionalColumn(reportColumns, ['notesAr', 'notes_ar', 'notesar']),
      status: resolveOptionalColumn(reportColumns, ['status']),
      createdAt: resolveOptionalColumn(reportColumns, ['createdAt', 'created_at', 'createdat']),
      updatedAt: resolveOptionalColumn(reportColumns, ['updatedAt', 'updated_at', 'updatedat']),
    },
    client: {
      id: resolveRequiredColumn(clientColumns, ['id'], 'Client id'),
      companyName: resolveOptionalColumn(clientColumns, ['companyName', 'company_name', 'companyname']),
      userId: resolveOptionalColumn(clientColumns, ['userId', 'user_id', 'userid']),
    },
    user: {
      id: resolveRequiredColumn(userColumns, ['id'], 'User id'),
      email: resolveOptionalColumn(userColumns, ['email']),
      name: resolveOptionalColumn(userColumns, ['name']),
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

async function loadObservations(reportIds: string[]) {
  if (reportIds.length === 0) {
    return new Map<string, any[]>()
  }

  try {
    const observations = await prisma.observation.findMany({
      where: {
        reportId: {
          in: reportIds,
        },
      },
      include: {
        images: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    })

    const grouped = new Map<string, any[]>()
    for (const observation of observations) {
      const current = grouped.get(observation.reportId) ?? []
      current.push(observation)
      grouped.set(observation.reportId, current)
    }

    return grouped
  } catch (error) {
    console.error('Failed to load report observations:', error)
    return new Map<string, any[]>()
  }
}

function mapReportRow(row: RawReportRow, observationsByReportId: Map<string, any[]>) {
  return {
    id: row.id,
    date: row.date instanceof Date ? row.date.toISOString() : row.date,
    siteName: row.siteName,
    siteNameAr: row.siteNameAr ?? undefined,
    category: row.category,
    status: row.status,
    notes: row.notes ?? undefined,
    notesAr: row.notesAr ?? undefined,
    consultantId: row.consultantId ?? undefined,
    observations: observationsByReportId.get(row.id) ?? [],
    client: {
      id: row.clientId,
      companyName: row.clientCompanyName ?? undefined,
      user: row.clientUserEmail ? { email: row.clientUserEmail } : undefined,
    },
    consultant: row.consultantName ? { name: row.consultantName } : undefined,
  }
}

export async function listReportRecords(options: ListReportOptions = {}) {
  const schema = await getSchemaInfo()

  const conditions: string[] = []

  if (options.id) {
    conditions.push(`r.${quoteIdentifier(schema.report.id)} = ${sqlValue(options.id)}`)
  }
  if (options.clientId) {
    conditions.push(`r.${quoteIdentifier(schema.report.clientId)} = ${sqlValue(options.clientId)}`)
  }
  if (options.status && schema.report.status) {
    conditions.push(`r.${quoteIdentifier(schema.report.status)} = ${sqlValue(options.status)}`)
  }
  if (options.category) {
    conditions.push(`r.${quoteIdentifier(schema.report.category)} = ${sqlValue(options.category)}`)
  }
  if (options.dateFrom) {
    conditions.push(`r.${quoteIdentifier(schema.report.date)} >= ${sqlValue(new Date(options.dateFrom).toISOString())}`)
  }
  if (options.dateTo) {
    conditions.push(`r.${quoteIdentifier(schema.report.date)} <= ${sqlValue(new Date(options.dateTo).toISOString())}`)
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const limitClause = options.take ? `LIMIT ${options.take}` : ''

  const rows = await prisma.$queryRawUnsafe<RawReportRow[]>(`
    SELECT
      r.${quoteIdentifier(schema.report.id)} AS "id",
      r.${quoteIdentifier(schema.report.date)} AS "date",
      r.${quoteIdentifier(schema.report.siteName)} AS "siteName",
      ${selectExpr('r', schema.report.siteNameAr, 'siteNameAr')},
      r.${quoteIdentifier(schema.report.category)} AS "category",
      ${schema.report.status ? `r.${quoteIdentifier(schema.report.status)}` : `'OPEN'`} AS "status",
      ${selectExpr('r', schema.report.notes, 'notes')},
      ${selectExpr('r', schema.report.notesAr, 'notesAr')},
      ${selectExpr('r', schema.report.consultantId, 'consultantId')},
      c.${quoteIdentifier(schema.client.id)} AS "clientId",
      ${selectExpr('c', schema.client.companyName, 'clientCompanyName')},
      ${selectExpr('cu', schema.user.email, 'clientUserEmail')},
      ${selectExpr('consultantUser', schema.user.name, 'consultantName')}
    FROM ${quoteIdentifier(schema.reportTable)} r
    INNER JOIN ${quoteIdentifier(schema.clientTable)} c
      ON r.${quoteIdentifier(schema.report.clientId)} = c.${quoteIdentifier(schema.client.id)}
    LEFT JOIN ${quoteIdentifier(schema.userTable)} cu
      ON ${schema.client.userId ? `c.${quoteIdentifier(schema.client.userId)} = cu.${quoteIdentifier(schema.user.id)}` : '1 = 0'}
    LEFT JOIN ${quoteIdentifier(schema.userTable)} consultantUser
      ON ${schema.report.consultantId ? `r.${quoteIdentifier(schema.report.consultantId)} = consultantUser.${quoteIdentifier(schema.user.id)}` : '1 = 0'}
    ${whereClause}
    ORDER BY r.${quoteIdentifier(schema.report.date)} DESC
    ${limitClause}
  `)

  const observationsByReportId = await loadObservations(rows.map((row) => row.id))
  const mapped = rows.map((row) => mapReportRow(row, observationsByReportId))

  if (!options.riskLevel) {
    return mapped
  }

  const acceptedRiskLevels = options.riskLevel
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return mapped.filter((report) =>
    report.observations.some((observation) => acceptedRiskLevels.includes(observation.riskLevel))
  )
}

export async function getReportRecordById(id: string) {
  const reports = await listReportRecords({ id })
  return reports[0] ?? null
}

export async function createReportRecord(input: CreateReportInput) {
  const schema = await getSchemaInfo()
  const reportId = randomUUID()

  const columns = [
    schema.report.id,
    schema.report.clientId,
    schema.report.date,
    schema.report.siteName,
    schema.report.category,
  ]
  const values = [
    sqlValue(reportId),
    sqlValue(input.clientId),
    sqlValue(new Date(input.date).toISOString()),
    sqlValue(input.siteName),
    sqlValue(input.category),
  ]

  if (schema.report.siteNameAr) {
    columns.push(schema.report.siteNameAr)
    values.push(sqlValue(input.siteNameAr))
  }
  if (schema.report.status) {
    columns.push(schema.report.status)
    values.push(sqlValue(input.status || 'OPEN'))
  }
  if (schema.report.consultantId) {
    columns.push(schema.report.consultantId)
    values.push(sqlValue(input.consultantId))
  }
  if (schema.report.notes) {
    columns.push(schema.report.notes)
    values.push(sqlValue(input.notes))
  }
  if (schema.report.notesAr) {
    columns.push(schema.report.notesAr)
    values.push(sqlValue(input.notesAr))
  }
  if (schema.report.createdAt) {
    columns.push(schema.report.createdAt)
    values.push('CURRENT_TIMESTAMP')
  }
  if (schema.report.updatedAt) {
    columns.push(schema.report.updatedAt)
    values.push('CURRENT_TIMESTAMP')
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO ${quoteIdentifier(schema.reportTable)} (
      ${columns.map(quoteIdentifier).join(', ')}
    ) VALUES (
      ${values.join(', ')}
    )
  `)

  return reportId
}

export async function updateReportRecord(id: string, input: UpdateReportInput) {
  const schema = await getSchemaInfo()
  const updates: string[] = []

  if (input.date) {
    updates.push(`${quoteIdentifier(schema.report.date)} = ${sqlValue(new Date(input.date).toISOString())}`)
  }
  if (typeof input.siteName !== 'undefined') {
    updates.push(`${quoteIdentifier(schema.report.siteName)} = ${sqlValue(input.siteName)}`)
  }
  if (schema.report.siteNameAr && typeof input.siteNameAr !== 'undefined') {
    updates.push(`${quoteIdentifier(schema.report.siteNameAr)} = ${sqlValue(input.siteNameAr)}`)
  }
  if (typeof input.category !== 'undefined') {
    updates.push(`${quoteIdentifier(schema.report.category)} = ${sqlValue(input.category)}`)
  }
  if (schema.report.consultantId && typeof input.consultantId !== 'undefined') {
    updates.push(`${quoteIdentifier(schema.report.consultantId)} = ${sqlValue(input.consultantId)}`)
  }
  if (schema.report.notes && typeof input.notes !== 'undefined') {
    updates.push(`${quoteIdentifier(schema.report.notes)} = ${sqlValue(input.notes)}`)
  }
  if (schema.report.notesAr && typeof input.notesAr !== 'undefined') {
    updates.push(`${quoteIdentifier(schema.report.notesAr)} = ${sqlValue(input.notesAr)}`)
  }
  if (schema.report.status && typeof input.status !== 'undefined') {
    updates.push(`${quoteIdentifier(schema.report.status)} = ${sqlValue(input.status)}`)
  }
  if (schema.report.updatedAt) {
    updates.push(`${quoteIdentifier(schema.report.updatedAt)} = CURRENT_TIMESTAMP`)
  }

  if (updates.length === 0) {
    return
  }

  await prisma.$executeRawUnsafe(`
    UPDATE ${quoteIdentifier(schema.reportTable)}
    SET ${updates.join(', ')}
    WHERE ${quoteIdentifier(schema.report.id)} = ${sqlValue(id)}
  `)
}

export async function deleteReportRecord(id: string) {
  const schema = await getSchemaInfo()

  await prisma.$executeRawUnsafe(`
    DELETE FROM ${quoteIdentifier(schema.reportTable)}
    WHERE ${quoteIdentifier(schema.report.id)} = ${sqlValue(id)}
  `)
}
