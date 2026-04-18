"use client";

import { useEffect, useRef, useState } from "react";
import { synthesizeSpeechAction } from "@/lib/actions/tts.action";

type Status = "idle" | "loading" | "playing" | "error";

const cache = new Map<string, string>();
let activeAudio: HTMLAudioElement | null = null;
let stopActive: (() => void) | null = null;

export function useReadAloud(text: string) {
  const [status, setStatus] = useState<Status>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current && audioRef.current === activeAudio) {
        activeAudio.pause();
        activeAudio = null;
        stopActive = null;
      }
    };
  }, []);

  async function play() {
    if (status === "playing") {
      audioRef.current?.pause();
      setStatus("idle");
      return;
    }

    stopActive?.();

    let url = cache.get(text);
    if (!url) {
      setStatus("loading");
      try {
        const { audio, mimeType } = await synthesizeSpeechAction(text);
        const bytes = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: mimeType });
        url = URL.createObjectURL(blob);
        cache.set(text, url);
      } catch (err) {
        console.error("[read-aloud] synth failed:", err);
        setStatus("error");
        setTimeout(() => setStatus("idle"), 1500);
        return;
      }
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    activeAudio = audio;
    stopActive = () => {
      audio.pause();
      setStatus("idle");
    };
    audio.onended = () => {
      if (activeAudio === audio) {
        activeAudio = null;
        stopActive = null;
      }
      setStatus("idle");
    };
    audio.onerror = () => {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1500);
    };
    setStatus("playing");
    try {
      await audio.play();
    } catch (err) {
      console.error("[read-aloud] playback failed:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1500);
    }
  }

  return { status, play };
}
