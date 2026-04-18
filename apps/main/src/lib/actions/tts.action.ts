"use server";

import { synthesizeSpeech } from "@/lib/server/elevenlabs.server";

const MAX_TEXT_LENGTH = 2000;

export type SynthesizeSpeechResult = {
  audio: string;
  mimeType: "audio/mpeg";
};

export async function synthesizeSpeechAction(
  text: string,
): Promise<SynthesizeSpeechResult> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("text is required");
  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new Error("text too long");
  }

  const buf = await synthesizeSpeech(trimmed);
  return { audio: buf.toString("base64"), mimeType: "audio/mpeg" };
}
