export type ApiErrorKind = 'network' | 'http';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;

  readonly status: number | null;

  readonly messages: string[];

  constructor(
    message: string,
    kind: ApiErrorKind,
    status: number | null = null,
    messages: string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.messages = messages.length > 0 ? messages : [message];
  }
}
