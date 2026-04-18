import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type DateLike = Date | string | number;

function toDate(v: DateLike): Date {
  return v instanceof Date ? v : new Date(v);
}

export function formatDateTime(v: DateLike) {
  return toDate(v).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(v: DateLike) {
  return toDate(v).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatShortDate(v: DateLike) {
  return toDate(v).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "short",
  });
}

export function formatRelative(v: DateLike) {
  const d = toDate(v).getTime();
  const now = Date.now();
  const diff = now - d;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "przed chwilą";
  if (mins < 60) return `${mins} min temu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} godz. temu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} dni temu`;
  return formatDate(v);
}

export function formatMs(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function formatPercent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Skraca UUID / długi identyfikator do "abc…xyz" dla UI.
 */
export function shortId(id: string, head = 6, tail = 4) {
  if (!id) return "";
  if (id.length <= head + tail + 1) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}
