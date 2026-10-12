// Extract the fields of one invoice and print them.
//
//   export PARSERBEE_API_KEY=pk_...
//   node examples/extract-invoice.mjs <template_id> invoice.pdf

import { ParserBee } from "parserbee";

const [templateId, file] = process.argv.slice(2);
if (!templateId || !file) {
  console.error("Usage: node extract-invoice.mjs <template_id> <file>");
  process.exit(1);
}

const client = new ParserBee();
const result = await client.extract(templateId, { file });

console.log(JSON.stringify(result.data, null, 2));
console.log(`\nPages: ${result.usage.pages_processed}, credits left: ${result.credits_remaining}`);
