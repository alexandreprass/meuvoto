import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "meuvoto.org — sua cédula e a ficha do candidato",
  description:
    "Monte sua cédula com a conta do X e consulte bens e prestação de contas publicados pelo TSE.",
  metadataBase: new URL("https://meuvoto.onrender.com"),
  openGraph: {
    title: "meuvoto.org",
    description: "Sua cédula pessoal e a ficha oficial do candidato no TSE.",
    url: "https://meuvoto.onrender.com",
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
