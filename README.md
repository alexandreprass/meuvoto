# meuvoto.org

Enquete independente para presidente, senador, deputado federal e deputado estadual/distrital. A pessoa entra com a conta do **X**, informa o estado e vota **uma vez por cargo**. O mapa mostra o país por estado; no hover (ou toque no celular) aparecem votos e % daquele estado.

Os candidatos estaduais são separados por UF e os resultados aparecem no mapa e no painel lateral.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Auth.js v5 com OAuth 2.0 do X
- Votos e mensagens em Postgres quando `DATABASE_URL` existe (1 voto por `twitterId`)
- Modo local sem `DATABASE_URL` usa memória do processo, útil só para desenvolvimento

## Rodar local

```bash
npm install
```

Copie `.env.example` para `.env` e preencha:

```
AUTH_SECRET="cole-um-secret"
AUTH_URL="http://localhost:3000"
AUTH_TWITTER_ID=""
AUTH_TWITTER_SECRET=""
```

Gere o secret:

```bash
npx auth secret
```

Depois:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Sem as chaves do X, o mapa e as barras funcionam; o voto pede login.

## App no X (Twitter)

1. [developer.x.com](https://developer.x.com) → criar um Project/App
2. User authentication: **OAuth 2.0**
3. Type of App: Web App
4. Callback URLs:
   - `http://localhost:3000/api/auth/callback/twitter`
   - `https://meuvoto.org/api/auth/callback/twitter`
5. Website URL: `https://meuvoto.org`
6. Copie **Client ID** e **Client Secret** para `AUTH_TWITTER_ID` e `AUTH_TWITTER_SECRET`

Escopos usados pelo Auth.js: `users.read`, `tweet.read`, `offline.access`.

## Deploy no Render

Crie um **Web Service** (não Static Site) apontando para este repo.

| Campo | Valor |
| --- | --- |
| Language | Node |
| Branch | `main` |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm start` |

Variáveis de ambiente:

```
NODE_VERSION=22
AUTH_SECRET=     (Generate no painel)
AUTH_TWITTER_ID=
AUTH_TWITTER_SECRET=
SENHA_ADM=       (senha forte para acessar /adm)
DATABASE_URL=    (Postgres — obrigatório para votos e chat não zerarem)
```

`AUTH_URL` é preenchido sozinho com a URL do Render. Quando o domínio for `meuvoto.org`, defina:

```
AUTH_URL=https://meuvoto.org
```

No app do X, acrescente o callback:

- `https://SEU-SERVICO.onrender.com/api/auth/callback/twitter`
- `https://meuvoto.org/api/auth/callback/twitter`

O Postgres é o do **próprio Render** (igual o linhadireita). Não usa arquivo JSON em produção.

Se o log mostrar `DATABASE_URL vazia no Render`, o deploy buildou certo, mas o Web Service ainda não tem banco conectado. Sem `DATABASE_URL`, o app não sobe em produção para evitar perder votos, logins e mensagens em restart/redeploy.

Jeito mais direto:

1. Render → **Blueprints** → **New Blueprint Instance** → repo `meuvoto`
2. Aprova o `render.yaml`: ele cria `meuvoto-db` e liga `DATABASE_URL` sozinho (`fromDatabase`)

Se o Web Service já existe:

1. **New → Postgres** → nome `meuvoto-db` → mesma region do site
2. No serviço **meuvoto** → **Environment** → **Add**
3. Key: `DATABASE_URL`
4. Não cola texto: escolhe **From Database** → `meuvoto-db` → **connection string**
5. Save, rebuild and deploy

O `npm start` roda `scripts/init-db.js` e cria as tabelas `users`, `votes` e `messages`.


## Importar candidatos

A base de senadores fica em `data/senators.json`. Para atualizar a partir do CSV oficial do TSE, baixe e extraia `consulta_cand_2026.zip` do dataset Candidatos 2026 e rode:

```bash
npm run import:candidates -- caminho/consulta_cand_2026_BRASIL.csv
```

Fonte oficial: https://dadosabertos.tse.jus.br/dataset/candidatos-2026
## Aviso

Isto **não** é urna oficial nem substitui o TSE. É uma enquete cívica: 1 voto por conta do X.

Fotos: Wikimedia Commons (veja `public/photos-attribution.txt`).


## Administração

Defina `SENHA_ADM` no ambiente do Render e acesse `/adm`. O painel permite consultar cadastros e votos, excluir votos selecionados, bloquear/desbloquear usuários e excluir cadastros com seus votos e mensagens. A senha não é enviada ao cliente nem salva no banco.
