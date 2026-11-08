# Protocol Fitness V6

Atualização construída sobre a interface do `protocol-fitness-v4-teste`.

## Fonte do treino
`Fitness_WP_Wanderson_Fernanda_Treino_Revisado_Dez2026(1).xlsx`

## O que mudou
- Perfis separados: Wanderson e Fernanda.
- Prescrição individual de séries e RIR no mesmo exercício.
- Quarta-feira: condicionamento + core apenas para Wanderson; descanso para Fernanda.
- Botões de séries S1/S2/S3 etc., mantendo somente um campo simples de carga.
- Cronômetro automático após concluir uma série quando houver outra série do mesmo exercício.
- RIR traduzido em linguagem simples.
- Botão “Como fazer” com a observação da planilha.
- Histórico e cargas separados por perfil.
- Migração do histórico antigo do V4 para o perfil Wanderson; o treino semanal antigo não é carregado no novo plano.
- Evolução corporal separada por perfil.
- Dia Zero de Fernanda carregado conforme a planilha; Wanderson fica sem baseline porque o arquivo novo não traz esses dados.

## Mídia de exercícios
A V6 reutiliza apenas imagens já existentes no V4 quando representam o exercício adequadamente. Exercícios novos sem imagem correta mostram “Guia visual em breve”, evitando usar uma demonstração errada. A estrutura já está preparada para GIF/MP4 futuramente.

## Arquivos que precisam substituir/adicionar no repositório V4
- `index.html`
- `treino.html`
- `progresso.html`
- `orientacoes.html`
- `manifest.json`
- `service-worker.js`
- `version.txt`
- `css/style.css`
- `js/treino-data.js`
- `js/storage.js`
- `js/profile.js` (novo)
- `js/app.js`
- `js/treino.js`
- `js/progresso.js`

Os diretórios `assets/` atuais devem ser mantidos.
