# Voice sample — unused (future work)

> **Status**: not used in the final feasibility test. The Mazovian Polish stock voice (`hIssydxXZ1WuDorjx6Ic`) produced acceptable output on its own; cloning was judged unnecessary. This directory is kept as scaffolding in case anyone later wants to pursue Instant Voice Cloning (IVC) of a native Silesian YouTube speaker to produce a more authentic Silesian accent.
>
> See [`../../thoughts/notes/elevenlabs-silesian-feasibility.md`](../../thoughts/notes/elevenlabs-silesian-feasibility.md) for the rationale.

---

If you decide to proceed with cloning later, the original protocol is below.

## Source (to fill in if activated)

- **Video URL**: `<paste YouTube URL>`
- **Speaker / channel**: `<name>`
- **Clip selected**: `<HH:MM:SS start → HH:MM:SS end>` (target 1–3 min continuous)
- **Content summary**: `<short description>`

## Consent / licensing

- **Licence**: `<standard licence / CC / direct permission / …>`
- **Scope of use**: internal hackathon evaluation only. **Not** redistributed.
- **Note**: ElevenLabs ToS requires ownership of or permission for cloned voices.

## Extraction

Prerequisites: `yt-dlp` and `ffmpeg` on PATH (`brew install yt-dlp ffmpeg` on macOS).

```bash
# From this directory.

yt-dlp -x --audio-format wav --audio-quality 0 \
  -o 'raw.%(ext)s' \
  '<youtube-url>'

# Trim + loudness-normalise + downmix to mono 44.1 kHz.
ffmpeg -i raw.wav -ss 00:00:42 -to 00:03:15 \
  -af 'loudnorm=I=-16:TP=-1.5:LRA=11' \
  -ar 44100 -ac 1 \
  sample.wav

ffmpeg -i sample.wav -codec:a libmp3lame -qscale:a 2 sample.mp3

# Sanity checks.
ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 sample.wav
ffmpeg -i sample.wav -af volumedetect -f null - 2>&1 | grep -E 'max_volume|mean_volume'
```

Listen end-to-end before uploading. Re-trim if there is music, a second voice, or clipping.

## Cloning via ElevenLabs Web UI

1. `elevenlabs.io` → **Voices** → **Add a new voice** → **Instant Voice Cloning**.
2. Name: `silesian-hackathon-<speaker-initials>`.
3. Upload `sample.mp3`.
4. Tick the ownership / consent checkbox.
5. Paste the returned `voice_id` into `../.env` as `VOICE_ID_CLONE`.

## Cloning via API (alternative)

```bash
curl -X POST https://api.elevenlabs.io/v1/voices/add \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -F "name=silesian-hackathon" \
  -F "description=Silesian TTS feasibility. Internal only." \
  -F "files=@sample.mp3"
```

Prints `{ "voice_id": "..." }` — paste into `../.env`.

## Deletion

```bash
curl -X DELETE https://api.elevenlabs.io/v1/voices/$VOICE_ID_CLONE \
  -H "xi-api-key: $ELEVENLABS_API_KEY"
rm -f sample.wav sample.mp3 raw.wav
```
