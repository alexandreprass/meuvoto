export default function TermosPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <a href="/" className="text-sm text-neutral-400 hover:text-neutral-700">
        ← meuvoto.org
      </a>
      <h1 className="mt-6 text-3xl font-semibold">Termos de uso</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-neutral-600">
        <p>
          O meuvoto.org é uma enquete cívica, não substitui o TSE nem urna
          eletrônica.
        </p>
        <p>
          Cada conta do X tem direito a 1 voto para presidente. Ao votar, você
          informa o estado e escolhe um candidato.
        </p>
        <p>
          O login via X serve apenas para autenticar a conta. Uso abusivo pode
          ter o voto anulado.
        </p>
      </div>
    </main>
  );
}
