# meuvoto.org

Enquete independente para presidente do Brasil. A pessoa entra com a conta do **X**, informa o estado e vota **uma vez**. O mapa mostra o país por estado; no hover (ou toque no celular) aparecem votos e % daquele estado.

Senadores e deputados entram depois — a estrutura já reserva espaço.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Auth.js v5 com OAuth 2.0 do X
- Votos em `data/votes.json` (1 voto por `twitterId`)

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
DATABASE_URL=    (Postgres — obrigatório para votos e chat não zerarem)
```

`AUTH_URL` é preenchido sozinho com a URL do Render. Quando o domínio for `meuvoto.org`, defina:

```
AUTH_URL=https://meuvoto.org
```

No app do X, acrescente o callback:

- `https://SEU-SERVICO.onrender.com/api/auth/callback/twitter`
- `https://meuvoto.org/api/auth/callback/twitter`

O disco do Render Free apaga arquivos a cada deploy. Use o **Postgres do Render**:

1. Dashboard → **New → Postgres**
2. Nome: `meuvoto-db` · mesma **region** do Web Service
3. Quando ficar Available, abra o banco → **Connections** → copie **Internal Database URL**
4. No Web Service `meuvoto` → **Environment** → `DATABASE_URL` = essa URL
5. **Manual Deploy** no site

Sem `DATABASE_URL`, votos e chat zeram a cada versão.

## Aviso

Isto **não** é urna oficial nem substitui o TSE. É uma enquete cívica: 1 voto por conta do X.

Fotos: Wikimedia Commons (veja `public/photos-attribution.txt`).
