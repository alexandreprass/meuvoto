import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "meuvoto.org — Enquete para presidente",
  description:
    "Vote para presidente com sua conta do X. Um voto por pessoa. Mapa do Brasil com resultados por estado.",
  metadataBase: new URL("https://meuvoto.org"),
  openGraph: {
    title: "meuvoto.org",
    description: "Enquete independente para presidente. 1 voto por conta do X.",
    url: "https://meuvoto.org",
    siteName: "meuvoto.org",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-white font-sans text-neutral-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
