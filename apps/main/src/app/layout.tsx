import type { Metadata, Viewport } from "next";
import { BRAND } from "@/branding/config";
import "./globals.css";

const fontQuery = [
  `family=${BRAND.font.family.replace(/ /g, "+")}`,
  `:wght@${BRAND.font.weights.join(";")}`,
  `&subset=${BRAND.font.subsets.join(",")}`,
  `&display=swap`,
].join("");

export const metadata: Metadata = {
  title: {
    default: BRAND.seo.title,
    template: BRAND.seo.titleTemplate,
  },
  description: BRAND.seo.description,
  applicationName: BRAND.name,
  openGraph: {
    title: BRAND.seo.title,
    description: BRAND.seo.description,
    siteName: BRAND.name,
    locale: BRAND.seo.locale,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.seo.title,
    description: BRAND.seo.description,
  },
};

export const viewport: Viewport = {
  themeColor: BRAND.theme.primary,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={BRAND.seo.locale.split("_")[0]}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href={`https://fonts.googleapis.com/css2?${fontQuery}`}
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
