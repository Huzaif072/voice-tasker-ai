import type { ContextTrigger, Subtask, Task } from "@/types/task";

export interface ParsedIntent {
  action: "create" | "update" | "delete" | "query" | "delegate" | "unknown";
  taskTitle?: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
  reminderAt?: string;
  durationMinutes?: number;
  calendarQuery?: string;
  calendarLink?: string;
  assignee?: string;
  assigneePhone?: string;
  subtasks?: Subtask[];
  dependencies?: string[];
  contextTriggers?: ContextTrigger[];
  rawQuery: string;
  requiresConfirmation?: boolean;
  ambiguousTasks?: { id: string; title: string }[];
}

export interface VoiceConversationState {
  conversationId: string;
  pendingIntent?: ParsedIntent;
  pendingConfirmationToken?: string;
  lastQueryTasks?: Pick<Task, "_id" | "title" | "status" | "priority">[];
  lastTaskId?: string;
  lastTaskTitle?: string;
  updatedAt: string;
}

export interface VoiceSession {
  _id?: string;
  userId: string;
  conversationId?: string;
  conversationContext?: Omit<VoiceConversationState, "conversationId">;
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
  conversationId?: string;
}
