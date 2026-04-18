# Branding

Single source of truth for the app's brand identity.

To rebrand the app:

1. Edit `config.ts` — name, copy, colors, font.
2. Replace `logo.svg`, `icon.png` (512×512), `apple-icon.png` (180×180).
3. Update `--color-primary` in `src/app/globals.css` to match `theme.primary`.
4. `pnpm -F main dev` and verify.

The OpenGraph share image is generated on the fly from `config.ts` by
`src/app/opengraph-image.tsx` — no file to replace.
