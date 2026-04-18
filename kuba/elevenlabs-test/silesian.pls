<?xml version="1.0" encoding="UTF-8"?>
<lexicon version="1.0"
         xmlns="http://www.w3.org/2005/01/pronunciation-lexicon"
         alphabet="ipa"
         xml:lang="pl-PL">

  <!--
    Silesian → Polish-phonetic alias rules.

    ElevenLabs supports alias-style <lexeme> entries across all models.
    The `alphabet="ipa"` attribute is required by PLS but irrelevant for
    alias rules (no <phoneme> elements here).

    Rules are whole-word grapheme → Polish-phonetic respelling. Each word
    in the Silesian test corpus that contains ō, ŏ, ã, ô, õ, or a
    Silesian-specific spelling (niy, jŏ, ôn…) is covered.
  -->

  <!-- Silesian function / pronoun / grammar words -->
  <lexeme><grapheme>niy</grapheme><alias>nie</alias></lexeme>
  <lexeme><grapheme>jŏ</grapheme><alias>jo</alias></lexeme>
  <lexeme><grapheme>ôn</grapheme><alias>łon</alias></lexeme>
  <lexeme><grapheme>ôna</grapheme><alias>łona</alias></lexeme>

  <!-- Nouns with pochylone vowels -->
  <lexeme><grapheme>dōm</grapheme><alias>duom</alias></lexeme>
  <lexeme><grapheme>Ślōnsk</grapheme><alias>Ślonsk</alias></lexeme>
  <lexeme><grapheme>Ślōnska</grapheme><alias>Ślonska</alias></lexeme>
  <lexeme><grapheme>Ślōnskŏ</grapheme><alias>Ślonsko</alias></lexeme>
  <lexeme><grapheme>Gōrnego</grapheme><alias>Górnego</alias></lexeme>
  <lexeme><grapheme>ksiōnżka</grapheme><alias>książka</alias></lexeme>
  <lexeme><grapheme>ksiōnżkã</grapheme><alias>książkę</alias></lexeme>
  <lexeme><grapheme>pŏni</grapheme><alias>pani</alias></lexeme>
  <lexeme><grapheme>lŏt</grapheme><alias>lot</alias></lexeme>
  <lexeme><grapheme>pōngmy</grapheme><alias>pójdźmy</alias></lexeme>
  <lexeme><grapheme>Pōngmy</grapheme><alias>Pójdźmy</alias></lexeme>

  <!-- Verbs -->
  <lexeme><grapheme>gŏdać</grapheme><alias>godać</alias></lexeme>
  <lexeme><grapheme>gŏdoł</grapheme><alias>godoł</alias></lexeme>
  <lexeme><grapheme>gŏdej</grapheme><alias>godej</alias></lexeme>
  <lexeme><grapheme>czytoł</grapheme><alias>czytał</alias></lexeme>
  <lexeme><grapheme>mōm</grapheme><alias>mom</alias></lexeme>
  <lexeme><grapheme>mōj</grapheme><alias>mój</alias></lexeme>
  <lexeme><grapheme>mōndry</grapheme><alias>mondry</alias></lexeme>
  <lexeme><grapheme>mnōm</grapheme><alias>mną</alias></lexeme>
  <lexeme><grapheme>idã</grapheme><alias>idę</alias></lexeme>

  <!-- Adjectives, quantifiers, and time words -->
  <lexeme><grapheme>terŏz</grapheme><alias>teros</alias></lexeme>
  <lexeme><grapheme>Terŏz</grapheme><alias>Teros</alias></lexeme>
  <lexeme><grapheme>mŏ</grapheme><alias>mo</alias></lexeme>
  <lexeme><grapheme>żŏdnygo</grapheme><alias>żadnego</alias></lexeme>
  <lexeme><grapheme>piykniyjszŏ</grapheme><alias>piękniejsza</alias></lexeme>
  <lexeme><grapheme>nŏjpiykniyjszŏ</grapheme><alias>najpiękniejsza</alias></lexeme>

  <!--
    German-origin Silesian vocabulary.
    These are already spelled phonetically for Polish readers, so the alias
    equals the grapheme. Rules included for completeness / documentation
    so the dictionary is a complete map of corpus vocabulary.
  -->
  <lexeme><grapheme>bajtel</grapheme><alias>bajtel</alias></lexeme>
  <lexeme><grapheme>chop</grapheme><alias>chop</alias></lexeme>
  <lexeme><grapheme>fest</grapheme><alias>fest</alias></lexeme>
  <lexeme><grapheme>szpacyr</grapheme><alias>szpacyr</alias></lexeme>
  <lexeme><grapheme>kamrat</grapheme><alias>kamrat</alias></lexeme>
  <lexeme><grapheme>Kamrat</grapheme><alias>Kamrat</alias></lexeme>
  <lexeme><grapheme>nieskory</grapheme><alias>nieskory</alias></lexeme>

</lexicon>
