import type { Metadata } from "next";
import { SegundoTurnoClient } from "@/components/SegundoTurnoClient";

export const metadata: Metadata = {
  title: "2º turno — meuvoto.digital",
  description: "Cédula do segundo turno de 2026, só com os candidatos que voltaram às urnas.",
};

export default function SegundoTurnoPage() {
  return <SegundoTurnoClient />;
}
