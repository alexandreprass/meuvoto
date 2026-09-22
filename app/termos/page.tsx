import Link from "next/link";

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-700">
        ← meuvoto.org
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">Termos de uso</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-neutral-600">
        <p>
          O meuvoto.org guarda a cédula pessoal de quem entra com o X. Essa lista
          não é publicada e não substitui a urna do TSE.
        </p>
        <p>
          Bens e prestação de contas vêm do DivulgaCandContas. O site não soma
          escolhas nem mostra quem está na frente.
        </p>
        <p>
          O login via X serve para reconhecer a conta. Uso abusivo pode ter a
          cédula apagada.
        </p>
      </div>
    </main>
  );
}
