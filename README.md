# meuvoto.digital

Este domínio agora publica o painel **Apuração 2026**, com resultados oficiais do TSE, mapas por estado e município e evolução da votação presidencial.

A aplicação é compilada a partir da branch `main` de [alexandreprass/apuracao-tse-2026](https://github.com/alexandreprass/apuracao-tse-2026). O workflow deste repositório publica o painel na raiz do domínio `meuvoto.digital`.
A medição de acessos usa o Google Analytics que já estava configurado no site antigo (`G-NK9ZW8V0P7`).

## Publicação

O workflow `.github/workflows/deploy-pages.yml` compila o painel e publica o resultado em GitHub Pages. A fonte do Pages deve permanecer como **GitHub Actions** em **Settings → Pages**.
