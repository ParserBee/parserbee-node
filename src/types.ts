/** Response of POST /api/v1/extract. */
export interface ExtractResult<T = Record<string, unknown>> {
  success: boolean;
  request_id: string;
  /** The extracted fields, shaped like your Parser Template. */
  data: T;
  credits_remaining: number;
  processing_time_ms: number;
  usage: {
    pages_processed: number | null;
    credits_charged: number;
    doc_size_bytes: number | null;
  };
}

/** A document to extract: a local path, file contents, or a public link. */
export type ExtractInput =
  | { file: string; fileName?: string }
  | { file: Buffer | Uint8Array | Blob; fileName: string }
  | { fileUrl: string };
