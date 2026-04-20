import type { Page, TestInfo } from "@playwright/test";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

// Paired 1:1 with kuba/elevenlabs-test/out/{slug}.mp3.
// Durations from FSN-0026.
export const DEMO_CLIPS = [
  { slug: "customer-01-opening", mp3Seconds: 28.4 },
  { slug: "customer-02-landing-and-persona", mp3Seconds: 22.8 },
  { slug: "customer-03-turn-1-public-knowledge-no-login", mp3Seconds: 25.4 },
  {
    slug: "customer-04-turn-2-sms-challenge-and-consumption-timeline",
    mp3Seconds: 29.8,
  },
  { slug: "customer-05-turn-3-tariff-comparison", mp3Seconds: 23.0 },
  { slug: "customer-06-turn-4-contract-and-mobywatel", mp3Seconds: 33.0 },
  { slug: "customer-07-close", mp3Seconds: 14.6 },
  { slug: "backoffice-01-opening-why-a-backoffice", mp3Seconds: 18.8 },
  { slug: "backoffice-02-feature-1-dynamic-faq", mp3Seconds: 34.0 },
  { slug: "backoffice-03-feature-2-widget-builder", mp3Seconds: 41.2 },
  { slug: "backoffice-04-close", mp3Seconds: 15.8 },
] as const;

export type DemoClipSlug = (typeof DEMO_CLIPS)[number]["slug"];

export function clipFor(slug: DemoClipSlug) {
  const found = DEMO_CLIPS.find((c) => c.slug === slug);
  if (!found) throw new Error(`Unknown clip slug: ${slug}`);
  return found;
}

// Pads the test so the recorded video is ≥ MP3_DURATION + 3s.
// Call at the very end of a test, after the narrated beat is on-screen.
export async function holdForClip(
  page: Page,
  startedAt: number,
  slug: DemoClipSlug,
) {
  const { mp3Seconds } = clipFor(slug);
  const targetMs = Math.ceil(mp3Seconds * 1000) + 3_000;
  const elapsedMs = Date.now() - startedAt;
  const remainingMs = Math.max(1_000, targetMs - elapsedMs);
  await page.waitForTimeout(remainingMs);
}

export const CLIP_MANIFEST_PATH = "test-results/clip-manifest.jsonl";

// Record (slug, outputDir) so global-teardown can find video.webm reliably.
// Playwright truncates long folder names, so we can't glob-match by slug;
// testInfo.outputDir is the authoritative path.
export async function recordClipForTeardown(testInfo: TestInfo) {
  if (!DEMO_CLIPS.some((c) => c.slug === testInfo.title)) return;
  await mkdir(dirname(CLIP_MANIFEST_PATH), { recursive: true });
  const line =
    JSON.stringify({ slug: testInfo.title, outputDir: testInfo.outputDir }) +
    "\n";
  await appendFile(CLIP_MANIFEST_PATH, line);
}
