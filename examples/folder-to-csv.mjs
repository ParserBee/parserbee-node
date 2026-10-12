// Extract every PDF and image in a folder and write one CSV row per document.
// Top-level fields become columns; lists and groups (such as line items) are written as JSON text.
//
//   node examples/folder-to-csv.mjs <template_id> ./invoices output.csv

import { readdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { InsufficientCreditsError, ParserBee, ParserBeeError } from "parserbee";

const EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp", ".heic"]);
const [templateId, folder, output] = process.argv.slice(2);
if (!templateId || !folder || !output) {
  console.error("Usage: node folder-to-csv.mjs <template_id> <folder> <output.csv>");
  process.exit(1);
}

const csvCell = (value) => {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const files = (await readdir(folder)).filter((name) => EXTENSIONS.has(extname(name).toLowerCase())).sort();
const client = new ParserBee();
const rows = [];

for (const name of files) {
  try {
    const { data } = await client.extract(templateId, { file: join(folder, name) });
    rows.push({ source_file: name, ...data });
    console.log(`${name}: done`);
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      console.log("Out of page credits; stopping.");
      break;
    }
    if (error instanceof ParserBeeError) {
      console.log(`${name}: failed (${error.message})`);
      continue;
    }
    throw error;
  }
}

if (rows.length === 0) {
  console.error("Nothing was extracted.");
  process.exit(1);
}

const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
const lines = [columns.join(","), ...rows.map((row) => columns.map((c) => csvCell(row[c])).join(","))];
await writeFile(output, lines.join("\n") + "\n", "utf8");
console.log(`Wrote ${rows.length} rows to ${output}`);
