
# ApostaPro — Plataforma de Investimento Esportivo

SaaS em português (BR), tema escuro com acento verde (esmeralda), focado em decisão baseada em dados, EV+ e gestão de banca profissional.

## Stack
- **Frontend:** React + Vite + TypeScript + Tailwind + shadcn/ui + Recharts
- **Backend:** Lovable Cloud (Postgres + Auth JWT + Edge Functions + Storage)
- **APIs externas:** The Odds API + API-Football (você fornece as chaves quando pedir)
- **Cache:** tabela `api_cache` no Postgres com TTL (Redis não está disponível na stack Lovable)

## Autenticação
- Cadastro/login por e-mail e senha (Lovable Cloud Auth, JWT nativo)
- Tabela `profiles` (nome, moeda, fuso) + tabela `user_roles` separada (`admin`, `user`) com função `has_role` SECURITY DEFINER
- Rotas protegidas, listener `onAuthStateChange`

## Modelo de dados (Postgres + RLS)
- `profiles` — dados do usuário
- `user_roles` — papéis (separada por segurança)
- `bankrolls` — múltiplas bancas por usuário (nome, saldo inicial, moeda)
- `bankroll_transactions` — depósitos, saques, ajustes
- `bets` — apostas (simples e múltiplas): esporte, liga, mercado, seleção, odd, stake, probabilidade estimada, EV calculado, status (pendente/ganha/perdida/anulada/cashout), resultado, lucro
- `bet_legs` — pernas de apostas múltiplas
- `matches` — jogos importados das APIs
- `odds_snapshots` — histórico de odds por jogo/mercado/casa (para detectar movimento)
- `bookmakers` — casas de apostas
- `alerts` — alertas configurados pelo usuário (+EV, movimento de odds)
- `notifications` — notificações geradas
- `api_cache` — cache de respostas externas com TTL
- Todas com RLS estrita: usuário só vê o que é dele

## Páginas e funcionalidades

### 1. Landing + Auth
- Landing curta apresentando a plataforma
- `/auth` — login e cadastro

### 2. Dashboard `/dashboard`
- KPIs: ROI, Lucro/prejuízo, Yield, Taxa de acerto, Stake médio, Odds média, Nº de apostas
- Gráfico de evolução da banca (linha) — Recharts
- Gráfico de lucro acumulado por mês (barras)
- Distribuição por status (pizza)
- Filtros por período e por banca

### 3. Apostas `/bets`
- Listagem com filtros (status, esporte, liga, mercado, faixa de odd, período)
- **Adicionar aposta** (modal):
  - Simples ou múltipla (várias pernas)
  - Campos: jogo, mercado, seleção, odd, stake, prob. estimada (%), banca
  - **Cálculo automático de EV** = (prob × odd) − 1, com badge +EV / −EV / Neutro
- **Importar CSV** com mapeamento de colunas + preview
- Liquidar aposta (ganha/perdida/anulada/cashout) → atualiza banca automaticamente
- (Importação por e-mail removida do escopo — inviável e arriscada legalmente; sugiro adicionar um bookmarklet/extensão depois)

### 4. Análise de performance `/analytics`
- Desempenho por **liga**, **mercado**, **faixa de odd**, **dia da semana**, **stake size**
- Heatmap de ROI
- Identificação de padrões de erro (ex.: "ROI −18% em odds > 3.0")
- Streaks (sequências de vitórias/derrotas)

### 5. Mercado / Odds ao vivo `/markets`
- Lista de jogos próximos (API-Football) por esporte e liga
- Comparador de odds entre casas (The Odds API) por mercado
- **Detector de +EV**: usuário informa prob. estimada → sistema mostra qual casa oferece valor positivo
- **Movimento de odds**: gráfico mini por mercado mostrando variação nas últimas horas
- Botão "registrar como aposta" pré-preenche o modal

### 6. Calculadora de múltiplas `/parlay`
- Adicionar pernas com odd e prob. estimada de cada
- Calcula odd combinada, prob. combinada, EV da múltipla
- Aviso de risco alto (prob. < X%)
- Sugere quais pernas remover para melhorar EV

### 7. Simulador de banca `/simulator`
- Entradas: banca inicial, ROI esperado, odd média, nº de apostas, stake fixa OU % da banca (Kelly fracionado)
- Roda Monte Carlo (ex.: 1000 simulações) em Edge Function
- Gráfico de bandas (P10, P50, P90), risco de ruína, banca final esperada

### 8. Alertas `/alerts`
- Criar regras: "me avise quando EV > 5% em Premier League em mercados 1X2"
- "Me avise quando odd do time X variar mais que 10%"
- Edge Function agendada (cron) varre odds e gera notificações
- Bell de notificações no header

### 9. Configurações `/settings`
- Perfil, moeda, fuso, troca de senha
- Gerenciamento de bancas (criar, depósitos, saques)
- Chaves de API (caso queira usar próprias)

## Edge Functions
- `fetch-odds` — busca The Odds API com cache
- `fetch-fixtures` — busca API-Football com cache
- `compute-ev` — cálculos centralizados de EV
- `simulate-bankroll` — Monte Carlo
- `process-alerts` — cron a cada 15 min, varre odds e dispara alertas
- `import-bets-csv` — parsing e validação server-side

## Segurança
- RLS em todas as tabelas
- Validação client + server com Zod
- Roles em tabela separada (nunca em profiles)
- Chaves das APIs externas guardadas como secrets do Cloud (você adiciona quando pedir)

## Design
- Fundo `#0A0F0D` (quase preto), superfícies `#111714`, acento `#10B981` (esmeralda), vermelho `#EF4444` para perdas
- Inter como fonte
- Cards com bordas sutis, números grandes, badges +EV verdes brilhantes
- Sidebar fixa à esquerda em desktop, drawer em mobile
- Tabelas densas estilo terminal de trader

## O que fica para depois (sugestões futuras explícitas no app)
- ML para previsão de probabilidades reais
- Bot do Telegram para alertas
- App mobile (React Native / PWA)
- Importação por e-mail / extensão de navegador
- Compartilhamento público de tipsters

## Como vamos executar
Vou construir em uma única passada grande: schema + auth + todas as páginas com lógica funcional. Integrações com APIs externas ficam prontas mas dormentes até você fornecer as chaves (vou pedir no momento certo). Depois iteramos por área conforme você testar.
