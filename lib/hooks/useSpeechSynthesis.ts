"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export interface VoiceInfo {
  id: Voice;
  name: string;
  description: string;
}

export const VOICES: VoiceInfo[] = [
  { id: "alloy", name: "Alloy", description: "Neutral and balanced" },
  { id: "echo", name: "Echo", description: "Warm and conversational" },
  { id: "fable", name: "Fable", description: "British and narrative" },
  { id: "onyx", name: "Onyx", description: "Deep and authoritative" },
  { id: "nova", name: "Nova", description: "Friendly and upbeat" },
  { id: "shimmer", name: "Shimmer", description: "Clear and expressive" },
];

export interface SpeechSynthesisState {
  isLoading: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  error: string | null;
  progress: number; // 0 to 1
}

export interface SpeechSynthesisOptions {
  voice?: Voice;
  speed?: number;
  identityToken?: string | null;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export function useSpeechSynthesis(options: SpeechSynthesisOptions = {}) {
  const {
    voice = "nova",
    speed = 1.0,
    identityToken,
    onStart,
    onEnd,
    onError,
  } = options;

  const [state, setState] = useState<SpeechSynthesisState>({
    isLoading: false,
    isPlaying: false,
    isPaused: false,
    error: null,
    progress: 0,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const currentTextRef = useRef<string | null>(null);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Generate and play speech
  const speak = useCallback(
    async (text: string) => {
      if (!text || !text.trim()) {
        return;
      }

      if (!identityToken) {
        const errorMsg = "Not authenticated";
        setState((prev) => ({ ...prev, error: errorMsg }));
        onError?.(errorMsg);
        return;
      }

      // Stop any current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }

      setState({
        isLoading: true,
        isPlaying: false,
        isPaused: false,
        error: null,
        progress: 0,
      });
      currentTextRef.current = text;

      try {
        const response = await fetch("/api/speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "privy-id-token": identityToken,
          },
          body: JSON.stringify({ text, voice, speed }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Speech generation failed");
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        audioUrlRef.current = audioUrl;

        // Create and configure audio element
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onloadedmetadata = () => {
          setState((prev) => ({ ...prev, isLoading: false }));
        };

        audio.onplay = () => {
          setState((prev) => ({ ...prev, isPlaying: true, isPaused: false }));
          onStart?.();
        };

        audio.onpause = () => {
          if (!audio.ended) {
            setState((prev) => ({ ...prev, isPlaying: false, isPaused: true }));
          }
        };

        audio.onended = () => {
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            isPaused: false,
            progress: 1,
          }));
          onEnd?.();
          // Clean up
          if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
          }
        };

        audio.onerror = () => {
          const errorMsg = "Failed to play audio";
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isPlaying: false,
            error: errorMsg,
          }));
          onError?.(errorMsg);
        };

        audio.ontimeupdate = () => {
          if (audio.duration > 0) {
            setState((prev) => ({
              ...prev,
              progress: audio.currentTime / audio.duration,
            }));
          }
        };

        // Start playback
        await audio.play();
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Speech generation failed";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isPlaying: false,
          error: errorMsg,
        }));
        onError?.(errorMsg);
      }
    },
    [identityToken, voice, speed, onStart, onEnd, onError],
  );

  // Pause playback
  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, []);

  // Resume playback
  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
    }
  }, []);

  // Toggle play/pause
  const togglePlayback = useCallback(() => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, []);

  // Stop playback
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setState({
      isLoading: false,
      isPlaying: false,
      isPaused: false,
      error: null,
      progress: 0,
    });
    currentTextRef.current = null;
  }, []);

  // Seek to position (0 to 1)
  const seek = useCallback((position: number) => {
    if (audioRef.current && audioRef.current.duration > 0) {
      audioRef.current.currentTime = position * audioRef.current.duration;
    }
  }, []);

  return {
    ...state,
    speak,
    pause,
    resume,
    togglePlayback,
    stop,
    seek,
    currentText: currentTextRef.current,
  };
}

// Storage helpers for voice settings
const VOICE_SETTINGS_KEY = "agentinc_voice_settings";

export interface VoiceSettings {
  voice: Voice;
  speed: number;
  autoSpeak: boolean;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  voice: "nova",
  speed: 1.0,
  autoSpeak: false,
};

export function getVoiceSettings(): VoiceSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(VOICE_SETTINGS_KEY);
    return stored
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
      : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveVoiceSettings(settings: Partial<VoiceSettings>) {
  if (typeof window === "undefined") return;
  try {
    const current = getVoiceSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save voice settings:", e);
  }
}
