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
          O meuvoto.org permite explorar candidaturas e montar uma seleção
          temporária para consulta pessoal. A seleção não é enviada nem salva e
          não substitui a urna oficial do TSE.
        </p>
        <p>
          As listas são distribuídas como arquivos públicos do site. Para
          patrimônio e prestação de contas, consulte a ficha oficial do TSE.
        </p>
        <p>
          O site não possui login, mensagens ou armazenamento de votos.
        </p>
      </div>
    </main>
  );
}
