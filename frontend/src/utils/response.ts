export class AppResponse<T> {
  public data: T | null;
  public error: { code: string; message: string; statusCode: number } | null;
  public meta: Record<string, unknown> | null;

  constructor(
    data: T | null,
    error: { code: string; message: string; statusCode: number } | null = null,
    meta: Record<string, unknown> | null = null
  ) {
    this.data = data;
    this.error = error;
    this.meta = meta;
  }

  static success<T>(data: T, meta: Record<string, unknown> | null = null): AppResponse<T> {
    return new AppResponse(data, null, meta);
  }

  static fail(
    code: string,
    message: string,
    statusCode: number = 500,
    meta: Record<string, unknown> | null = null
  ): AppResponse<null> {
    return new AppResponse(null, { code, message, statusCode }, meta);
  }
}