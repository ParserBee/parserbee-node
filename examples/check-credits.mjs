// Print the page credit balance and the Parser Templates in the account.

import { ParserBee } from "parserbee";

const client = new ParserBee();
const credits = await client.getCredits();
console.log(`Plan: ${credits.subscription_plan} (${credits.subscription_status})`);
console.log(`Page credits: ${credits.credits_remaining} of ${credits.credits_total}`);

console.log("\nParser Templates:");
for (const template of await client.listTemplates()) {
  console.log(`  ${template.id}  ${template.name}`);
}
