# meuvoto.org

Site estático para explorar candidaturas de 2026 e consultar as fichas oficiais do TSE. Não possui login, mensagens ou armazenamento/envio de votos. As escolhas temporárias existem apenas na memória da página e somem ao fechá-la ou atualizá-la.

## Desenvolvimento local

Requer Node.js 22 ou superior.

```bash
npm ci
npm run dev
```

O script `predev` prepara os arquivos públicos de candidatos a partir dos JSONs em `data/`.

## Publicar no GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` compila e publica automaticamente a branch `main`. No repositório, abra **Settings → Pages** e selecione **GitHub Actions** como fonte.

Para o endereço padrão `alexandreprass.github.io/meuvoto`, não é preciso configurar variável. Para usar domínio próprio na raiz, crie a variável de repositório `PAGES_BASE_PATH` com o valor `.` e configure o domínio em **Settings → Pages**.

O resultado estático fica em `out/`. Não há banco de dados ou variáveis secretas necessárias.
