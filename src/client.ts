import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { APIConnectionError, APIError, errorForStatus, type ErrorBody } from "./errors.js";
import type { ExtractInput, ExtractResult } from "./types.js";
import { VERSION } from "./version.js";

export const DEFAULT_BASE_URL = "https://app.parserbee.com";

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

function mimeTypeFor(fileName: string): string {
  return MIME_TYPES[extname(fileName).toLowerCase()] ?? "application/octet-stream";
}

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

  /**
   * Extract structured data from a document with a Parser Template.
   * Each extraction costs 1 page credit per page processed (minimum 1).
   */
  async extract<T = Record<string, unknown>>(templateId: string, input: ExtractInput): Promise<ExtractResult<T>> {
    if (!templateId) throw new Error("templateId is required");

    if ("fileUrl" in input) {
      return this.request<ExtractResult<T>>(
        "POST",
        "/api/v1/extract",
        JSON.stringify({ template_id: templateId, file_url: input.fileUrl }),
        { "Content-Type": "application/json" },
      );
    }

    let blob: Blob;
    let fileName: string;
    if (typeof input.file === "string") {
      fileName = input.fileName ?? basename(input.file);
      blob = new Blob([new Uint8Array(await readFile(input.file))], { type: mimeTypeFor(fileName) });
    } else {
      fileName = input.fileName ?? "document";
      blob = input.file instanceof Blob ? input.file : new Blob([new Uint8Array(input.file)], { type: mimeTypeFor(fileName) });
    }

    const form = new FormData();
    form.append("template_id", templateId);
    form.append("file", blob, fileName);
    return this.request<ExtractResult<T>>("POST", "/api/v1/extract", form);
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
