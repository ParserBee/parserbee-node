# parserbee-node

Node.js and TypeScript client for the [ParserBee](https://parserbee.com) API. Send a PDF, scan or phone photo of an invoice, purchase order, receipt or bank statement, and get back structured JSON that matches your Parser Template.

## Install

```bash
npm install parserbee
```

Requires Node.js 18 or later. Works with ES modules and CommonJS, and ships TypeScript types.

## Before you start

1. Create a free account at [app.parserbee.com](https://app.parserbee.com/create-account). New accounts get 25 free pages, no credit card.
2. Create a Parser Template: upload one sample document and the AI builds the fields for you, or pick a ready-made one from the [template library](https://parserbee.com/templates/).
3. Copy your API key from **Settings** (it starts with `pk_`) and the template ID from the template page.

```bash
export PARSERBEE_API_KEY=pk_your_api_key
```

## Quick start

```ts
import { ParserBee } from "parserbee";

const client = new ParserBee(); // reads PARSERBEE_API_KEY

const result = await client.extract("your_template_id", { file: "invoice.pdf" });
console.log(result.data);
// { invoice_number: "INV-2026-001", vendor_name: "Acme Corp", total_amount: 1500, ... }
```

Other ways to pass a document:

```ts
// A public link (it must open without a login)
await client.extract("your_template_id", { fileUrl: "https://example.com/invoice.pdf" });

// File contents you already have in memory
await client.extract("your_template_id", { file: buffer, fileName: "receipt.jpg" });
```

Type the result with your own fields:

```ts
interface Invoice {
  invoice_number: string;
  total_amount: number;
  line_items: { description: string; quantity: number; amount: number }[];
}

const { data } = await client.extract<Invoice>("your_template_id", { file: "invoice.pdf" });
data.line_items.forEach((item) => console.log(item.description, item.amount));
```

CommonJS:

```js
const { ParserBee } = require("parserbee");
```

## The response

| Field | What it holds |
|---|---|
| `data` | The extracted fields, shaped like your Parser Template |
| `request_id` | The request ID (also in Activity in the dashboard) |
| `credits_remaining` | Page credits left after this call |
| `usage` | `pages_processed`, `credits_charged`, `doc_size_bytes` |
| `processing_time_ms` | Time taken |

Each extraction costs 1 page credit per page processed, with a minimum of 1.

## Other methods

```ts
await client.listTemplates();        // every Parser Template in the account
await client.getTemplate("tpl_id");  // one template with its fields
await client.getCredits();           // balance, plan and subscription status
await client.listActivity();         // the last 10 extractions
await client.getActivity("req_id");  // one extraction, with its data
```

## Options

```ts
new ParserBee({
  apiKey: "pk_...",         // default: process.env.PARSERBEE_API_KEY
  timeoutMs: 120_000,       // default: 120 seconds
  fetch: customFetch,       // default: global fetch
});
```

## Errors

Every error extends `ParserBeeError`, with `.code` and `.status`:

| Error | When |
|---|---|
| `InvalidRequestError` | 400: missing field, or a file type that is not accepted |
| `AuthenticationError` | 401: missing or invalid API key |
| `InsufficientCreditsError` | 402: no page credits left (`.creditsRemaining`) |
| `PermissionDeniedError` | 403: no active subscription |
| `NotFoundError` | 404: template or request not found |
| `APIError` | Any other API error |
| `APIConnectionError` | The request did not reach the API |

```ts
import { InsufficientCreditsError } from "parserbee";

try {
  await client.extract("your_template_id", { file: "invoice.pdf" });
} catch (error) {
  if (error instanceof InsufficientCreditsError) console.log("Top up page credits in the dashboard");
  else throw error;
}
```

## Examples

The [examples](https://github.com/ParserBee/parserbee-node/tree/main/examples) folder has scripts you can run as they are:

- `extract-invoice.mjs`: one file, printed as JSON
- `extract-from-url.mjs`: a document that is already online
- `folder-to-csv.mjs`: every PDF and image in a folder, one CSV row each
- `check-credits.mjs`: balance and template IDs

## Supported files

PDF, PNG, JPG, WebP and HEIC, up to 50 MB. The API also reads DOC, PPT, PPTX, XLSX, CSV, TXT, RTF, ODT, HTML and EML; see the [API reference](https://app.parserbee.com/docs) for details. Scans and phone photos work, and there is no need to run OCR first. DOCX is not accepted: save it as PDF first.

## No code needed?

To move a batch of documents into a spreadsheet without code, use [Data Lab](https://parserbee.com/tools/bank-statement-converter/#data-lab) in the dashboard: it exports one combined Excel, CSV or Google Sheets file. To try a single invoice in the browser, use the free [invoice parser](https://parserbee.com/tools/invoice-parser/).

Building an invoice workflow? Our guide to [invoice automation software](https://parserbee.com/blog/best-invoice-automation-software/) explains which kind of tool fits a small team.

## Links

- [ParserBee](https://parserbee.com)
- [API reference](https://app.parserbee.com/docs)
- [Pricing](https://parserbee.com/pricing/)
- Support: support@parserbee.com

## License

MIT
