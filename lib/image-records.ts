import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type ColumnRow = {
  table_name: string
  column_name: string
}

type ImageSchemaInfo = {
  imageTable: string
  image: {
    id: string
    observationId: string
    type: string
    url: string
    originalName: string | null
    mimeType: string | null
    size: string | null
    createdAt: string | null
  }
}

type CreateImageInput = {
  observationId: string
  type: string
  url: string
  originalName?: string
  mimeType?: string
  size?: number
}

let schemaInfoPromise: Promise<ImageSchemaInfo> | null = null

function escapeSqlString(value: string) {
  return value.replace(/'/g, "''")
}

function sqlValue(value?: string | number | null) {
  if (value == null || value === '') {
    return 'NULL'
  }

  if (typeof value === 'number') {
    return String(value)
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

async function loadSchemaInfo(): Promise<ImageSchemaInfo> {
  const rows = await prisma.$queryRaw<ColumnRow[]>(Prisma.sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND lower(table_name) IN (${Prisma.join(['image'])})
  `)

  const imageTable = resolveTableName(rows, ['Image', 'image'], 'Image')
  const imageColumns = rows
    .filter((entry) => entry.table_name === imageTable)
    .map((entry) => entry.column_name)

  return {
    imageTable,
    image: {
      id: resolveRequiredColumn(imageColumns, ['id'], 'Image id'),
      observationId: resolveRequiredColumn(imageColumns, ['observationId', 'observation_id', 'observationid'], 'Image observation reference'),
      type: resolveRequiredColumn(imageColumns, ['type'], 'Image type'),
      url: resolveRequiredColumn(imageColumns, ['url'], 'Image url'),
      originalName: resolveOptionalColumn(imageColumns, ['originalName', 'original_name', 'originalname']),
      mimeType: resolveOptionalColumn(imageColumns, ['mimeType', 'mime_type', 'mimetype']),
      size: resolveOptionalColumn(imageColumns, ['size']),
      createdAt: resolveOptionalColumn(imageColumns, ['createdAt', 'created_at', 'createdat']),
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

export async function createImageRecord(input: CreateImageInput) {
  const schema = await getSchemaInfo()
  const imageId = randomUUID()

  const columns = [
    schema.image.id,
    schema.image.observationId,
    schema.image.type,
    schema.image.url,
  ]
  const values = [
    sqlValue(imageId),
    sqlValue(input.observationId),
    sqlValue(input.type),
    sqlValue(input.url),
  ]

  if (schema.image.originalName) {
    columns.push(schema.image.originalName)
    values.push(sqlValue(input.originalName))
  }

  if (schema.image.mimeType) {
    columns.push(schema.image.mimeType)
    values.push(sqlValue(input.mimeType))
  }

  if (schema.image.size) {
    columns.push(schema.image.size)
    values.push(sqlValue(input.size ?? null))
  }

  if (schema.image.createdAt) {
    columns.push(schema.image.createdAt)
    values.push('CURRENT_TIMESTAMP')
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO ${quoteIdentifier(schema.imageTable)} (
      ${columns.map(quoteIdentifier).join(', ')}
    ) VALUES (
      ${values.join(', ')}
    )
  `)

  return {
    id: imageId,
    observationId: input.observationId,
    type: input.type,
    url: input.url,
    originalName: input.originalName,
    mimeType: input.mimeType,
    size: input.size,
  }
}
