# Public assets

Files dropped here are served verbatim from the site root. Next.js does not
copy this directory into the `standalone` output automatically — the Railway
build command at `apps/main/railway.toml` must `cp -r` it into
`.next/standalone/apps/main/public` or the files 404 in production.

## Required before ship

TODO: drop real assets at these paths — fallbacks are defined in CSS but the
page looks plain without imagery:

- `hero.jpg` — landing hero background. Landscape ≥ 1920×1080, dark-friendly
  subject so white headline text stays legible over the gradient overlay.
  Target ≤ 300 KB.
- `login-bg.jpg` — login page background. ≥ 1600×1200, dark-friendly,
  portrait or landscape. Target ≤ 300 KB.
