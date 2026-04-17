import { STORE } from "./chat.constants";
import { buildComponent } from "./chat.components";
import { injectVariables } from "@/lib/prompts.shared";

export const SUPPORTED_LANGUAGES = [
  "pl",
  "en",
  "de",
  "lt",
  "ua",
  "ro",
  "hu",
  "cs",
] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

type MessageKey =
  | "blocked"
  | "spam"
  | "escalation"
  | "request_phone"
  | "verify_phone_success"
  | "verify_phone_not_found"
  | "verify_code_invalid"
  | "verify_code_failed";

export const MESSAGES: Record<MessageKey, Record<Language, string>> = {
  blocked: {
    pl: "Ta rozmowa została zamknięta.",
    en: "This conversation has been closed.",
    de: "Diese Konversation wurde geschlossen.",
    lt: "Šis pokalbis buvo uždarytas.",
    ua: "Цю розмову було закрито.",
    ro: "Această conversație a fost închisă.",
    hu: "Ez a beszélgetés lezárásra került.",
    cs: "Tato konverzace byla uzavřena.",
  },
  spam: {
    pl: "Nie rozumiem tej wiadomości. W czym mogę Ci pomóc w związku z naszym sklepem?",
    en: "I didn't understand that message. How can I help you with our store?",
    de: "Ich habe diese Nachricht nicht verstanden. Wie kann ich Ihnen bei unserem Shop helfen?",
    lt: "Nesupratau šios žinutės. Kuo galiu padėti dėl mūsų parduotuvės?",
    ua: "Я не зрозумів це повідомлення. Чим можу допомогти щодо нашого магазину?",
    ro: "Nu am înțeles acest mesaj. Cum vă pot ajuta în legătură cu magazinul nostru?",
    hu: "Nem értettem ezt az üzenetet. Miben segíthetek az üzletünkkel kapcsolatban?",
    cs: "Této zprávě jsem nerozuměl. Jak vám mohu pomoci s naším obchodem?",
  },
  escalation: {
    pl: "W tej sytuacji warto skontaktować się z naszym zespołem przez WhatsApp\n${whatsappComponent}\n\nNasz zespół jest dostępny od poniedziałku do piątku w godzinach 9:00-17:00.",
    en: "In this case it's best to contact our team via WhatsApp\n${whatsappComponent}\n\nOur team is available Monday to Friday, 9:00-17:00.",
    de: "In diesem Fall wenden Sie sich am besten über WhatsApp an unser Team\n${whatsappComponent}\n\nUnser Team ist erreichbar Montag bis Freitag, 9:00-17:00 Uhr.",
    lt: "Šiuo atveju geriausia susisiekti su mūsų komanda per WhatsApp\n${whatsappComponent}\n\nMūsų komanda pasiekiama nuo pirmadienio iki penktadienio, 9:00-17:00.",
    ua: "У цьому випадку найкраще зв'язатися з нашою командою через WhatsApp\n${whatsappComponent}\n\nНаша команда доступна з понеділка по п'ятницю, 9:00-17:00.",
    ro: "În această situație cel mai bine este să contactați echipa noastră prin WhatsApp\n${whatsappComponent}\n\nEchipa noastră este disponibilă de luni până vineri, 9:00-17:00.",
    hu: "Ebben az esetben a legjobb, ha felveszi a kapcsolatot csapatunkkal WhatsApp-on\n${whatsappComponent}\n\nCsapatunk elérhető hétfőtől péntekig, 9:00-17:00.",
    cs: "V tomto případě je nejlepší kontaktovat náš tým přes WhatsApp\n${whatsappComponent}\n\nNáš tým je k dispozici pondělí až pátek, 9:00-17:00.",
  },
  request_phone: {
    pl: "Aby sprawdzić Twoje zamówienie, potrzebuję numer telefonu, który podałeś/aś przy zamówieniu.",
    en: "To check your order, I need the phone number you used when placing the order.",
    de: "Um Ihre Bestellung zu prüfen, benötige ich die Telefonnummer, die Sie bei der Bestellung angegeben haben.",
    lt: "Norėdamas patikrinti jūsų užsakymą, man reikia telefono numerio, kurį nurodėte užsakydami.",
    ua: "Щоб перевірити ваше замовлення, мені потрібен номер телефону, який ви вказали при оформленні замовлення.",
    ro: "Pentru a verifica comanda dvs., am nevoie de numărul de telefon pe care l-ați folosit la plasarea comenzii.",
    hu: "A rendelés ellenőrzéséhez szükségem van a telefonszámra, amelyet a rendeléskor megadott.",
    cs: "Pro ověření vaší objednávky potřebuji telefonní číslo, které jste zadali při objednávce.",
  },
  verify_phone_success: {
    pl: "Wysłaliśmy kod weryfikacyjny SMS na podany numer. Wpisz otrzymany 6-cyfrowy kod.",
    en: "We've sent a verification code via SMS to your number. Please enter the 6-digit code you received.",
    de: "Wir haben einen Bestätigungscode per SMS an Ihre Nummer gesendet. Bitte geben Sie den 6-stelligen Code ein.",
    lt: "Išsiuntėme patvirtinimo kodą SMS žinute į jūsų numerį. Įveskite gautą 6 skaitmenų kodą.",
    ua: "Ми надіслали код підтвердження SMS на ваш номер. Введіть отриманий 6-значний код.",
    ro: "Am trimis un cod de verificare prin SMS la numărul dvs. Vă rugăm să introduceți codul din 6 cifre primit.",
    hu: "Elküldtük az ellenőrző kódot SMS-ben a megadott számra. Kérem, írja be a kapott 6 jegyű kódot.",
    cs: "Odeslali jsme ověřovací kód SMS na vaše číslo. Zadejte prosím přijatý 6místný kód.",
  },
  verify_phone_not_found: {
    pl: "Nie znaleźliśmy zamówień powiązanych z tym numerem telefonu. Sprawdź numer i spróbuj ponownie lub zadaj inne pytanie.",
    en: "We couldn't find any orders associated with this phone number. Please check the number and try again, or ask another question.",
    de: "Wir konnten keine Bestellungen zu dieser Telefonnummer finden. Bitte überprüfen Sie die Nummer und versuchen Sie es erneut oder stellen Sie eine andere Frage.",
    lt: "Neradome užsakymų, susietų su šiuo telefono numeriu. Patikrinkite numerį ir bandykite dar kartą arba užduokite kitą klausimą.",
    ua: "Ми не знайшли замовлень, пов'язаних із цим номером телефону. Перевірте номер і спробуйте ще раз або задайте інше запитання.",
    ro: "Nu am găsit comenzi asociate cu acest număr de telefon. Verificați numărul și încercați din nou sau puneți altă întrebare.",
    hu: "Nem találtunk ehhez a telefonszámhoz tartozó rendelést. Ellenőrizze a számot és próbálja újra, vagy tegyen fel másik kérdést.",
    cs: "Nenašli jsme žádné objednávky spojené s tímto telefonním číslem. Zkontrolujte číslo a zkuste to znovu nebo položte jinou otázku.",
  },
  verify_code_invalid: {
    pl: "Nieprawidłowy kod. Spróbuj ponownie.",
    en: "Invalid code. Please try again.",
    de: "Ungültiger Code. Bitte versuchen Sie es erneut.",
    lt: "Neteisingas kodas. Bandykite dar kartą.",
    ua: "Невірний код. Спробуйте ще раз.",
    ro: "Cod invalid. Vă rugăm să încercați din nou.",
    hu: "Érvénytelen kód. Kérem, próbálja újra.",
    cs: "Neplatný kód. Zkuste to prosím znovu.",
  },
  verify_code_failed: {
    pl: "Zbyt wiele nieudanych prób. Weryfikacja została anulowana. Możesz spróbować ponownie lub zadać inne pytanie.",
    en: "Too many failed attempts. Verification has been cancelled. You can try again or ask another question.",
    de: "Zu viele fehlgeschlagene Versuche. Die Verifizierung wurde abgebrochen. Sie können es erneut versuchen oder eine andere Frage stellen.",
    lt: "Per daug nesėkmingų bandymų. Patvirtinimas atšauktas. Galite bandyti dar kartą arba užduoti kitą klausimą.",
    ua: "Забагато невдалих спроб. Верифікацію скасовано. Ви можете спробувати ще раз або задати інше запитання.",
    ro: "Prea multe încercări eșuate. Verificarea a fost anulată. Puteți încerca din nou sau pune altă întrebare.",
    hu: "Túl sok sikertelen próbálkozás. Az ellenőrzés megszakadt. Próbálkozhat újra vagy tegyen fel másik kérdést.",
    cs: "Příliš mnoho neúspěšných pokusů. Ověření bylo zrušeno. Můžete to zkusit znovu nebo položit jinou otázku.",
  },
};

export function getMessage(key: MessageKey, language: string): string {
  const lang = (
    SUPPORTED_LANGUAGES.includes(language as Language) ? language : "en"
  ) as Language;
  return MESSAGES[key][lang];
}

export function buildEscalationReply(
  language: string,
  question?: string,
): string {
  const url = question
    ? `${STORE.WHATSAPP_URL}?text=${encodeURIComponent(question)}`
    : STORE.WHATSAPP_URL;

  return injectVariables(getMessage("escalation", language), {
    whatsappComponent: buildComponent("whatsapp", { url }),
  });
}
