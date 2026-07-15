import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type ColumnRow = {
  table_name: string
  column_name: string
}

type ObservationSchemaInfo = {
  observationTable: string
  observation: {
    id: string
    reportId: string
    title: string
    titleAr: string | null
    description: string | null
    descriptionAr: string | null
    riskLevel: string
    status: string | null
    sortOrder: string | null
    clientResponse: string | null
    correctiveAction: string | null
    correctiveActionStatus: string | null
    createdAt: string | null
    updatedAt: string | null
  }
}

type ObservationInput = {
  reportId: string
  title: string
  titleAr?: string
  description?: string
  descriptionAr?: string
  riskLevel: string
  status?: string
  sortOrder?: number
  clientResponse?: string
  correctiveAction?: string
  correctiveActionStatus?: string
}

let schemaInfoPromise: Promise<ObservationSchemaInfo> | null = null

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

async function loadSchemaInfo(): Promise<ObservationSchemaInfo> {
  const rows = await prisma.$queryRaw<ColumnRow[]>(Prisma.sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND lower(table_name) IN (${Prisma.join(['observation'])})
  `)

  const observationTable = resolveTableName(rows, ['Observation', 'observation'], 'Observation')
  const observationColumns = rows
    .filter((entry) => entry.table_name === observationTable)
    .map((entry) => entry.column_name)

  return {
    observationTable,
    observation: {
      id: resolveRequiredColumn(observationColumns, ['id'], 'Observation id'),
      reportId: resolveRequiredColumn(observationColumns, ['reportId', 'report_id', 'reportid'], 'Observation report'),
      title: resolveRequiredColumn(observationColumns, ['title'], 'Observation title'),
      titleAr: resolveOptionalColumn(observationColumns, ['titleAr', 'title_ar', 'titlear']),
      description: resolveOptionalColumn(observationColumns, ['description']),
      descriptionAr: resolveOptionalColumn(observationColumns, ['descriptionAr', 'description_ar', 'descriptionar']),
      riskLevel: resolveRequiredColumn(observationColumns, ['riskLevel', 'risk_level', 'risklevel'], 'Risk level'),
      status: resolveOptionalColumn(observationColumns, ['status']),
      sortOrder: resolveOptionalColumn(observationColumns, ['sortOrder', 'sort_order', 'sortorder']),
      clientResponse: resolveOptionalColumn(observationColumns, ['clientResponse', 'client_response']),
      correctiveAction: resolveOptionalColumn(observationColumns, ['correctiveAction', 'corrective_action']),
      correctiveActionStatus: resolveOptionalColumn(observationColumns, ['correctiveActionStatus', 'corrective_action_status']),
      createdAt: resolveOptionalColumn(observationColumns, ['createdAt', 'created_at', 'createdat']),
      updatedAt: resolveOptionalColumn(observationColumns, ['updatedAt', 'updated_at', 'updatedat']),
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

export async function createObservationRecord(input: ObservationInput) {
  const schema = await getSchemaInfo()
  const observationId = randomUUID()

  const columns = [schema.observation.id, schema.observation.reportId, schema.observation.title, schema.observation.riskLevel]
  const values = [sqlValue(observationId), sqlValue(input.reportId), sqlValue(input.title), sqlValue(input.riskLevel)]

  if (schema.observation.titleAr) {
    columns.push(schema.observation.titleAr)
    values.push(sqlValue(input.titleAr))
  }
  if (schema.observation.description) {
    columns.push(schema.observation.description)
    values.push(sqlValue(input.description))
  }
  if (schema.observation.descriptionAr) {
    columns.push(schema.observation.descriptionAr)
    values.push(sqlValue(input.descriptionAr))
  }
  if (schema.observation.status) {
    columns.push(schema.observation.status)
    values.push(sqlValue(input.status || 'OPEN'))
  }
  if (schema.observation.sortOrder) {
    columns.push(schema.observation.sortOrder)
    values.push(String(input.sortOrder ?? 0))
  }
  if (schema.observation.createdAt) {
    columns.push(schema.observation.createdAt)
    values.push('CURRENT_TIMESTAMP')
  }
  if (schema.observation.updatedAt) {
    columns.push(schema.observation.updatedAt)
    values.push('CURRENT_TIMESTAMP')
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO ${quoteIdentifier(schema.observationTable)} (
      ${columns.map(quoteIdentifier).join(', ')}
    ) VALUES (
      ${values.join(', ')}
    )
  `)

  return observationId
}

export async function updateObservationRecord(id: string, input: Partial<ObservationInput>) {
  const schema = await getSchemaInfo()
  const updates: string[] = []

  if (typeof input.title !== 'undefined') {
    updates.push(`${quoteIdentifier(schema.observation.title)} = ${sqlValue(input.title)}`)
  }
  if (schema.observation.titleAr && typeof input.titleAr !== 'undefined') {
    updates.push(`${quoteIdentifier(schema.observation.titleAr)} = ${sqlValue(input.titleAr)}`)
  }
  if (schema.observation.description && typeof input.description !== 'undefined') {
    updates.push(`${quoteIdentifier(schema.observation.description)} = ${sqlValue(input.description)}`)
  }
  if (schema.observation.descriptionAr && typeof input.descriptionAr !== 'undefined') {
    updates.push(`${quoteIdentifier(schema.observation.descriptionAr)} = ${sqlValue(input.descriptionAr)}`)
  }
  if (typeof input.riskLevel !== 'undefined') {
    updates.push(`${quoteIdentifier(schema.observation.riskLevel)} = ${sqlValue(input.riskLevel)}`)
  }
  if (schema.observation.status && typeof input.status !== 'undefined') {
    updates.push(`${quoteIdentifier(schema.observation.status)} = ${sqlValue(input.status)}`)
  }
  if (schema.observation.sortOrder && typeof input.sortOrder !== 'undefined') {
    updates.push(`${quoteIdentifier(schema.observation.sortOrder)} = ${input.sortOrder ?? 0}`)
  }
  if (schema.observation.clientResponse && typeof input.clientResponse !== 'undefined') updates.push(`${quoteIdentifier(schema.observation.clientResponse)} = ${sqlValue(input.clientResponse)}`)
  if (schema.observation.correctiveAction && typeof input.correctiveAction !== 'undefined') updates.push(`${quoteIdentifier(schema.observation.correctiveAction)} = ${sqlValue(input.correctiveAction)}`)
  if (schema.observation.correctiveActionStatus && typeof input.correctiveActionStatus !== 'undefined') updates.push(`${quoteIdentifier(schema.observation.correctiveActionStatus)} = ${sqlValue(input.correctiveActionStatus)}`)
  if (schema.observation.updatedAt) {
    updates.push(`${quoteIdentifier(schema.observation.updatedAt)} = CURRENT_TIMESTAMP`)
  }

  if (updates.length === 0) {
    return
  }

  await prisma.$executeRawUnsafe(`
    UPDATE ${quoteIdentifier(schema.observationTable)}
    SET ${updates.join(', ')}
    WHERE ${quoteIdentifier(schema.observation.id)} = ${sqlValue(id)}
  `)
}

export async function deleteObservationRecord(id: string) {
  const schema = await getSchemaInfo()

  await prisma.$executeRawUnsafe(`
    DELETE FROM ${quoteIdentifier(schema.observationTable)}
    WHERE ${quoteIdentifier(schema.observation.id)} = ${sqlValue(id)}
  `)
}
