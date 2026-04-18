import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { BRAND } from "@/branding/config";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <section className="px-6 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-4 text-4xl font-semibold md:text-5xl">
              {BRAND.fullName}
            </h1>
            <p className="mb-8 text-lg text-muted-foreground md:text-xl">
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
                className="text-base font-medium text-foreground hover:text-primary"
              >
                Jak to działa →
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-white px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-10 text-center text-2xl font-semibold">
              Co potrafi nasz asystent
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              <Feature
                title="Faktury i płatności"
                body="Sprawdź saldo, terminy płatności i pobierz duplikat faktury bez logowania do eBOK."
              />
              <Feature
                title="Zgłoszenia i umowy"
                body="Zgłoś awarię, sprawdź status wniosku lub zadaj pytanie o warunki umowy — 24/7."
              />
              <Feature
                title="Przekazanie do konsultanta"
                body="Gdy sprawa wymaga człowieka, asystent weryfikuje numer telefonu i przekazuje zgłoszenie dalej."
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
                body="Opisz swoją sprawę w naturalnym języku — tak jak rozmawiałbyś z konsultantem."
              />
              <Step
                n={2}
                title="Otrzymaj odpowiedź"
                body="Asystent przeszukuje bazę FAQ i dane konta, aby udzielić precyzyjnej odpowiedzi."
              />
              <Step
                n={3}
                title="Załatw sprawę"
                body="Jeżeli potrzeba — potwierdź numer telefonu i przekaż zgłoszenie konsultantowi."
              />
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-white px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 text-sm text-muted-foreground md:flex-row">
          <span>
            © {new Date().getFullYear()} {BRAND.fullName}
          </span>
          <span>Wersja demo — dane przykładowe</span>
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
