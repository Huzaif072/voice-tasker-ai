import assert from "node:assert/strict";
import { basicRegexIntent } from "../lib/groq/intent-parser";

const cases: Array<{ text: string; action: "create" | "update" | "delete" | "query" | "delegate" }> = [
  { text: "Create a task to call the dentist", action: "create" },
  { text: "Add a task to prepare the presentation", action: "create" },
  { text: "Remind me to submit the report tomorrow", action: "create" },
  { text: "Complete the grocery shopping task", action: "update" },
  { text: "Mark the invoice task done", action: "update" },
  { text: "Update the launch checklist", action: "update" },
  { text: "Delete the old travel task", action: "delete" },
  { text: "Remove the duplicate task", action: "delete" },
  { text: "Delete the meeting reminder", action: "delete" },
  { text: "Show my tasks", action: "query" },
  { text: "What is due today?", action: "query" },
  { text: "List my urgent tasks", action: "query" },
  { text: "Delegate the budget task to +14155550123", action: "delegate" },
  { text: "Assign the design review to +447911123456", action: "delegate" },
  { text: "Ask +923001234567 to handle the follow-up", action: "delegate" },
];

const correct = cases.filter((item) => basicRegexIntent(item.text).action === item.action).length;
const accuracy = correct / cases.length;
const target = Number(process.env.VOICE_ACCURACY_TARGET ?? "0.9");
assert.ok(Number.isFinite(target) && target > 0 && target <= 1, "VOICE_ACCURACY_TARGET must be between 0 and 1");
console.log(`Voice intent accuracy: ${(accuracy * 100).toFixed(1)}% (${correct}/${cases.length}); target ${(target * 100).toFixed(1)}%`);
assert.ok(accuracy >= target, "Voice intent accuracy is below the configured target");
