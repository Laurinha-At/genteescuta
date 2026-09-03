# Gente Escuta

Canal de escuta do colaborador + avaliação de riscos psicossociais (NR-1),
com painéis de clima. Next.js 16 + Supabase.

**Se você não é da área técnica, comece pelo [GUIA-DE-INSTALACAO.md](GUIA-DE-INSTALACAO.md).**

## O que tem aqui

**Público (sem login)**
- `/` — entrada do canal
- `/canal` — envio de sugestão, reclamação, ideia, melhoria ou reconhecimento
  (nome completo, e-mail e área obrigatórios; opção de não se identificar)
- `/canal/enviada` — confirmação do envio
- `/acompanhar` — consulta do andamento pelo e-mail informado no envio
- `/mural` — "Você disse, nós fizemos"
- `/p/[slug]` — responder uma pesquisa

**Administração (login)**
- `/admin` — visão geral: funil do canal, tipos, eNPS, participação
- `/admin/canal` — caixa de entrada, workflow de status e retorno ao colaborador
- `/admin/mural` — gestão do retorno: o que espera publicação e o que já está no ar
- `/admin/pesquisas` — criar pesquisa, link, QR code
- `/admin/pesquisas/[id]/editar` — editar ajustes, seções e perguntas
- `/admin/pesquisas/[id]/painel` — mapa de risco, alertas, itens críticos, CSV
- `/admin/clima` — eNPS, satisfação, participação, pontos positivos e de atenção
- `/admin/configuracoes` — empresa, áreas, administradores

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions)
- **Supabase** (Postgres) — acesso exclusivamente pelo servidor com service role;
  RLS ligado sem políticas públicas
- **Tailwind v4**
- Autenticação própria: scrypt + sessão em tabela, cookie httpOnly
- Gráficos em SVG/CSS puro, sem biblioteca

## Rodar localmente

```bash
npm install
```

Copie `.env.local.example` para `.env.local` e preencha as chaves do Supabase.

```bash
npm run dev
```

## Estrutura

| Caminho | O que é |
|---|---|
| `supabase/schema.sql` | Estrutura do banco. Rode no SQL Editor do Supabase. |
| `lib/nr1-template.ts` | As 12 dimensões e ~50 itens do questionário NR-1 |
| `lib/scoring.ts` | Cálculo do índice de risco, faixas, eNPS e recortes |
| `lib/indicadores.ts` | Funil do canal e série histórica de clima |
| `lib/acoes/` | Server Actions (auth, canal, pesquisas, config) |
| `components/charts/` | Gráficos |

## Como a nota de risco é calculada

Cada item Likert vale de 1 a 5. Itens protetivos (`invertida: true`) são
espelhados (`6 - valor`), de modo que **maior sempre significa mais risco**.
A média vira um índice de 0 a 100:

| Índice | Faixa |
|---|---|
| 0–24 | Baixo |
| 25–49 | Moderado |
| 50–74 | Alto |
| 75–100 | Crítico |

Itens marcados como `critica: true` (assédio, violência, discriminação) geram
alerta a partir de **uma única** ocorrência, independentemente da média.

## Paleta dos gráficos

As cores foram validadas para daltonismo, contraste e bandas de luminosidade:

| Uso | Cores |
|---|---|
| Séries categóricas | `#2a78d6` `#eb6834` `#1baf7a` `#eda100` `#e87ba4` |
| Funil (ordinal) | `#86b6ef` `#5598e7` `#2a78d6` `#1c5cab` `#104281` |
| Risco (ordinal) | `#e59892` `#cf6b67` `#b5423f` `#87292c` |

As três primeiras cores categóricas ficam abaixo de 3:1 no fundo claro — por
isso todo gráfico que as usa traz **valores escritos** e **visão de tabela**.
A cor nunca carrega significado sozinha.
