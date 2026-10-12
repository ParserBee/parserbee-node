export { ParserBee, DEFAULT_BASE_URL, type ParserBeeOptions } from "./client.js";
export {
  ParserBeeError,
  InvalidRequestError,
  AuthenticationError,
  InsufficientCreditsError,
  PermissionDeniedError,
  NotFoundError,
  APIError,
  APIConnectionError,
} from "./errors.js";
export type {
  ActivityDetail,
  ActivitySummary,
  Credits,
  ExtractInput,
  ExtractResult,
  Template,
  TemplateField,
} from "./types.js";
export { VERSION } from "./version.js";
