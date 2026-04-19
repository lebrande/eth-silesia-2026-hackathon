import "dotenv/config";

const API = "https://api.elevenlabs.io/v1";
const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("ELEVENLABS_API_KEY missing");
  process.exit(1);
}

// Mirrors demo-pronunciations.pls. Kept in JSON form because the feasibility
// work found the add-from-rules endpoint more reliable than .pls file upload.
const rules = [
  // Brand: TAURON Polska Energia
  { string_to_replace: "Tauron", type: "alias", alias: "Tow-ron" },
  { string_to_replace: "TAURON", type: "alias", alias: "Tow-ron" },
  { string_to_replace: "Polska", type: "alias", alias: "Pole-ska" },
  // Energia: hard /g/ like in "glory"; "gh" digraph forces hard g.
  { string_to_replace: "Energia", type: "alias", alias: "en-air-ghya" },

  // Product name parts
  { string_to_replace: "Mój", type: "alias", alias: "Mooy" },

  // mObywatel: "em-Obyvatel" (letter M + Obywatel). Space forces word boundary.
  { string_to_replace: "mObywatel", type: "alias", alias: "em Obyvatel" },

  // Persona surname
  { string_to_replace: "Kowalska", type: "alias", alias: "ko-vahl-ska" },
];

const body = {
  name: `demo-pronunciations-${Date.now()}`,
  description:
    "Polish proper nouns → English-readable aliases. Used by the demo-video voiceover generator to keep an English voice from butchering brand/persona nouns.",
  rules,
};

const res = await fetch(`${API}/pronunciation-dictionaries/add-from-rules`, {
  method: "POST",
  headers: {
    "xi-api-key": key,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

if (!res.ok) {
  console.error(`Upload failed: ${res.status}`);
  console.error(await res.text());
  process.exit(1);
}

const json = await res.json();
console.log(`Upload succeeded. ${rules.length} rules.\n`);
console.log(`Paste into kuba/elevenlabs-test/.env:\n`);
console.log(`DEMO_DICTIONARY_ID=${json.id}`);
console.log(`DEMO_DICTIONARY_VERSION_ID=${json.version_id}`);
