"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
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
  setConversationId,
  setFollowUpPrompts,
  setCalendarLink,
  newVoiceConversation,
} from "@/store/slices/voiceSlice";
import { useToast } from "@/components/ui/Toast";
import type { ParsedIntent } from "@/types/voice";
import { speakText } from "@/lib/voice/speak";

function subscribeToMediaSupport() { return () => undefined; }
function getMediaSupportSnapshot() { return Boolean(navigator.mediaDevices?.getUserMedia); }
function getServerMediaSupportSnapshot() { return false; }

interface VoiceResponse {
  transcript?: string;
  intent?: ParsedIntent & { confidence: number };
  message?: string;
  success?: boolean;
  requiresConfirmation?: boolean;
  ambiguousTasks?: { id: string; title: string }[];
  confirmationToken?: string;
  conversationId?: string;
  followUpPrompts?: string[];
  calendarLink?: string;
  tasks?: import("@/types/task").Task[];
}

export function useVoiceRecorder() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<number | null>(null);
  const recordingBytesRef = useRef(0);
  const requestRef = useRef<AbortController | null>(null);
  const processingRef = useRef(false);
  const lastCommandRef = useRef<string | null>(null);
  const confirmationTokenRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const mediaSupported = useSyncExternalStore(subscribeToMediaSupport, getMediaSupportSnapshot, getServerMediaSupportSnapshot);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const supported = mediaSupported && !permissionDenied;

  const handleVoiceResponse = useCallback(
    (data: VoiceResponse) => {
      if (data.transcript) lastCommandRef.current = data.transcript;
      confirmationTokenRef.current = data.confirmationToken ?? null;
      if (data.conversationId) {
        conversationIdRef.current = data.conversationId;
        dispatch(setConversationId(data.conversationId));
      }
      dispatch(setFollowUpPrompts(data.followUpPrompts ?? []));
      if (data.tasks) dispatch(setQueryResults(data.tasks));
      dispatch(setTranscript(data.transcript ?? ""));
      if (data.intent) dispatch(setParsedIntent(data.intent));

      if (data.message) {
        toast(data.message, data.success === false ? "error" : "success");
        speakText(data.message);
      }
      dispatch(setCalendarLink(data.calendarLink ?? null));

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
        const form = new FormData();
        form.append("audio", blob, `voice-command.${(blob.type || "audio/webm").split("/")[1]?.split(";")[0] ?? "webm"}`);
        if (conversationIdRef.current) form.append("conversationId", conversationIdRef.current);
        const res = await fetch("/api/voice/input", {
          method: "POST",
          body: form,
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
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 64_000 } : { audioBitsPerSecond: 64_000 });
      chunksRef.current = [];
      recordingBytesRef.current = 0;
      recorder.ondataavailable = (e) => {
        if (e.data.size <= 0) return;
        recordingBytesRef.current += e.data.size;
        if (recordingBytesRef.current > 8 * 1024 * 1024) {
          dispatch(setVoiceError("Recording is too large. Please keep it under one minute."));
          recorder.stop();
          return;
        }
        chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        if (recordingTimeoutRef.current !== null) window.clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 1000) { dispatch(setVoiceError("Audio too short. Please speak longer.")); return; }
        await processAudio(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(250);
      recordingTimeoutRef.current = window.setTimeout(() => {
        if (recorder.state === "recording") {
          dispatch(setVoiceError("Recording limit reached. Processing the first minute."));
          recorder.stop();
        }
      }, 60_000);
      dispatch(setRecording(true));
    } catch {
      dispatch(setVoiceError("Microphone permission denied. Use text input instead."));
      setPermissionDenied(true);
    }
  }, [dispatch, processAudio]);

  const stopRecording = useCallback(() => {
    if (recordingTimeoutRef.current !== null) window.clearTimeout(recordingTimeoutRef.current);
    recordingTimeoutRef.current = null;
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
          body: JSON.stringify({ text, confirm, confirmationToken, conversationId: conversationIdRef.current ?? undefined }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        handleVoiceResponse({ ...data, transcript: data.transcript ?? text });
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

  const startNewConversation = useCallback(() => {
    conversationIdRef.current = null;
    confirmationTokenRef.current = null;
    lastCommandRef.current = null;
    dispatch(newVoiceConversation());
  }, [dispatch]);

  const cancelProcessing = useCallback(() => {
    requestRef.current?.abort();
    processingRef.current = false;
    dispatch(setProcessing(false));
    dispatch(setVoiceError("Voice processing cancelled."));
  }, [dispatch]);

  return { startRecording, stopRecording, submitText, confirmLastCommand, cancelProcessing, startNewConversation, supported };
}

export function useVoiceRecognition(onFinal?: (text: string) => void) {
  const dispatch = useDispatch();
  const recognitionRef = useRef<InstanceType<NonNullable<typeof window.SpeechRecognition>> | null>(null);

  useEffect(() => {
    const SpeechRecognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
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
        if (event.results[i].isFinal) final += t; else interim += t;
      }
      if (final) {
        dispatch(setTranscript(final));
        onFinal?.(final.trim());
      }
      dispatch(setInterimTranscript(interim));
    };
    recognitionRef.current = recognition;
  }, [dispatch, onFinal]);

  const start = useCallback(() => recognitionRef.current?.start(), []);
  const stop = useCallback(() => recognitionRef.current?.stop(), []);
  return { start, stop, supported: Boolean(typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)) };
}
