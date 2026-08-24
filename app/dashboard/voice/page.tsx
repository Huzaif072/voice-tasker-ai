"use client";

import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { VoiceMicButton } from "@/components/voice/VoiceMicButton";
import { VoiceTranscript } from "@/components/voice/VoiceTranscript";
import { VoiceIntentPreview } from "@/components/voice/VoiceIntentPreview";
import { VoiceWaveform } from "@/components/voice/VoiceWaveform";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import type { RootState } from "@/store";
import { setParsedIntent } from "@/store/slices/voiceSlice";

export default function VoicePage() {
  const dispatch = useDispatch();
  const { isRecording, isProcessing, transcript, interimTranscript, parsedIntent, error } =
    useSelector((s: RootState) => s.voice);
  const { startRecording, stopRecording, submitText, supported } = useVoiceRecorder();
  const [textInput, setTextInput] = useState("");

  function dismissPreview() {
    dispatch(setParsedIntent(null));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl space-y-8"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-100">Voice Interaction</h2>
        <p className="mt-2 text-slate-400">Speak naturally to create and manage tasks.</p>
      </div>

      <div className="flex flex-col items-center gap-6 py-8">
        <VoiceWaveform active={isRecording} bars={16} className="h-20" />
        <VoiceMicButton
          isRecording={isRecording}
          isProcessing={isProcessing}
          onClick={() => (isRecording ? stopRecording() : startRecording())}
          size="lg"
        />
        {!supported ? (
          <p className="text-sm text-amber-400">Microphone unavailable. Use text input below.</p>
        ) : null}
      </div>

      <VoiceTranscript
        transcript={transcript}
        interim={interimTranscript}
        isListening={isRecording}
      />

      {parsedIntent ? (
        <VoiceIntentPreview intent={parsedIntent} onDismiss={dismissPreview} />
      ) : null}

      {error ? <p className="text-center text-sm text-red-400">{error}</p> : null}

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
        <p className="mb-3 text-sm text-slate-400">Or type your command:</p>
        <div className="flex gap-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Create a task to finish the quarterly report by Friday..."
            className="border-slate-600 bg-slate-700 text-slate-100"
            onKeyDown={(e) => {
              if (e.key === "Enter" && textInput.trim()) {
                submitText(textInput);
                setTextInput("");
              }
            }}
          />
          <Button
            onClick={() => {
              if (textInput.trim()) {
                submitText(textInput);
                setTextInput("");
              }
            }}
            loading={isProcessing}
            disabled={!textInput.trim()}
          >
            Send
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
