export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <a href="/" className="text-sm text-neutral-400 hover:text-neutral-700">
        ← meuvoto.org
      </a>
      <h1 className="mt-6 text-3xl font-semibold">Privacidade</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-neutral-600">
        <p>
          O meuvoto.org é uma enquete independente. Ao entrar com o X, usamos só o
          identificador, o nome e o @ da conta para garantir 1 voto por pessoa.
        </p>
        <p>
          Não pedimos senha do X. Não vendemos dados. Não usamos os votos para
          urna oficial.
        </p>
        <p>
          Você pode sair da conta a qualquer momento. Para apagar seu voto,
          fale com o operador do site.
        </p>
      </div>
    </main>
  );
}
