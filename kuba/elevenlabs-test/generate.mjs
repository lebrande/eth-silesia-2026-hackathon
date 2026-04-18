import 'dotenv/config';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { sentences } from './sentences.mjs';

const API = 'https://api.elevenlabs.io/v1';
const { ELEVENLABS_API_KEY, VOICE_ID_STOCK, VOICE_ID_CLONE } = process.env;

if (!ELEVENLABS_API_KEY || !VOICE_ID_STOCK) {
  console.error('ELEVENLABS_API_KEY and VOICE_ID_STOCK are required');
  process.exit(1);
}

const voices = [
  { label: 'stock', id: VOICE_ID_STOCK },
  ...(VOICE_ID_CLONE ? [{ label: 'clone', id: VOICE_ID_CLONE }] : []),
];

// Dictionary variants removed — tested and judged to degrade output (aliases
// push pronunciation away from Silesian toward a Polish-normalised form,
// which loses the distinctive vowel colouring). The silesian.pls file and
// upload-dict.mjs are kept in the repo for reference / future experiments.
const variants = [
  {
    key: 'v3-raw',
    body: (t) => ({ text: t, model_id: 'eleven_v3' }),
  },
  {
    key: 'flash-raw',
    body: (t) => ({
      text: t,
      model_id: 'eleven_flash_v2_5',
      language_code: 'pl',
    }),
  },
];

await mkdir(new URL('./out/', import.meta.url), { recursive: true });

console.log(`Voices: ${voices.map((v) => v.label).join(', ')}`);
console.log(`Sentences: ${sentences.length}`);
console.log('');

let wrote = 0;
let skipped = 0;
let failed = 0;

for (const s of sentences) {
  for (const voice of voices) {
    for (const v of variants) {
      const tag = `${s.id}-${voice.label}-${v.key}`;
      const path = new URL(`./out/${tag}.mp3`, import.meta.url);
      try {
        await access(path);
        console.log(`exists ${tag}`);
        skipped++;
        continue;
      } catch {}

      const res = await fetch(`${API}/text-to-speech/${voice.id}`, {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify(v.body(s.text)),
      });
      if (!res.ok) {
        console.error(`FAIL ${tag}: ${res.status} ${await res.text()}`);
        failed++;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(path, buf);
      console.log(`wrote ${tag} (${buf.length} bytes)`);
      wrote++;
    }
  }
}

console.log('');
console.log(`Done. wrote=${wrote} skipped=${skipped} failed=${failed}`);
