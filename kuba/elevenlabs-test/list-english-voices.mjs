import "dotenv/config";

const API = "https://api.elevenlabs.io/v1";
const { ELEVENLABS_API_KEY } = process.env;

if (!ELEVENLABS_API_KEY) {
  console.error("ELEVENLABS_API_KEY required");
  process.exit(1);
}

const res = await fetch(`${API}/voices`, {
  headers: { "xi-api-key": ELEVENLABS_API_KEY },
});
if (!res.ok) {
  console.error(`FAIL: ${res.status} ${await res.text()}`);
  process.exit(1);
}

const { voices } = await res.json();

// Filter: English verified, likely male corporate, not Polish-tagged.
const english = voices.filter((v) => {
  const langs = (v.verified_languages || []).map((l) =>
    (l.language || l).toString().toLowerCase(),
  );
  const hasEn = langs.some((l) => l.startsWith("en"));
  return hasEn;
});

for (const v of english) {
  const langs = (v.verified_languages || [])
    .map((l) => `${l.language}${l.accent ? ":" + l.accent : ""}`)
    .join(",");
  const labels = Object.entries(v.labels || {})
    .map(([k, val]) => `${k}=${val}`)
    .join(",");
  console.log(
    `${v.voice_id}\t${v.name}\tlangs=[${langs}]\tlabels=[${labels}]`,
  );
}

console.log(`\nTotal English-verified: ${english.length} / ${voices.length}`);
