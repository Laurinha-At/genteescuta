# Gente Cultura — guia de instalação

Este guia é para quem **não é da área técnica**. São 6 etapas e leva cerca de
40 minutos na primeira vez. Você não precisa saber programar em nenhuma delas.

Ao final você terá um site na internet com:

- um **canal permanente** onde o colaborador envia sugestões, reclamações, ideias,
  melhorias e reconhecimentos, informando nome, e-mail e área;
- um **mural "Você disse, nós fizemos"** com os retornos publicados;
- **pesquisas NR-1** de risco psicossocial, com link e QR code para enviar às pessoas;
- **painéis** com o funil do canal, mapa de risco por área, eNPS, participação,
  satisfação e os pontos positivos e de atenção.

---

## O que você vai precisar

| Item | Custo | Para quê |
|---|---|---|
| Conta no **Supabase** | Grátis | Guarda os dados (banco de dados) |
| Conta na **Vercel** | Grátis | Deixa o site no ar |
| Conta no **GitHub** | Grátis | Leva o código até a Vercel |

Os planos gratuitos aguentam com folga uma empresa de algumas centenas de pessoas.

> **Importante:** você mesma precisa criar essas contas. Nunca compartilhe as senhas
> por e-mail ou chat.

---

## Etapa 1 — Criar o banco de dados (Supabase)

1. Acesse **supabase.com** e crie sua conta gratuita.
2. Clique em **New project**.
3. Preencha:
   - **Name**: `gente-escuta`
   - **Database Password**: gere uma senha forte e **guarde no gerenciador de senhas**.
     Você não vai precisar dela no dia a dia, mas perdê-la dá trabalho.
   - **Region**: escolha `South America (São Paulo)` — deixa o site mais rápido no Brasil.
4. Clique em **Create new project** e espere uns 2 minutos.

---

## Etapa 2 — Criar as tabelas

1. No menu lateral do Supabase, clique em **SQL Editor**.
2. Clique em **New query**.
3. Abra o arquivo `supabase/schema.sql` (está na pasta do projeto), **copie tudo**
   e cole na caixa de texto.
4. Clique em **Run** (ou `Ctrl + Enter`).

Deve aparecer *Success. No rows returned*. É isso mesmo — significa que deu certo.

> Se aparecer erro, confira se você colou o arquivo **inteiro**, do começo ao fim.
> Rodar de novo não causa problema: o arquivo foi feito para poder repetir.

---

## Etapa 3 — Pegar as duas chaves

1. No menu lateral, vá em **Project Settings** (a engrenagem) → **API**.
2. Você vai copiar **dois** valores:

| Onde está | Nome | Parece com |
|---|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | `https://abcdefgh.supabase.co` |
| Project API keys → **service_role** | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1...` (bem longa) |

> **Atenção:** a chave `service_role` é secreta e dá acesso total ao banco.
> Ela fica só no servidor — nunca é enviada ao navegador de quem responde.
> Não cole essa chave em e-mail, WhatsApp, planilha ou documento compartilhado.

---

## Etapa 4 — Testar no seu computador (opcional, mas recomendado)

Pule para a Etapa 5 se quiser ir direto ao ar.

1. Na pasta do projeto, faça uma cópia do arquivo `.env.local.example` e
   renomeie a cópia para `.env.local`.
2. Abra o `.env.local` no Bloco de Notas e cole as duas chaves da Etapa 3.
3. Abra o terminal na pasta do projeto e rode:

```bash
npm install
```

```bash
npm run dev
```

4. Abra **http://localhost:3000** no navegador.

Se aparecer a tela "Falta conectar o banco de dados", o `.env.local` não foi lido:
confira o nome do arquivo (sem `.txt` no final) e reinicie o `npm run dev`.

---

## Etapa 5 — Publicar na internet (Vercel)

### 5.1 — Subir o código para o GitHub

1. Crie uma conta em **github.com**.
2. Instale o **GitHub Desktop** (desktop.github.com) — é a forma mais simples
   para quem não usa terminal.
3. No GitHub Desktop: **File → Add local repository** → escolha a pasta
   `C:\Users\Laura\nr1-forms`.
4. Ele vai oferecer criar o repositório. Aceite, marque **Keep this code private**
   e clique em **Publish repository**.

> O arquivo `.env.local` **não** sobe junto — ele já está bloqueado no `.gitignore`.
> Suas chaves não vão para o GitHub, e isso está correto.

### 5.2 — Conectar na Vercel

1. Acesse **vercel.com** e entre **com a conta do GitHub**.
2. Clique em **Add New → Project**.
3. Encontre o repositório `nr1-forms` e clique em **Import**.
4. Antes de clicar em Deploy, abra **Environment Variables** e adicione três linhas:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | a Project URL da Etapa 3 |
| `SUPABASE_SERVICE_ROLE_KEY` | a chave service_role da Etapa 3 |
| `NEXT_PUBLIC_SITE_URL` | deixe em branco por enquanto |

5. Clique em **Deploy** e espere uns 2 minutos.
6. A Vercel vai te dar um endereço, tipo `https://nr1-forms-xxxx.vercel.app`.
7. **Volte em Settings → Environment Variables**, preencha o
   `NEXT_PUBLIC_SITE_URL` com esse endereço (sem barra no final) e clique em
   **Redeploy** no menu Deployments.

> O passo 7 é o que faz o link e o QR code das pesquisas apontarem para o
> endereço certo. Se pular, o QR code vai apontar para `localhost`.

### 5.3 — Endereço próprio (opcional)

Se a empresa tiver um domínio, em **Settings → Domains** você pode usar algo como
`escuta.suaempresa.com.br`. A Vercel mostra o que pedir para quem cuida do domínio.
Depois de configurar, atualize o `NEXT_PUBLIC_SITE_URL` para o novo endereço.

---

## Etapa 6 — Entrar na administração

A conta da Soulan já vem criada pelo `schema.sql`:

| | |
|---|---|
| **Endereço** | `https://seu-site.vercel.app/entrar` |
| **E-mail** | `gentecultura@soulan.com.br` |
| **Senha** | `soulan123` |

> **Troque essa senha no primeiro acesso**, em **Configurações → Minha senha**.
> `soulan123` é o nome da empresa seguido de números — é literalmente o primeiro
> palpite de qualquer tentativa automatizada, e esta conta enxerga relatos de
> assédio e manifestações identificadas. A tela exige no mínimo 10 caracteres e
> recusa senhas que contenham "soulan". Ao trocar, todas as outras sessões dessa
> conta são encerradas.

Para dar acesso a mais gente do time, use **Configurações → Quem acessa a
administração**. Cada pessoa com a própria conta: assim dá para saber quem
respondeu o quê, e desligar um acesso sem trocar a senha de todo mundo.

---

## Como usar no dia a dia

### O canal (fica aberto o ano inteiro)

1. Divulgue o endereço do site para a empresa. O colaborador escolhe o tipo
   (sugestão, reclamação, ideia, melhoria, reconhecimento), preenche **nome
   completo, e-mail e área** — os três obrigatórios — escreve e envia.
2. O retorno vai por dois caminhos: a equipe responde **direto no e-mail** que a
   pessoa informou, e o que vira mudança para todo mundo é publicado no
   **mural**.
3. Você vê tudo em **Canal**. Ao abrir uma manifestação, você muda o status,
   define responsável e escreve um recado — **esse recado é o que a pessoa lê**.
4. Quando algo virar realidade, preencha **"O que foi feito"** e marque
   **Publicar no mural**. Aí aparece em **/mural** para toda a empresa.

> O mural é a parte que sustenta o canal. Escutar sem devolver esvazia o
> processo: em pouco tempo as pessoas param de escrever. O painel inicial avisa
> quando nada foi publicado ainda.

### O mural (menu **Mural**)

Uma tela só para o retorno. Ela separa em três grupos:

- **Esperando um retorno** — já foram analisadas ou concluídas, mas ninguém
  ficou sabendo. É a fila que importa: cada item aqui é alguém aguardando.
- **Publicadas** — dá para editar o texto ou desmarcar para tirar do ar.
- O contador de **texto escrito, não publicado** pega o caso de ter redigido a
  resposta e esquecido de marcar a caixa.

### As pesquisas

1. **Pesquisas → Nova pesquisa**. Escolha o modelo:
   - **NR-1 completo** (~50 perguntas): o inventário anual, 12 dimensões de risco.
   - **Pulso trimestral** (~30): acompanha a evolução sem cansar.
   - **Clima e eNPS** (~8): rápida o bastante para rodar todo mês.
2. Escolha como as pessoas se identificam. O padrão **Confidencial** é o
   recomendado: pede o e-mail só para impedir resposta duplicada, converte em
   código e não guarda o e-mail junto das respostas.
3. Informe quantas pessoas foram convidadas — é o que permite calcular a
   taxa de participação.
4. A pesquisa nasce como **rascunho**. Revise as perguntas e clique em
   **Abrir para respostas**.
5. Copie o **link** ou imprima o **QR code** (bom para chão de fábrica e mural).
6. Para mudar qualquer coisa depois, use **Editar**: título, prazo, público-alvo,
   modo de identificação, e também as seções e perguntas — reescrever enunciado,
   trocar o tipo de resposta, reordenar, adicionar e remover.
6. Acompanhe em **Ver painel**. Ele se monta sozinho conforme as respostas chegam.

### Os painéis

- **Visão geral**: funil do canal (recebidas → analisadas → implementadas),
  tipos de manifestação, eNPS e participação.
- **Painel da pesquisa**: índice de risco por dimensão, mapa de calor por área,
  alertas de assédio, itens mais críticos e as respostas abertas.
- **Clima e NR-1**: evolução do eNPS, satisfação, participação e os principais
  pontos positivos e de atenção.

Todos os painéis têm **Imprimir / PDF** e o painel da pesquisa tem
**Exportar CSV** (abre direto no Excel em português).

---

## Identidade visual

As cores seguem a marca Soulan: o teal do logotipo (`#2a7897`) na interface e
uma rampa do mesmo matiz nos gráficos. Dois ajustes foram necessários e vale
saber por quê:

- o teal exato do logotipo tem contraste 4,28:1 com texto branco, abaixo do
  mínimo de 4,5 — os botões usam `#2a7897`, que dá 4,96:1;
- como cor de série em gráfico ele reprova no piso de saturação (leria como
  cinza), então as barras usam `#0b81ac`, o mesmo matiz mais saturado.

O verde `#8cc63f` é decorativo (2,05:1) e nunca carrega texto.

Para usar o arquivo oficial do logotipo no lugar do desenho em SVG, veja as
instruções no topo de `components/LogoSoulan.tsx`.

---

## Privacidade e LGPD

O sistema foi montado com algumas decisões que valem explicar para o jurídico
e para as pessoas:

- **Grupo mínimo.** Recortes com menos de 5 respostas (ajustável) não aparecem
  no painel. Impede que alguém identifique uma pessoa por eliminação em uma
  área pequena.
- **Modo confidencial.** O e-mail vira um hash SHA-256 combinado com o
  identificador da pesquisa. Serve para dedupe e não permite voltar ao e-mail.
- **O banco não é público.** Todas as tabelas ficam com RLS ligado e sem
  políticas públicas. O navegador de quem responde nunca recebe chave de acesso.
- **Senhas** usam scrypt com sal individual.
- **Envio anônimo é anônimo de verdade.** Quando a pessoa marca a opção, nome e
  e-mail **não são gravados** — não ficam escondidos nem cifrados, simplesmente
  não entram no banco. Só a área é registrada, para que a administração saiba
  onde agir — ela aparece no cartão "De onde vêm as manifestações" dos painéis.
  A contrapartida: sem e-mail guardado não há como responder à pessoa, e o
  desfecho é acompanhado pelo mural.

**O que ainda depende de você:**

- Publicar um aviso de privacidade dizendo o que é coletado e por quê.
- Definir quem do time terá acesso à administração (o mínimo necessário).
- Combinar o fluxo de apuração para os alertas de assédio — o painel aponta,
  mas a apuração é um processo formal de gente, não de software.

---

## Sobre a NR-1

A Portaria MTE nº 1.419/2024 incluiu os fatores de risco psicossocial no
gerenciamento de riscos ocupacionais (PGR) da NR-1. Este sistema **levanta os
dados** que alimentam esse inventário: as 12 dimensões do questionário seguem os
agrupamentos consagrados na literatura de saúde ocupacional (COPSOQ III,
ISTAS21, HSE Management Standards), adaptados ao contexto brasileiro.

**Ele não substitui** a avaliação técnica e as medidas de controle, que são
responsabilidade do SESMT ou de profissional habilitado. Trate o painel como
insumo para o plano de ação — não como o plano de ação. Confirme com o seu
SESMT e com o jurídico como os resultados devem ser registrados no PGR da
empresa e quais prazos se aplicam ao seu caso.

---

## Editar uma pesquisa que já tem respostas

Textos continuam editáveis, mas **excluir** perguntas e seções fica bloqueado, e
isso é de propósito: as respostas já dadas seriam apagadas junto (o banco apaga
em cascata), e o painel passaria a mostrar médias de perguntas que ninguém
respondeu.

Corrigir uma vírgula ou um termo confuso: pode. Trocar o sentido de uma pergunta
no meio da coleta: evite — metade das pessoas terá respondido a uma pergunta e
metade a outra, e o número final não significa nada. Para mudar o instrumento,
crie uma pesquisa nova; assim a comparação entre ciclos continua honesta.

---

## Problemas comuns

**"Falta conectar o banco de dados"**
As variáveis de ambiente não chegaram. Local: confira o `.env.local`.
Na Vercel: Settings → Environment Variables e depois **Redeploy**.

**O QR code aponta para localhost**
Falta preencher `NEXT_PUBLIC_SITE_URL` na Vercel com o endereço real e
fazer Redeploy.

**"Não consegui criar a conta" no primeiro acesso**
O `schema.sql` não rodou. Volte à Etapa 2.

**Esqueci a senha da administração**
Ver o item de recuperação mais abaixo. Se `soulan123` ainda não foi trocada,
ela continua valendo.

**"Este e-mail já respondeu esta pesquisa"**
É o comportamento esperado: cada pessoa responde uma vez por pesquisa.

**Esqueci a senha do administrador**
Não há recuperação por e-mail. Peça a outro administrador para desativar seu
acesso em Configurações e criar um novo. Se você for a única administradora,
apague sua linha na tabela `admins` pelo Supabase (Table Editor) — a tela de
primeiro acesso volta a abrir.

**Quero mudar as perguntas**
Elas ficam em `lib/nr1-template.ts`. Alterações valem para pesquisas **novas**;
as já criadas guardam suas próprias perguntas no banco.
