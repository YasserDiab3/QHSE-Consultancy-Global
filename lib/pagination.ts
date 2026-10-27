export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 200
export const UNPAGINATED_LIMIT = 500

export type Pagination = {
  requested: boolean
  page: number
  pageSize: number
  skip: number
  take: number
}

type ParseOptions = {
  defaultPageSize?: number
  maxPageSize?: number
}

/**
 * Reads `page` and `pageSize` from a query string. Requests without pagination
 * parameters remain backward compatible and are bounded by UNPAGINATED_LIMIT.
 */
export function parsePagination(searchParams: URLSearchParams, options: ParseOptions = {}): Pagination {
  const maxPageSize = options.maxPageSize ?? MAX_PAGE_SIZE
  const fallbackPageSize = Math.min(options.defaultPageSize ?? DEFAULT_PAGE_SIZE, maxPageSize)
  const requested = searchParams.has('page') || searchParams.has('pageSize')

  const rawPage = Number(searchParams.get('page') ?? '1')
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1

  const rawPageSize = Number(searchParams.get('pageSize') ?? String(fallbackPageSize))
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(Math.floor(rawPageSize), maxPageSize)
      : fallbackPageSize

  const sizedPageSize = requested ? pageSize : UNPAGINATED_LIMIT
  const skip = (page - 1) * sizedPageSize

  return {
    requested,
    page,
    pageSize: sizedPageSize,
    skip,
    take: sizedPageSize,
  }
}

export type PaginationMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export function buildPaginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page * pageSize < total,
    hasPreviousPage: page > 1,
  }
}

export function paginationHeaders(total: number, pagination: Pagination) {
  return {
    'X-Total-Count': String(total),
    'X-Page': String(pagination.page),
    'X-Page-Size': String(pagination.pageSize),
  }
}
