import { readFile, stat, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { CLIP_MANIFEST_PATH, DEMO_CLIPS } from "./clips.shared";

const execFileP = promisify(execFile);

type ManifestEntry = { slug: string; outputDir: string };

async function readManifest(): Promise<ManifestEntry[]> {
  try {
    const raw = await readFile(CLIP_MANIFEST_PATH, "utf8");
    return raw
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as ManifestEntry);
  } catch {
    return [];
  }
}

// yuv420p + H.264 baseline for maximum editor compatibility (DaVinci,
// Premiere, Final Cut all ingest cleanly). -an drops the silent audio track
// since Playwright videos have no sound; editors pair the MP3 in post.
async function transcodeWebmToMp4(src: string, dst: string) {
  await execFileP("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    src,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "veryfast",
    "-crf",
    "18",
    "-an",
    dst,
  ]);
}

export default async function globalTeardown() {
  const outDir = "test-results/demo-clips";
  await mkdir(outDir, { recursive: true });

  const entries = await readManifest();
  const latestBySlug = new Map<string, string>();
  for (const { slug, outputDir } of entries) {
    latestBySlug.set(slug, outputDir);
  }

  let produced = 0;
  for (const { slug } of DEMO_CLIPS) {
    const outputDir = latestBySlug.get(slug);
    if (!outputDir) continue;
    const src = join(outputDir, "video.webm");
    try {
      await stat(src);
    } catch {
      continue;
    }
    const dst = join(outDir, `${slug}.mp4`);
    try {
      await transcodeWebmToMp4(src, dst);
      produced += 1;
      console.log(`[demo-clips] ${slug}.mp4`);
    } catch (err) {
      console.error(`[demo-clips] ffmpeg failed for ${slug}:`, err);
    }
  }
  console.log(`[demo-clips] produced ${produced} / ${DEMO_CLIPS.length}`);
}
