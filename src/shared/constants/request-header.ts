
export const TRACE_HEADER_KEYS = {
  REQUEST_ID: 'x-request-id',
  CORRELATION_ID: 'x-correlation-id',
  USER_AGENT: 'user-agent',
  FORWARDED_FOR: 'x-forwarded-for',
} as const;

export type TraceHeaderKey = typeof TRACE_HEADER_KEYS[keyof typeof TRACE_HEADER_KEYS];
