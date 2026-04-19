<?xml version="1.0" encoding="UTF-8"?>
<lexicon version="1.0"
         xmlns="http://www.w3.org/2005/01/pronunciation-lexicon"
         alphabet="ipa"
         xml:lang="en-US">

  <!--
    Polish proper-noun alias rules for English-narrated demo videos.

    Base voice: Daniel (en-GB, formal broadcaster). Reads English fluently but
    has no chance of pronouncing Polish proper nouns correctly. Aliases respell
    each target word in English-readable phonetics.

    Aliases are whole-word, case-sensitive. "Tauron" and "TAURON" need separate
    entries; "mObywatel" is single-case so one entry suffices.

    This file documents the rules; upload happens via upload-demo-dict.mjs,
    which uses the /v1/pronunciation-dictionaries/add-from-rules JSON endpoint
    (see upload-dict.mjs for the pattern).
  -->

  <!-- Brand: TAURON Polska Energia -->
  <lexeme><grapheme>Tauron</grapheme><alias>Tow-ron</alias></lexeme>
  <lexeme><grapheme>TAURON</grapheme><alias>Tow-ron</alias></lexeme>
  <lexeme><grapheme>Polska</grapheme><alias>Pole-ska</alias></lexeme>
  <!-- Energia: hard /g/ like in "glory". "gh" digraph forces hard g in English TTS. -->
  <lexeme><grapheme>Energia</grapheme><alias>en-air-ghya</alias></lexeme>

  <!-- Product name parts -->
  <!-- Mój = /muj/ → "Mooy". -->
  <lexeme><grapheme>Mój</grapheme><alias>Mooy</alias></lexeme>

  <!-- mObywatel: pronounced "em-Obyvatel" (letter M + Obywatel). Space in
       alias forces word boundary so the TTS says "em" as a letter name. -->
  <lexeme><grapheme>mObywatel</grapheme><alias>em Obyvatel</alias></lexeme>

  <!-- Persona surname -->
  <lexeme><grapheme>Kowalska</grapheme><alias>ko-vahl-ska</alias></lexeme>

</lexicon>
