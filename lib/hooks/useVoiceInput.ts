"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface VoiceInputState {
  isRecording: boolean;
  isTranscribing: boolean;
  error: string | null;
  audioLevel: number;
}

export interface VoiceInputOptions {
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  identityToken?: string | null;
  maxDuration?: number; // in seconds, default 60
}

export function useVoiceInput(options: VoiceInputOptions = {}) {
  const { onTranscript, onError, identityToken, maxDuration = 60 } = options;

  const [state, setState] = useState<VoiceInputState>({
    isRecording: false,
    isTranscribing: false,
    error: null,
    audioLevel: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Update audio level visualization
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalizedLevel = Math.min(average / 128, 1);

    setState((prev) => ({ ...prev, audioLevel: normalizedLevel }));

    if (state.isRecording) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [state.isRecording]);

  // Transcribe the recorded audio
  const transcribeAudio = useCallback(
    async (audioBlob: Blob) => {
      if (!identityToken) {
        const errorMsg = "Not authenticated";
        setState((prev) => ({
          ...prev,
          error: errorMsg,
          isTranscribing: false,
        }));
        onError?.(errorMsg);
        return;
      }

      setState((prev) => ({ ...prev, isTranscribing: true, error: null }));

      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        const response = await fetch("/api/transcribe", {
          method: "POST",
          headers: {
            "privy-id-token": identityToken,
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Transcription failed");
        }

        const result = await response.json();

        if (result.text && result.text.trim()) {
          onTranscript?.(result.text.trim());
        } else {
          throw new Error("No speech detected");
        }

        setState((prev) => ({ ...prev, isTranscribing: false }));
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Transcription failed";
        setState((prev) => ({
          ...prev,
          error: errorMsg,
          isTranscribing: false,
        }));
        onError?.(errorMsg);
      }
    },
    [identityToken, onTranscript, onError],
  );

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null }));
      audioChunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Set up audio context for level visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size > 0) {
          transcribeAudio(audioBlob);
        }
        cleanup();
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        const errorMsg = "Recording error occurred";
        setState((prev) => ({ ...prev, error: errorMsg, isRecording: false }));
        onError?.(errorMsg);
        cleanup();
      };

      // Start recording
      mediaRecorderRef.current.start(100); // Collect data every 100ms
      setState((prev) => ({ ...prev, isRecording: true }));

      // Start audio level visualization
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

      // Set max duration timeout
      timeoutRef.current = setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          stopRecording();
        }
      }, maxDuration * 1000);
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.name === "NotAllowedError"
            ? "Microphone access denied"
            : error.message
          : "Failed to start recording";
      setState((prev) => ({ ...prev, error: errorMsg }));
      onError?.(errorMsg);
      cleanup();
    }
  }, [maxDuration, updateAudioLevel, transcribeAudio, onError, cleanup]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }

    setState((prev) => ({ ...prev, isRecording: false, audioLevel: 0 }));
  }, []);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (state.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [state.isRecording, startRecording, stopRecording]);

  // Cancel recording without transcribing
  const cancelRecording = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (mediaRecorderRef.current) {
      // Remove the onstop handler to prevent transcription
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    }

    setState((prev) => ({ ...prev, isRecording: false, audioLevel: 0 }));
    cleanup();
  }, [cleanup]);

  return {
    ...state,
    startRecording,
    stopRecording,
    toggleRecording,
    cancelRecording,
  };
}
