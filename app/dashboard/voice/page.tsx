"use client";

import { useEffect, useState } from "react";
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
import { setParsedIntent, setHistory } from "@/store/slices/voiceSlice";
import { VoiceCommandHistory } from "@/components/voice/VoiceCommandHistory";
import type { VoiceSession } from "@/types/voice";

export default function VoicePage() {
  const dispatch = useDispatch();
  const { isRecording, isProcessing, transcript, interimTranscript, parsedIntent, queryResults, history, error } =
    useSelector((s: RootState) => s.voice);
  const { startRecording, stopRecording, submitText, confirmLastCommand, cancelProcessing, supported } = useVoiceRecorder();
  const [textInput, setTextInput] = useState("");

  useEffect(() => {
    fetch("/api/voice/history")
      .then((response) => response.json())
      .then((data: { sessions?: VoiceSession[] }) => dispatch(setHistory(data.sessions ?? [])))
      .catch(() => undefined);
  }, [dispatch, isProcessing, transcript]);

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
          <p className="text-sm text-amber-400" role="status">Microphone unavailable. Use text input below.</p>
        ) : null}
        {isProcessing ? <Button type="button" variant="ghost" onClick={cancelProcessing}>Cancel processing</Button> : null}
      </div>

      <VoiceTranscript
        transcript={transcript}
        interim={interimTranscript}
        isListening={isRecording}
      />

      {parsedIntent ? (
        <VoiceIntentPreview intent={parsedIntent} onDismiss={dismissPreview} onConfirm={confirmLastCommand} onSelectTask={(title) => setTextInput(`${parsedIntent.action} ${title}`)} />
      ) : null}

      {error ? <p className="text-center text-sm text-red-400" role="alert" aria-live="assertive">{error}</p> : null}
      {queryResults.length ? (
        <section aria-labelledby="voice-results-heading" className="space-y-3">
          <h3 id="voice-results-heading" className="text-sm font-semibold text-slate-300">Matching tasks</h3>
          {queryResults.map((task) => <div key={task._id} className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-sm"><span className="text-slate-200">{task.title}</span><span className="capitalize text-slate-400">{task.status} · {task.priority}</span></div>)}
        </section>
      ) : null}
      <p className="sr-only" aria-live="polite">{isRecording ? "Listening" : isProcessing ? "Processing voice command" : ""}</p>

      <form className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4" onSubmit={(event) => { event.preventDefault(); if (textInput.trim()) { submitText(textInput.trim()); setTextInput(""); } }}>
        <label htmlFor="voice-command-input" className="mb-3 block text-sm text-slate-400">Or type your command:</label>
        <div className="flex gap-2">
          <Input
            id="voice-command-input"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Create a task to finish the quarterly report by Friday..."
            className="border-slate-600 bg-slate-700 text-slate-100"
          />
          <Button type="submit"
            loading={isProcessing}
            disabled={!textInput.trim()}
          >
            Send
          </Button>
        </div>
      </form>
      <section aria-labelledby="voice-history-heading" className="space-y-3">
        <h3 id="voice-history-heading" className="text-sm font-semibold text-slate-300">Recent voice commands</h3>
        <VoiceCommandHistory sessions={history} />
      </section>
    </motion.div>
  );
}
