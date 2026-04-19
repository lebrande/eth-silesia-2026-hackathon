import "dotenv/config";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const API = "https://api.elevenlabs.io/v1";
const {
  ELEVENLABS_API_KEY,
  DEMO_DICTIONARY_ID,
  DEMO_DICTIONARY_VERSION_ID,
} = process.env;

if (!ELEVENLABS_API_KEY) {
  console.error("ELEVENLABS_API_KEY required");
  process.exit(1);
}

const VOICE_ID = "onwK4e9ZLuTAKqWW03F9"; // Daniel — Steady Broadcaster (en-GB)

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const outDir = resolve(here, "out");

const SCRIPTS = [
  {
    key: "customer",
    path: resolve(repoRoot, "thoughts/notes/demo-video/customer-script.md"),
  },
  {
    key: "backoffice",
    path: resolve(repoRoot, "thoughts/notes/demo-video/backoffice-script.md"),
  },
];

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyScript = (() => {
  const a = args.find((x) => x.startsWith("--script="));
  return a ? a.slice("--script=".length) : null;
})();

function slugify(header) {
  // "## [0:40–1:10] Turn 1 — public knowledge, no login" → "turn-1-public-knowledge-no-login"
  // Strips leading "## ", strips time-range brackets, strips em/en dashes, kebab-cases.
  return header
    .replace(/^##\s+/, "")
    .replace(/\[[^\]]*\]/g, "") // [0:00–0:15]
    .replace(/[–—−]/g, "-") // en/em/minus → ascii hyphen
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function parseBlocks(markdown) {
  const lines = markdown.split("\n");
  const blocks = [];
  let currentHeader = "intro";
  let blockIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      currentHeader = line;
      continue;
    }
    if (line.trim() === "```voiceover") {
      const textLines = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "```") {
        textLines.push(lines[i]);
        i++;
      }
      blockIndex++;
      blocks.push({
        index: blockIndex,
        slug: slugify(currentHeader),
        text: textLines.join("\n").trim(),
      });
    }
  }
  return blocks;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function renderOnce(text) {
  const body = {
    text,
    model_id: "eleven_v3",
    ...(DEMO_DICTIONARY_ID && DEMO_DICTIONARY_VERSION_ID
      ? {
          pronunciation_dictionary_locators: [
            {
              pronunciation_dictionary_id: DEMO_DICTIONARY_ID,
              version_id: DEMO_DICTIONARY_VERSION_ID,
            },
          ],
        }
      : {}),
  };
  const res = await fetch(`${API}/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${res.status} ${detail}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function renderWithRetry(text) {
  try {
    return await renderOnce(text);
  } catch (e) {
    console.warn(`    transient: ${e.message} — retrying in 2s`);
    await new Promise((r) => setTimeout(r, 2000));
    return renderOnce(text);
  }
}

await mkdir(outDir, { recursive: true });

let wrote = 0;
let skipped = 0;
let failed = 0;

for (const script of SCRIPTS) {
  if (onlyScript && script.key !== onlyScript) continue;
  console.log(`\n=== ${script.key} ===`);
  const md = await readFile(script.path, "utf8");
  const blocks = parseBlocks(md);
  console.log(`  ${blocks.length} blocks`);

  for (const b of blocks) {
    const nn = String(b.index).padStart(2, "0");
    const filename = `${script.key}-${nn}-${b.slug}.mp3`;
    const filepath = resolve(outDir, filename);

    if (!force && (await exists(filepath))) {
      console.log(`  skip   ${filename}`);
      skipped++;
      continue;
    }

    console.log(`  render ${filename} (${b.text.split(/\s+/).length} words)`);
    try {
      const buf = await renderWithRetry(b.text);
      await writeFile(filepath, buf);
      console.log(`         wrote ${buf.length} bytes`);
      wrote++;
    } catch (e) {
      console.error(`         FAIL ${e.message}`);
      failed++;
    }
  }
}

console.log(
  `\nDone. wrote=${wrote} skipped=${skipped} failed=${failed}${force ? " (forced)" : ""}`,
);
if (failed > 0) process.exit(1);
