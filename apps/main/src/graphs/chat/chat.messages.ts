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
    pl: "Nie zrozumiałem tej wiadomości. W czym mogę Ci pomóc?",
    en: "I didn't understand that message. How can I help you?",
    de: "Ich habe diese Nachricht nicht verstanden. Wie kann ich Ihnen helfen?",
    lt: "Nesupratau šios žinutės. Kuo galiu padėti?",
    ua: "Я не зрозумів це повідомлення. Чим можу допомогти?",
    ro: "Nu am înțeles acest mesaj. Cum vă pot ajuta?",
    hu: "Nem értettem ezt az üzenetet. Miben segíthetek?",
    cs: "Této zprávě jsem nerozuměl. Jak vám mohu pomoci?",
  },
  escalation: {
    pl: "Przekazaliśmy Twoją sprawę do naszego konsultanta. Skontaktuje się z Tobą tak szybko, jak to możliwe.",
    en: "We've forwarded your case to our consultant. They will contact you as soon as possible.",
    de: "Wir haben Ihr Anliegen an unseren Berater weitergeleitet. Er wird sich so schnell wie möglich mit Ihnen in Verbindung setzen.",
    lt: "Perdavėme jūsų klausimą mūsų konsultantui. Jis susisieks su jumis kuo greičiau.",
    ua: "Ми передали вашу справу нашому консультанту. Він зв'яжеться з вами якомога швидше.",
    ro: "Am transmis cazul dvs. consultantului nostru. Vă va contacta cât mai curând posibil.",
    hu: "Ügyét továbbítottuk tanácsadónknak. A lehető leghamarabb kapcsolatba lép Önnel.",
    cs: "Předali jsme vaši záležitost našemu konzultantovi. Bude vás kontaktovat co nejdříve.",
  },
  request_phone: {
    pl: "Aby kontynuować, muszę zweryfikować Twoją tożsamość. Podaj numer telefonu.",
    en: "To continue, I need to verify your identity. Please provide your phone number.",
    de: "Um fortzufahren, muss ich Ihre Identität verifizieren. Bitte geben Sie Ihre Telefonnummer an.",
    lt: "Norėdamas tęsti, turiu patvirtinti jūsų tapatybę. Įveskite telefono numerį.",
    ua: "Щоб продовжити, мені потрібно підтвердити вашу особу. Вкажіть номер телефону.",
    ro: "Pentru a continua, trebuie să vă verific identitatea. Vă rugăm să furnizați numărul de telefon.",
    hu: "A folytatáshoz ellenőriznem kell a személyazonosságát. Kérem, adja meg a telefonszámát.",
    cs: "Pro pokračování musím ověřit vaši totožnost. Zadejte prosím telefonní číslo.",
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
    pl: "Nie rozpoznaję tego numeru telefonu. Sprawdź numer i spróbuj ponownie lub zadaj inne pytanie.",
    en: "I couldn't recognize that phone number. Please check it and try again, or ask another question.",
    de: "Ich konnte diese Telefonnummer nicht erkennen. Bitte überprüfen Sie sie und versuchen Sie es erneut oder stellen Sie eine andere Frage.",
    lt: "Neatpažinau šio telefono numerio. Patikrinkite jį ir bandykite dar kartą arba užduokite kitą klausimą.",
    ua: "Я не розпізнав цей номер телефону. Перевірте його і спробуйте ще раз або задайте інше запитання.",
    ro: "Nu am putut recunoaște acest număr de telefon. Verificați-l și încercați din nou sau puneți altă întrebare.",
    hu: "Nem ismertem fel ezt a telefonszámot. Ellenőrizze és próbálja újra, vagy tegyen fel másik kérdést.",
    cs: "Toto telefonní číslo jsem nerozpoznal. Zkontrolujte ho a zkuste to znovu nebo položte jinou otázku.",
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
