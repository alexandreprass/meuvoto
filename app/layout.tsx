import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VisitCounter } from "@/components/VisitCounter";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "meuvoto.digital — candidatos e ficha eleitoral",
  description: "Explore candidaturas e consulte informações oficiais publicadas pelo TSE.",
  metadataBase: new URL("https://meuvoto.digital"),
  openGraph: {
    title: "meuvoto.digital",
    description: "Candidatos e informações eleitorais oficiais do TSE.",
    url: "https://meuvoto.digital",
    siteName: "meuvoto.digital",
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
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-NK9ZW8V0P7" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js', new Date());\ngtag('config', 'G-NK9ZW8V0P7');`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("meuvoto-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full bg-white font-sans text-neutral-950">
        {children}
        <VisitCounter />
        <ThemeToggle />
      </body>
    </html>
  );
}
