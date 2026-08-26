import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const execFileAsync = promisify(execFile);

export async function transcribeLocal(audioBuffer: Buffer, language: "auto" | "en" | "ur" = "auto"): Promise<string> {
  const whisperPath = process.env.WHISPER_CPP_PATH;
  const modelPath = process.env.WHISPER_MODEL_PATH;

  if (!whisperPath || !modelPath) {
    throw new Error("whisper.cpp not configured");
  }

  const tmpFile = join(tmpdir(), `whisper-${Date.now()}.webm`);
  try {
    await writeFile(tmpFile, audioBuffer);
    const { stdout } = await execFileAsync(whisperPath, [
      "-m",
      modelPath,
      "-f",
      tmpFile,
      "--no-timestamps",
      "-l",
      language,
    ]);
    return stdout.trim();
  } finally {
    await unlink(tmpFile).catch(() => {});
  }
}
