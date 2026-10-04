import type { Metadata } from "next";
import { ApuracaoClient } from "@/components/ApuracaoClient";

export const metadata: Metadata = {
  title: "Apuração em tempo real — meuvoto.org",
  description: "Mapa da apuração oficial do TSE para presidente, governador, senador e deputados.",
};

export default function ApuracaoPage() {
  return <ApuracaoClient />;
}
