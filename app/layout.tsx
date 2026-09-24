import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "meuvoto.org — candidatos e ficha eleitoral",
  description: "Explore candidaturas e consulte informações oficiais publicadas pelo TSE.",
  metadataBase: new URL("https://meuvoto.org"),
  openGraph: {
    title: "meuvoto.org",
    description: "Candidatos e informações eleitorais oficiais do TSE.",
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
        {children}
      </body>
    </html>
  );
}
