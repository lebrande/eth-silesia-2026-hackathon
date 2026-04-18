"use client";

import { useReadAloud } from "@/lib/client/use-read-aloud.client";

export function ReadAloudButton({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const { status, play } = useReadAloud(text);

  return (
    <button
      type="button"
      onClick={play}
      disabled={status === "loading"}
      aria-label={status === "playing" ? "Zatrzymaj odczyt" : "Odczytaj"}
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center text-current opacity-60 transition hover:opacity-100 disabled:opacity-40 ${className}`}
    >
      {status === "loading" && <SpinnerIcon />}
      {status === "playing" && <StopIcon />}
      {status === "error" && <ErrorIcon />}
      {status === "idle" && <SpeakerIcon />}
    </button>
  );
}

function SpeakerIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.22-8.56" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
