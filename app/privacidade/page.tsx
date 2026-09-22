import Link from "next/link";

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-700">
        ← meuvoto.org
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">Privacidade</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-neutral-600">
        <p>
          Ao entrar com o X, usamos o identificador, o nome e o @ da conta para
          devolver a sua cédula quando você voltar.
        </p>
        <p>
          Não pedimos senha do X. Não vendemos dados. A escolha de cada pessoa
          não entra em placar.
        </p>
        <p>
          Você pode sair da conta a qualquer momento. Para apagar sua cédula,
          fale com o operador do site.
        </p>
      </div>
    </main>
  );
}
