import type { ContractSigningData } from "./prepare-contract-draft.types";

export function contractSigningMock(tariffCode: string): ContractSigningData {
  return {
    sections: [
      {
        title: "§1. Strony umowy",
        body: "Tauron Sprzedaż sp. z o.o. (Sprzedawca) oraz Klient (Anna Kowalska) zawierają umowę sprzedaży energii elektrycznej dla punktu poboru energii (PPE) przypisanego do adresu klienta.",
      },
      {
        title: "§2. Przedmiot umowy",
        body: `Sprzedawca zobowiązuje się do sprzedaży energii elektrycznej w grupie taryfowej ${tariffCode} na warunkach opisanych w cenniku obowiązującym od 01.05.2026. Zmiana grupy taryfowej wymaga rekonfiguracji licznika po stronie OSD.`,
      },
      {
        title: "§3. Rozliczenia",
        body: "Rozliczenia prowadzone są w cyklu dwumiesięcznym na podstawie odczytów licznika. Faktura dostarczana jest w formie elektronicznej na adres e-mail klienta. Płatność następuje przelewem w terminie 14 dni od daty wystawienia faktury.",
      },
      {
        title: "§4. Czas trwania umowy",
        body: "Umowa zawarta jest na czas nieokreślony. Klient może ją wypowiedzieć z zachowaniem jednomiesięcznego okresu wypowiedzenia, ze skutkiem na koniec miesiąca kalendarzowego.",
      },
      {
        title: "§5. Prawo odstąpienia",
        body: "Klient ma prawo odstąpić od umowy w terminie 14 dni od jej zawarcia bez podania przyczyny, zgodnie z ustawą o prawach konsumenta z dnia 30 maja 2014 r.",
      },
    ],
    metadata: {
      tariffCode,
      effectiveFrom: "2026-05-01",
      customerName: "Anna Kowalska",
    },
    status: "pending",
  };
}
