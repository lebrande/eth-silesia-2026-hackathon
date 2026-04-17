# README

## Komendy

1. Aby uruchomić projekt z Dockera, użyj poniższej komendy:

```bash
docker compose up -d
```

2. Aby wyjść z Dockera, użyj:

```bash
docker compose down
```

3. Aby uruchomić projekt za pomocą pnpm, użyj:

```bash
pnpm dev
```

4. Aby założyć administratora w bazie, użyj:

```bash
pnpm -F main db:seed-user
```

## Dane logowania (dev)

- Email: `admin@eth-silesia.local`
- Hasło: `admin123`
