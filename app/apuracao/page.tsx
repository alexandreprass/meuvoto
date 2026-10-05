import type { Metadata } from "next";
import { ApuracaoClient } from "@/components/ApuracaoClient";

export const metadata: Metadata = {
  title: "Apuração em tempo real — meuvoto.digital",
  description: "Mapa da apuração oficial do TSE no 1º turno e a lista do 2º turno.",
};

export default function ApuracaoPage() {
  return <ApuracaoClient />;
}
