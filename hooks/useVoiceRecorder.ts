"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import {
  setRecording,
  setProcessing,
  setTranscript,
  setInterimTranscript,
  setParsedIntent,
  setVoiceError,
  resetVoice,
  setQueryResults,
} from "@/store/slices/voiceSlice";
import { useToast } from "@/components/ui/Toast";

import type { ParsedIntent } from "@/types/voice";

interface VoiceResponse {
  transcript?: string;
  intent?: ParsedIntent & { confidence: number };
  message?: string;
  success?: boolean;
  requiresConfirmation?: boolean;
  ambiguousTasks?: { id: string; title: string }[];
  confirmationToken?: string;
  tasks?: import("@/types/task").Task[];
}

export function useVoiceRecorder() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const requestRef = useRef<AbortController | null>(null);
  const processingRef = useRef(false);
  const lastCommandRef = useRef<string | null>(null);
  const confirmationTokenRef = useRef<string | null>(null);
  const [supported, setSupported] = useState(
    () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia)
  );

  const handleVoiceResponse = useCallback(
    (data: VoiceResponse) => {
      if (data.transcript) lastCommandRef.current = data.transcript;
      confirmationTokenRef.current = data.confirmationToken ?? null;
      if (data.tasks) dispatch(setQueryResults(data.tasks));
      dispatch(setTranscript(data.transcript ?? ""));
      if (data.intent) dispatch(setParsedIntent(data.intent));

      if (data.message) {
        toast(data.message, data.success === false ? "error" : "success");
      }

      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["voice-history"] });
    },
    [dispatch, queryClient, toast]
  );

  const processAudio = useCallback(
    async (blob: Blob) => {
      if (processingRef.current) return;
      processingRef.current = true;
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      dispatch(setProcessing(true));
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(blob);
        });

        const res = await fetch("/api/voice/input", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio: base64, mimeType: blob.type || "audio/webm" }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        handleVoiceResponse(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        dispatch(setVoiceError(err instanceof Error ? err.message : "Processing failed"));
      } finally {
        processingRef.current = false;
        dispatch(setProcessing(false));
      }
    },
    [dispatch, handleVoiceResponse]
  );

  const startRecording = useCallback(async () => {
    try {
      dispatch(resetVoice());
      dispatch(setVoiceError(null));
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      const mimeType = preferredMimeTypes.find((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 1000) {
          dispatch(setVoiceError("Audio too short. Please speak longer."));
          return;
        }
        await processAudio(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      dispatch(setRecording(true));
    } catch {
      dispatch(setVoiceError("Microphone permission denied. Use text input instead."));
      setSupported(false);
    }
  }, [dispatch, processAudio]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    dispatch(setRecording(false));
  }, [dispatch]);

  const submitText = useCallback(
    async (text: string, confirm = false, confirmationToken?: string) => {
      if (processingRef.current) return;
      processingRef.current = true;
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      dispatch(setProcessing(true));
      try {
        const res = await fetch("/api/voice/input", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, confirm, confirmationToken }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        handleVoiceResponse({ ...data, transcript: text });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        dispatch(setVoiceError(err instanceof Error ? err.message : "Processing failed"));
      } finally {
        processingRef.current = false;
        dispatch(setProcessing(false));
      }
    },
    [dispatch, handleVoiceResponse]
  );

  const confirmLastCommand = useCallback(() => {
    if (!lastCommandRef.current || processingRef.current) return;
    return submitText(lastCommandRef.current, true, confirmationTokenRef.current ?? undefined);
  }, [submitText]);

  const cancelProcessing = useCallback(() => {
    requestRef.current?.abort();
    processingRef.current = false;
    dispatch(setProcessing(false));
    dispatch(setVoiceError("Voice processing cancelled."));
  }, [dispatch]);

  return { startRecording, stopRecording, submitText, confirmLastCommand, cancelProcessing, supported };
}

export function useVoiceRecognition() {
  const dispatch = useDispatch();
  const recognitionRef = useRef<InstanceType<NonNullable<typeof window.SpeechRecognition>> | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) dispatch(setTranscript(final));
      dispatch(setInterimTranscript(interim));
    };

    recognitionRef.current = recognition;
  }, [dispatch]);

  const start = useCallback(() => recognitionRef.current?.start(), []);
  const stop = useCallback(() => recognitionRef.current?.stop(), []);

  return { start, stop };
}
