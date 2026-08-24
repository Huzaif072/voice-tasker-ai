import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ParsedIntent } from "@/types/voice";

interface VoiceState {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  interimTranscript: string;
  parsedIntent: (ParsedIntent & { confidence: number }) | null;
  error: string | null;
}

const initialState: VoiceState = {
  isRecording: false,
  isProcessing: false,
  transcript: "",
  interimTranscript: "",
  parsedIntent: null,
  error: null,
};

const voiceSlice = createSlice({
  name: "voice",
  initialState,
  reducers: {
    setRecording(state, action: PayloadAction<boolean>) {
      state.isRecording = action.payload;
    },
    setProcessing(state, action: PayloadAction<boolean>) {
      state.isProcessing = action.payload;
    },
    setTranscript(state, action: PayloadAction<string>) {
      state.transcript = action.payload;
    },
    setInterimTranscript(state, action: PayloadAction<string>) {
      state.interimTranscript = action.payload;
    },
    appendTranscript(state, action: PayloadAction<string>) {
      state.transcript += action.payload;
    },
    setParsedIntent(
      state,
      action: PayloadAction<(ParsedIntent & { confidence: number }) | null>
    ) {
      state.parsedIntent = action.payload;
    },
    setVoiceError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    resetVoice(state) {
      state.transcript = "";
      state.interimTranscript = "";
      state.parsedIntent = null;
      state.error = null;
    },
  },
});

export const {
  setRecording,
  setProcessing,
  setTranscript,
  setInterimTranscript,
  appendTranscript,
  setParsedIntent,
  setVoiceError,
  resetVoice,
} = voiceSlice.actions;
export default voiceSlice.reducer;
