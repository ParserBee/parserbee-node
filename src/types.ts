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

export interface TemplateField {
  name: string;
  title?: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  nullable?: boolean;
  required?: boolean;
  [key: string]: unknown;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  fields: TemplateField[];
  created: string;
  updated: string;
}

export interface Credits {
  credits_remaining: number;
  credits_total: number;
  subscription_plan: "trial" | "starter" | "scale" | "business" | string;
  subscription_status: "trial" | "active" | "canceled" | "past_due" | "incomplete" | "suspended" | string;
}

export interface ActivitySummary {
  id: string;
  status: "pending" | "processing" | "success" | "failed";
  file_name: string;
  file_type: string;
  file_size: number;
  template: string;
  processing_time_ms: number;
  created: string;
}

export interface ActivityDetail<T = Record<string, unknown>> extends ActivitySummary {
  extracted_data: T;
  updated: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
}
