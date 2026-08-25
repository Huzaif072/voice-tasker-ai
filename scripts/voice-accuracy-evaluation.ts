import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { basicRegexIntent, parseIntent } from "../lib/groq/intent-parser";
import { transcribeAudio } from "../lib/groq/whisper";

type Action = "create" | "update" | "delete" | "query" | "delegate";
type Case = { text: string; action: Action };
type AudioCase = {
  id: string;
  audioPath: string;
  mimeType?: string;
  referenceTranscript: string;
  expectedAction: Action;
  expectedFields?: Record<string, unknown>;
  language?: string;
  microphone?: string;
  noiseCondition?: string;
  consentId?: string;
  retentionUntil?: string;
};

const cases: Case[] = [
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

function levenshtein(left: string[], right: string[]) {
  const matrix = Array.from({ length: left.length + 1 }, (_, row) => {
    const values = new Array<number>(right.length + 1).fill(0);
    values[0] = row;
    return values;
  });
  for (let column = 0; column <= right.length; column += 1) matrix[0][column] = column;
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      matrix[row][column] = left[row - 1] === right[column - 1]
        ? matrix[row - 1][column - 1]
        : 1 + Math.min(matrix[row - 1][column], matrix[row][column - 1], matrix[row - 1][column - 1]);
    }
  }
  return matrix[left.length][right.length];
}

function wordErrorRate(reference: string, hypothesis: string) {
  const referenceWords = reference.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const hypothesisWords = hypothesis.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return referenceWords.length ? levenshtein(referenceWords, hypothesisWords) / referenceWords.length : hypothesisWords.length ? 1 : 0;
}

function fieldsMatch(actual: Record<string, unknown>, expected: Record<string, unknown> | undefined) {
  if (!expected) return null;
  const entries = Object.entries(expected);
  if (!entries.length) return 1;
  return entries.filter(([key, value]) => JSON.stringify(actual[key]) === JSON.stringify(value)).length / entries.length;
}

async function evaluateAudioDataset(datasetPath: string) {
  const rows = (await readFile(datasetPath, "utf8")).split(/\r?\n/).map((line, index) => {
    if (!line.trim()) return null;
    try { return JSON.parse(line) as AudioCase; } catch { throw new Error(`Invalid JSONL at line ${index + 1}`); }
  }).filter((row): row is AudioCase => Boolean(row));
  assert.ok(rows.length > 0, "The accuracy dataset must contain at least one row");
  const results: Array<{ id: string; wer: number; actionCorrect: boolean; fieldAccuracy: number | null }> = [];
  for (const row of rows) {
    assert.ok(row.id && row.audioPath && row.referenceTranscript && row.expectedAction, `Invalid evaluation row: ${row.id ?? "unknown"}`);
    const audio = await readFile(resolve(dirname(datasetPath), row.audioPath));
    const transcript = await transcribeAudio(audio, row.mimeType ?? "audio/webm");
    let intent;
    try { intent = await parseIntent(transcript); } catch { intent = basicRegexIntent(transcript); }
    results.push({ id: row.id, wer: wordErrorRate(row.referenceTranscript, transcript), actionCorrect: intent.action === row.expectedAction, fieldAccuracy: fieldsMatch(intent as unknown as Record<string, unknown>, row.expectedFields) });
  }
  const averageWer = results.reduce((sum, row) => sum + row.wer, 0) / results.length;
  const actionAccuracy = results.filter((row) => row.actionCorrect).length / results.length;
  const fieldRows = results.filter((row) => row.fieldAccuracy !== null);
  const fieldAccuracy = fieldRows.length ? fieldRows.reduce((sum, row) => sum + (row.fieldAccuracy ?? 0), 0) / fieldRows.length : null;
  console.log(`Audio corpus: ${results.length} recordings`);
  console.log(`Word error rate: ${(averageWer * 100).toFixed(1)}%`);
  console.log(`Action accuracy: ${(actionAccuracy * 100).toFixed(1)}%`);
  if (fieldAccuracy !== null) console.log(`Extracted-field accuracy: ${(fieldAccuracy * 100).toFixed(1)}%`);
  console.log(`Failures: ${results.filter((row) => !row.actionCorrect).map((row) => row.id).join(", ") || "none"}`);
  const target = Number(process.env.VOICE_ACCURACY_TARGET ?? "0.9");
  assert.ok(Number.isFinite(target) && target > 0 && target <= 1, "VOICE_ACCURACY_TARGET must be between 0 and 1");
  assert.ok(actionAccuracy >= target, "Audio action accuracy is below the configured target");
  return;
}

async function main() {
  const datasetPath = process.env.VOICE_ACCURACY_DATASET;
  if (datasetPath) return evaluateAudioDataset(resolve(datasetPath));
  const correct = cases.filter((item) => basicRegexIntent(item.text).action === item.action).length;
  const accuracy = correct / cases.length;
  const target = Number(process.env.VOICE_ACCURACY_TARGET ?? "0.9");
  assert.ok(Number.isFinite(target) && target > 0 && target <= 1, "VOICE_ACCURACY_TARGET must be between 0 and 1");
  console.log(`Offline intent accuracy: ${(accuracy * 100).toFixed(1)}% (${correct}/${cases.length}); target ${(target * 100).toFixed(1)}%`);
  assert.ok(accuracy >= target, "Offline intent accuracy is below the configured target");
  console.log("No audio corpus supplied; this run does not measure speech-to-text accuracy.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
