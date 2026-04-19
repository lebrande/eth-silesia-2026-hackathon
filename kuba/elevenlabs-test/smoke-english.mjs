import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";

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

// Slowed-down corpus with ellipses, paragraph breaks, [short pause] tags.
// Exercises every Polish proper noun that appears in the full scripts.
const text = [
  "[professional] Meet Mój Tauron AI... a virtual energy advisor from TAURON Polska Energia.",
  "",
  "[short pause]",
  "",
  "After a one-time SMS verification, the assistant reads Anna Kowalska's consumption history, explains why her bill spiked in October, and signs her new G13 tariff contract... directly with mObywatel.",
  "",
  "[short pause]",
  "",
  "No forms. No call center. Just a chat, a chart, and a signature.",
  "",
  "[short pause]",
  "",
  "[confident] Built for the TAURON track at ETH Silesia 2026.",
].join("\n");

const dictLocators =
  DEMO_DICTIONARY_ID && DEMO_DICTIONARY_VERSION_ID
    ? [
        {
          pronunciation_dictionary_id: DEMO_DICTIONARY_ID,
          version_id: DEMO_DICTIONARY_VERSION_ID,
        },
      ]
    : [];

await mkdir(new URL("./out/", import.meta.url), { recursive: true });

// Render two variants for direct A/B: with and without the Polish-noun dict.
const variants = [
  { slug: "daniel-no-dict", locators: [] },
  ...(dictLocators.length
    ? [{ slug: "daniel-with-dict", locators: dictLocators }]
    : []),
];

for (const v of variants) {
  console.log(`→ ${v.slug}`);
  const body = {
    text,
    model_id: "eleven_v3",
    ...(v.locators.length
      ? { pronunciation_dictionary_locators: v.locators }
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
    console.error(`  FAIL: ${res.status} ${await res.text()}`);
    continue;
  }
  const out = new URL(`./out/smoke-english-${v.slug}.mp3`, import.meta.url);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(out, buf);
  console.log(`  wrote ${out.pathname} (${buf.length} bytes)`);
}
