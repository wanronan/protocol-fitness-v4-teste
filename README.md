# Volume — App de Treino

Primeira versão do aplicativo de treino em HTML, CSS e JavaScript, pronta para GitHub Pages.

## O que já funciona

- Página inicial responsiva
- Semana completa de treinos
- Registro de carga e repetições
- Conclusão série por série
- Cronômetro automático de descanso
- Progresso semanal
- Histórico salvo no navegador
- Regras de execução e cuidados com a coluna
- Instalação como PWA em navegadores compatíveis

## Publicar no GitHub Pages

1. Crie um repositório chamado `app-treino-volume`.
2. Envie todos os arquivos desta pasta para a raiz do repositório.
3. No GitHub, abra **Settings > Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/root`.
6. Salve e aguarde a publicação.

O endereço ficará parecido com:

`https://SEU-USUARIO.github.io/app-treino-volume/`

## Testar no computador

A forma mais simples é usar a extensão **Live Server** no Visual Studio Code e abrir `index.html`.

Também é possível abrir `index.html` diretamente. Os recursos principais funcionam, mas a instalação PWA exige um servidor HTTP.

## Dados

O treino está em:

- `data/treino.json` — arquivo legível e editável
- `js/treino-data.js` — cópia usada diretamente pelas páginas

Quando alterar o treino, mantenha os dois arquivos sincronizados.

## Próxima etapa sugerida

Adicionar imagens profissionais de execução para cada exercício e uma tela individual com posição inicial, posição final e erros comuns.


## Ajustes v2

- Marca alterada para **PUSH/PULL PERFORMANCE**
- Cards da semana com título maior
- Tela de treino simplificada: nome do exercício, faixa fixa de séries/repetições, campo editável de peso e checkbox para marcar feito


## Ajuste de marca

- Nome atualizado para **Protocol Fitness**
- Logo enviada aplicada no cabeçalho e nos ícones do app


## Ajuste dos blocos

- Novas imagens premium para Quadríceps, Push, Posterior, Pull e Pernas Completo
- Ajuste de posicionamento das imagens nos cards
- Ajuste de padding para evitar textos colados à esquerda


## Ajuste da página Sua semana (v3)

- cards reorganizados
- novas capas com nomes de arquivo atualizados para evitar cache antigo
- service worker atualizado para forçar a nova versão
- melhor alinhamento de texto e espaçamentos


## Reinício semanal automático (v4)

- As marcações de exercícios e cargas ficam disponíveis até domingo.
- Na primeira abertura a partir da segunda-feira seguinte, a semana começa zerada.
- O histórico dos treinos finalizados é preservado.
- A migração da versão anterior é automática.
