# Silesian test corpus

**Orthography**: Ślabikŏrzowy szrajbōnek (modern standard, adopted 2010, used on Silesian Wikipedia).

**Grading**: 1 → 12, easy → hard for a Polish-detecting TTS.

- Sentence 1 is the "near-pass" baseline — no Silesian-specific characters.
- Sentences 9 and 11 are the strongest "fail" signals — they stack multiple diagnostic characters.
- Each row lists which characters the sentence specifically stresses, so you can attribute any audible artifact to a concrete grapheme.

## Sentences

| # | Silesian | Polish | English | IPA cue | Diagnostic chars |
|---|----------|--------|---------|---------|------------------|
| 1 | Witej! Jako ci sie darzi? | Cześć! Jak ci idzie? | Hello! How's it going? | [ˈvitɛj ˈjakɔ tɕi ɕɛ ˈdaʐɨ] | none — baseline |
| 2 | Dobry dziyń, pŏni! | Dzień dobry, pani! | Good day, ma'am! | [ˈdɔbrɨ ˈdʑɨɲ ˈpɔɲi] | ŏ |
| 3 | Jŏ żech je z Gōrnego Ślōnska. | Jestem z Górnego Śląska. | I am from Upper Silesia. | [jɔ ʐɛx jɛ z ˈɡornɛɡɔ ˈɕlɔnska] | ŏ, ō (×2) |
| 4 | Ślōnskŏ gŏdka je nŏjpiykniyjszŏ na świecie. | Śląski jest najpiękniejszy na świecie. | Silesian is the most beautiful in the world. | [ˈɕlɔnskaʊ̯ ˈɡɔtka jɛ ˈnɔjpʲikɲɨjʂaʊ̯ na ˈɕfʲɛtɕɛ] | ō, ŏ (×4) |
| 5 | Terŏz idã do dōm. | Teraz idę do domu. | Now I'm going home. | [ˈtɛrɔu̯ ˈidã dɔ dom] | ŏ, ã, ō |
| 6 | Mōj chop je fest mōndry. | Mój mąż jest bardzo mądry. | My husband is very smart. | [moj xɔp jɛ fɛst ˈmɔndrɨ] | ō (×2), German loans (chop, fest) |
| 7 | Tyn bajtel mŏ piyńć lŏt. | To dziecko ma pięć lat. | This kid is five years old. | [tɨn ˈbajtɛl mɔ pʲiɲtɕ lɔt] | ŏ (×2), German loan (bajtel) |
| 8 | Niy ma tu żŏdnygo chlyba. | Nie ma tu żadnego chleba. | There's no bread here. | [ɲij ma tu ˈʐɔdnɨɡɔ ˈxlɨba] | niy, ŏ |
| 9 | Ôn czytoł ksiōnżkã i gŏdoł ze mnōm. | On czytał książkę i rozmawiał ze mną. | He was reading a book and talking with me. | [wɔn ˈtʂɨtɔw kɕɔnʐkã i ˈɡɔdɔw zɛ ˈmnɔm] | ô, ō (×2), ã, ŏ — **max diagnostic** |
| 10 | Pōngmy na szpacyr, bo pogoda je piykno. | Chodźmy na spacer, bo pogoda jest ładna. | Let's go for a walk, the weather is nice. | [ˈpɔnɡmɨ na ˈʂpatsɨr bɔ pɔˈɡɔda jɛ ˈpʲiknɔ] | ō, German loan (szpacyr) |
| 11 | Niy gŏdej mi, co mōm robić! | Nie mów mi, co mam robić! | Don't tell me what to do! | [ɲij ˈɡɔdɛj mi tsɔ mɔm rɔˈbʲitɕ] | niy, ŏ, ō — **two markers back-to-back** |
| 12 | Kamrat, pōngmy razem do roboty, bo terŏz je nieskory. | Kolego, chodźmy razem do pracy, bo teraz jest późno. | Friend, let's go to work together, it's late now. | [ˈkamrat ˈpɔnɡmɨ ˈrazɛm dɔ rɔˈbɔtɨ bɔ ˈtɛrɔu̯ jɛ ɲɛˈskɔrɨ] | ō, ŏ, German loans (kamrat, nieskory) |

## Per-character expected failure modes on a Polish TTS

| Character | Silesian target phoneme | Polish TTS likely behavior |
|-----------|------------------------|----------------------------|
| **ō** | /o/ leaning /u/ — historical long o | Diacritic stripped → plain /o/. Wrong vowel quality but not silence. |
| **ŏ** | /ɔu̯/ (Opole) or /ɔ/ | Diacritic stripped → plain /o/. "gŏdać" read as "godać". |
| **ã** | /ã/ — nasalized /a/ | Diacritic stripped → plain /a/. All nasal quality lost. |
| **ô** | /wɔ/ — labial onset | Unknown; likely dropped. "Ôn" read as "n" or "on" instead of "won". |
| **õ** | /ɔ̃/ — nasalized /ɔ/ | Diacritic stripped → plain /o/. Nasal quality lost. |
| **niy** | /ɲi/ — Silesian negation | Read as /nɨ/ rather than the intended /ɲi/ (or /ɲɛ/ as in Polish "nie"). |
| German loans (bajtel, fest, kamrat, szpacyr) | Polish-phonetic spelling | Mostly fine — these are already written phonetically for Polish readers. |

## Silesian ↔ Polish vocabulary quick-reference

| Silesian | Polish | Gloss |
|----------|--------|-------|
| gŏdać | gadać | to talk, say |
| gŏdoł | gadał | he talked, said |
| dōm | dom | home |
| Ślōnsk | Śląsk | Silesia |
| Ślōnska (gen.) | Śląska | of Silesia |
| Ślōnskŏ | Śląska (fem.) | Silesian (adj.) |
| chop | mąż / chłop | man, husband |
| niy | nie | no, not |
| jŏ | ja | I |
| ôn / ôna | on / ona | he / she |
| bajtel | dziecko | child (from German *Beutel*) |
| fest | bardzo | very (from German *fest*) |
| kamrat | kolega | friend (from German *Kamerad*) |
| terŏz | teraz | now |
| nieskory | późno | late |
| szpacyr | spacer | walk (from German *Spaziergang*) |
| mōj | mój | my |
| mōm | mam | I have |
| mnōm | mną | me (instr.) |
| ksiōnżka | książka | book |
| idã | idę | I go |
| piykniyjszŏ | piękniejsza | more beautiful (fem.) |
| nŏjpiykniyjszŏ | najpiękniejsza | most beautiful (fem.) |
| żŏdnygo | żadnego | no-one's, none's |
| czytoł | czytał | he read |
| pōngmy | pójdźmy | let's go |
| dziyń | dzień | day |
| pŏni | pani | ma'am |
| żech | — | aux. (first-person marker) |
| piyńć | pięć | five |
| lŏt | lat | years |
| chlyba | chleba | bread (gen.) |

## Notes

- Silesian has several regional variants; the Opole and Upper Silesian usages differ on some vowels (ŏ ranges from /ɔu̯/ to /ɔ/). The IPA cues in the table lean Upper Silesian where there's ambiguity.
- Some writers use `ô` word-initially to mark a labial onset (/wɔ/); others drop it. Modern Ślabikŏrzowy keeps it.
- The German loans (chop, fest, kamrat, szpacyr, bajtel, nieskory) are written phonetically for Polish readers, so a Polish-detected TTS should read them adequately. Audible mismatches on these words are NOT diagnostic of the Silesian problem — focus the perceptual test on ō, ŏ, ã, ô.

## References

- [Silesian language (Wikipedia)](https://en.wikipedia.org/wiki/Silesian_language)
- [Silesian orthography (Wikipedia)](https://en.wikipedia.org/wiki/Silesian_orthography)
- [Silesian pronunciation (Wikibooks)](https://en.wikibooks.org/wiki/Silesian/Pronunciation)
- [Silesian alphabet (Omniglot)](https://www.omniglot.com/writing/silesian.php)
- [Silling — Silesian language corpus](https://silling.org/information-about-the-silesian-language-corpus-in-english/)
