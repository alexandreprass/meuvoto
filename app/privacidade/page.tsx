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
          Este site não pede login e não registra escolhas de candidatos. As
          escolhas feitas na página existem somente na memória do navegador e
          desaparecem quando a página é fechada ou atualizada.
        </p>
        <p>
          Não há sistema de mensagens, perfil de usuário ou placar de votos.
          Dados técnicos básicos podem ser tratados pela plataforma que hospeda
          o site para entregar as páginas e arquivos públicos.
        </p>
        <p>
          As informações eleitorais apresentadas são dados públicos de
          candidaturas; a ficha detalhada é consultada diretamente no site do TSE.
        </p>
      </div>
    </main>
  );
}
