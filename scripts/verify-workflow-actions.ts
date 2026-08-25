import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const workflowDirectory = join(process.cwd(), ".github", "workflows");
const shaPattern = /^[0-9a-f]{40}$/i;
const files = readdirSync(workflowDirectory).filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"));
const violations: string[] = [];

for (const file of files) {
  const path = join(workflowDirectory, file);
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = line.match(/^\s*uses:\s*([^\s#]+)/);
    if (!match) return;
    const reference = match[1];
    const at = reference.lastIndexOf("@");
    const repository = at > 0 ? reference.slice(0, at) : reference;
    const version = at > 0 ? reference.slice(at + 1) : "";
    if (!repository || !shaPattern.test(version)) {
      violations.push(`${file}:${index + 1} uses ${reference}; expected a full commit SHA`);
    }
  });
}

if (violations.length > 0) {
  throw new Error(`Unpinned GitHub Actions detected:\n${violations.join("\n")}`);
}

console.log(`PASS: ${files.length} workflow file(s) contain only full-SHA action references.`);
