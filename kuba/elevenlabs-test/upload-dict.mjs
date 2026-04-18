import 'dotenv/config';

const API = 'https://api.elevenlabs.io/v1';
const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error('ELEVENLABS_API_KEY missing');
  process.exit(1);
}

// Silesian → Polish-phonetic alias rules.
// Kept in sync with silesian.pls (the PLS file is retained for documentation
// and as an alternative upload path; this script uses the JSON rules endpoint
// which is more reliable).
const rules = [
  // Function / pronoun / grammar words
  { string_to_replace: 'niy',  type: 'alias', alias: 'nie' },
  { string_to_replace: 'jŏ',   type: 'alias', alias: 'jo' },
  { string_to_replace: 'ôn',   type: 'alias', alias: 'łon' },
  { string_to_replace: 'ôna',  type: 'alias', alias: 'łona' },

  // Nouns with pochylone vowels
  { string_to_replace: 'dōm',       type: 'alias', alias: 'duom' },
  { string_to_replace: 'Ślōnsk',    type: 'alias', alias: 'Ślonsk' },
  { string_to_replace: 'Ślōnska',   type: 'alias', alias: 'Ślonska' },
  { string_to_replace: 'Ślōnskŏ',   type: 'alias', alias: 'Ślonsko' },
  { string_to_replace: 'Gōrnego',   type: 'alias', alias: 'Górnego' },
  { string_to_replace: 'ksiōnżka',  type: 'alias', alias: 'książka' },
  { string_to_replace: 'ksiōnżkã',  type: 'alias', alias: 'książkę' },
  { string_to_replace: 'pŏni',      type: 'alias', alias: 'pani' },
  { string_to_replace: 'lŏt',       type: 'alias', alias: 'lot' },
  { string_to_replace: 'pōngmy',    type: 'alias', alias: 'pójdźmy' },
  { string_to_replace: 'Pōngmy',    type: 'alias', alias: 'Pójdźmy' },

  // Verbs
  { string_to_replace: 'gŏdać',  type: 'alias', alias: 'godać' },
  { string_to_replace: 'gŏdoł',  type: 'alias', alias: 'godoł' },
  { string_to_replace: 'gŏdej',  type: 'alias', alias: 'godej' },
  { string_to_replace: 'czytoł', type: 'alias', alias: 'czytał' },
  { string_to_replace: 'mōm',    type: 'alias', alias: 'mom' },
  { string_to_replace: 'mōj',    type: 'alias', alias: 'mój' },
  { string_to_replace: 'mōndry', type: 'alias', alias: 'mondry' },
  { string_to_replace: 'mnōm',   type: 'alias', alias: 'mną' },
  { string_to_replace: 'idã',    type: 'alias', alias: 'idę' },

  // Adjectives, quantifiers, time words
  { string_to_replace: 'terŏz',          type: 'alias', alias: 'teros' },
  { string_to_replace: 'Terŏz',          type: 'alias', alias: 'Teros' },
  { string_to_replace: 'mŏ',             type: 'alias', alias: 'mo' },
  { string_to_replace: 'żŏdnygo',        type: 'alias', alias: 'żadnego' },
  { string_to_replace: 'piykniyjszŏ',    type: 'alias', alias: 'piękniejsza' },
  { string_to_replace: 'nŏjpiykniyjszŏ', type: 'alias', alias: 'najpiękniejsza' },
];

const body = {
  name: `silesian-hackathon-${Date.now()}`,
  description: 'Silesian → Polish-phonetic alias rules for TTS feasibility test.',
  rules,
};

const res = await fetch(`${API}/pronunciation-dictionaries/add-from-rules`, {
  method: 'POST',
  headers: {
    'xi-api-key': key,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

if (!res.ok) {
  console.error(`Upload failed: ${res.status}`);
  console.error(await res.text());
  process.exit(1);
}

const json = await res.json();
console.log(`Upload succeeded. ${rules.length} rules. Paste these into .env:\n`);
console.log(`DICTIONARY_ID=${json.id}`);
console.log(`DICTIONARY_VERSION_ID=${json.version_id}`);
