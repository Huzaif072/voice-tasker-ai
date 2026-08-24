export interface ParsedIntent {
  action: "create" | "update" | "delete" | "query" | "delegate" | "unknown";
  taskTitle?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
  assignee?: string;
  rawQuery: string;
  requiresConfirmation?: boolean;
  ambiguousTasks?: { id: string; title: string }[];
}

export interface VoiceSession {
  _id?: string;
  userId: string;
  rawAudioUrl?: string;
  inputText: string;
  parsedIntent: ParsedIntent;
  taskId?: string;
  model: string;
  confidence: number;
  timestamp: string;
}

export interface VoiceInputRequest {
  text?: string;
  audio?: string;
  mimeType?: string;
  confirm?: boolean;
  confirmationToken?: string;
}
