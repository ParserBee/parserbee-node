// Extract data from a document that is already online. The link must open without a login.
//
//   node examples/extract-from-url.mjs <template_id> https://example.com/invoice.pdf

import { ParserBee } from "parserbee";

const [templateId, fileUrl] = process.argv.slice(2);
if (!templateId || !fileUrl) {
  console.error("Usage: node extract-from-url.mjs <template_id> <url>");
  process.exit(1);
}

const client = new ParserBee();
const result = await client.extract(templateId, { fileUrl });
console.log(JSON.stringify(result.data, null, 2));
