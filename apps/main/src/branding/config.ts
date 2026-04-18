// Single source of truth for all brand-dependent values.
// To rebrand: edit this file + replace the asset files in this folder.

export const BRAND = {
  name: "TAURON",
  fullName: "TAURON Polska Energia",
  tagline: "Dostawca prądu dla domów i firm",

  seo: {
    title: "TAURON Polska Energia",
    titleTemplate: "%s | TAURON",
    description:
      "TAURON Polska Energia — asystent obsługi klienta. Dostawca prądu dla domów i firm.",
    locale: "pl_PL",
  },

  backoffice: {
    productLabel: "Backoffice AI",
    tenantLabel: "TAURON",
  },

  auth: {
    adminEmail: "admin@tauron.pl",
    defaultLoginEmail: "admin@tauron.pl",
  },

  sms: {
    senderTag: "TAURON",
  },

  theme: {
    // Tauron magenta. Mirrored in globals.css --color-primary and used as
    // <meta name="theme-color">. If you change this, also update globals.css.
    primary: "#e2007a",
  },

  font: {
    family: "Titillium Web",
    weights: [300, 400, 600, 700],
    subsets: ["latin", "latin-ext"],
  },
} as const;

export type Brand = typeof BRAND;
