export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PageQuery {
  page: number;
  pageSize: number;
}

export interface PageQueryInput {
  page?: string;
  pageSize?: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function parsePageQuery(input: PageQueryInput): PageQuery {
  const page = parsePositiveInteger(input.page, 'page', DEFAULT_PAGE);
  const pageSize = parsePositiveInteger(input.pageSize, 'pageSize', DEFAULT_PAGE_SIZE);

  if (pageSize > MAX_PAGE_SIZE) {
    throw new RangeError(`pageSize must be between 1 and ${MAX_PAGE_SIZE}`);
  }

  return { page, pageSize };
}

function parsePositiveInteger(
  value: string | undefined,
  name: string,
  defaultValue: number,
): number {
  if (value === undefined) {
    return defaultValue;
  }

  if (!/^\d+$/.test(value)) {
    throw new TypeError(`${name} must be a positive integer`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new RangeError(`${name} must be a positive integer`);
  }

  return parsed;
}
