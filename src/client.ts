import { APIConnectionError, APIError, errorForStatus, type ErrorBody } from "./errors.js";
import { VERSION } from "./version.js";

export const DEFAULT_BASE_URL = "https://app.parserbee.com";

export interface ParserBeeOptions {
  /** API key from Settings in the dashboard. Defaults to the PARSERBEE_API_KEY environment variable. */
  apiKey?: string;
  /** Defaults to https://app.parserbee.com */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 120000. */
  timeoutMs?: number;
  /** Custom fetch implementation, for tests or proxies. */
  fetch?: typeof fetch;
}

export class ParserBee {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ParserBeeOptions = {}) {
    const apiKey = options.apiKey ?? process.env.PARSERBEE_API_KEY;
    if (!apiKey) {
      throw new Error("No API key given. Pass { apiKey } or set PARSERBEE_API_KEY.");
    }
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 120_000;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
  }

  protected async request<T>(method: string, path: string, body?: BodyInit, headers: Record<string, string> = {}): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        body,
        headers: {
          "x-api-key": this.apiKey,
          "User-Agent": `parserbee-node/${VERSION}`,
          Accept: "application/json",
          ...headers,
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new APIConnectionError(`Could not reach the ParserBee API: ${reason}`);
    }

    let data: unknown = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw errorForStatus(response.status, (data ?? {}) as ErrorBody);
    }
    if (typeof data !== "object" || data === null) {
      throw new APIError("Unexpected response from the ParserBee API", { status: response.status });
    }
    return data as T;
  }
}
