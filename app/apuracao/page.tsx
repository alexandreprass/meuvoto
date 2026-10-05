import type { Metadata } from "next";
import { ApuracaoClient } from "@/components/ApuracaoClient";

export const metadata: Metadata = {
  title: "Apuração em tempo real — meuvoto.digital",
  description: "Mapa municipal de Lula e Flávio no 1º turno e a apuração oficial do TSE.",
};

export default function ApuracaoPage() {
  return <ApuracaoClient />;
}
