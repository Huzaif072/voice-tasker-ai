import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ParsedIntent, VoiceSession } from "@/types/voice";
import type { Task } from "@/types/task";

interface VoiceState {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  interimTranscript: string;
  parsedIntent: (ParsedIntent & { confidence: number }) | null;
  queryResults: Task[];
  history: VoiceSession[];
  followUpPrompts: string[];
  conversationId: string | null;
  calendarLink: string | null;
  error: string | null;
}

const initialState: VoiceState = {
  isRecording: false,
  isProcessing: false,
  transcript: "",
  interimTranscript: "",
  parsedIntent: null,
  queryResults: [],
  history: [],
  followUpPrompts: [],
  conversationId: null,
  calendarLink: null,
  error: null,
};

const voiceSlice = createSlice({
  name: "voice",
  initialState,
  reducers: {
    setRecording(state, action: PayloadAction<boolean>) { state.isRecording = action.payload; },
    setProcessing(state, action: PayloadAction<boolean>) { state.isProcessing = action.payload; },
    setTranscript(state, action: PayloadAction<string>) { state.transcript = action.payload; },
    setInterimTranscript(state, action: PayloadAction<string>) { state.interimTranscript = action.payload; },
    appendTranscript(state, action: PayloadAction<string>) { state.transcript += action.payload; },
    setParsedIntent(state, action: PayloadAction<(ParsedIntent & { confidence: number }) | null>) { state.parsedIntent = action.payload; },
    setQueryResults(state, action: PayloadAction<Task[]>) { state.queryResults = action.payload; },
    setHistory(state, action: PayloadAction<VoiceSession[]>) { state.history = action.payload; },
    setFollowUpPrompts(state, action: PayloadAction<string[]>) { state.followUpPrompts = action.payload; },
    setConversationId(state, action: PayloadAction<string | null>) { state.conversationId = action.payload; },
    setCalendarLink(state, action: PayloadAction<string | null>) { state.calendarLink = action.payload; },
    setVoiceError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
    resetVoice(state) { state.transcript = ""; state.interimTranscript = ""; state.parsedIntent = null; state.queryResults = []; state.followUpPrompts = []; state.calendarLink = null; state.error = null; },
    newVoiceConversation(state) { state.transcript = ""; state.interimTranscript = ""; state.parsedIntent = null; state.queryResults = []; state.followUpPrompts = []; state.conversationId = null; state.calendarLink = null; state.error = null; },
  },
});

export const { setRecording, setProcessing, setTranscript, setInterimTranscript, appendTranscript, setParsedIntent, setQueryResults, setHistory, setFollowUpPrompts, setConversationId, setCalendarLink, setVoiceError, resetVoice, newVoiceConversation } = voiceSlice.actions;
export default voiceSlice.reducer;
