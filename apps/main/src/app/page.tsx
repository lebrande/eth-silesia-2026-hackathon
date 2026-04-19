import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { BRAND } from "@/branding/config";
import homeBackground from "@/branding/logog_background.png";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <section className="relative isolate overflow-hidden bg-primary/15 px-6 py-20 md:py-28">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-cover bg-center"
            style={{ backgroundImage: `url(${homeBackground.src})` }}
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-linear-to-b from-black/55 via-black/35 to-black/20"
          />
          <div className="mx-auto max-w-3xl text-center text-white">
            <h1 className="mb-4 text-4xl font-semibold md:text-5xl">
              {BRAND.fullName}
            </h1>
            <p className="mb-8 text-lg text-white/85 md:text-xl">
              {BRAND.tagline}. Uzyskaj odpowiedź na pytanie o fakturę,
              licznik lub umowę w kilka sekund — bez czekania na konsultanta.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/agent"
                className="rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90"
              >
                Porozmawiaj z asystentem
              </Link>
              <Link
                href="#jak-to-dziala"
                className="text-base font-medium text-white/90 hover:text-white"
              >
                Jak to działa →
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-white px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-10 text-center text-2xl font-semibold">
              Co potrafi nasz asystent
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Feature
                title="Porównanie taryf G11/G12/G13"
                body="Policzymy, która taryfa będzie dla Ciebie najtańsza na podstawie Twojego profilu zużycia."
              />
              <Feature
                title="Analiza zużycia"
                body="Zobacz miesięczny rozkład zużycia energii i anomalie, które warto sprawdzić."
              />
              <Feature
                title="Zmiana umowy online"
                body="Podpisz nową umowę bez wychodzenia z czatu — z potwierdzeniem kodem SMS."
              />
              <Feature
                title="Głos i gwara śląska"
                body="Odsłuchaj odpowiedzi asystenta i przełącz rozmowę na gwarę śląską."
              />
            </div>
          </div>
        </section>

        <section
          id="jak-to-dziala"
          className="border-t border-border px-6 py-16"
        >
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-10 text-center text-2xl font-semibold">
              Jak to działa
            </h2>
            <ol className="grid gap-6 md:grid-cols-3">
              <Step
                n={1}
                title="Zadaj pytanie"
                body="Opisz swoją sprawę w naturalnym języku."
              />
              <Step
                n={2}
                title="Zobacz odpowiedź i widżet"
                body="Asystent odpowiada tekstem i pokazuje interaktywny widżet (np. porównanie taryf)."
              />
              <Step
                n={3}
                title="Potwierdź i zakończ"
                body="Jeżeli potrzeba — potwierdź kodem SMS i sprawa jest załatwiona."
              />
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-white px-6 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-center text-sm text-muted-foreground">
          <span>
            © {new Date().getFullYear()} {BRAND.fullName}
          </span>
        </div>
      </footer>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 card-shadow">
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex flex-col gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        {n}
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </li>
  );
}
