-- =============================================================
-- GENTE ESCUTA — estrutura do banco de dados
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em RUN.
-- Pode rodar mais de uma vez sem quebrar nada.
-- =============================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- ADMINISTRADORES E SESSÕES
-- O primeiro admin é criado pela própria tela /admin/primeiro-acesso
-- -------------------------------------------------------------
create table if not exists admins (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  nome        text not null,
  senha_hash  text not null,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create table if not exists sessoes (
  token      text primary key,
  admin_id   uuid not null references admins(id) on delete cascade,
  expira_em  timestamptz not null,
  criado_em  timestamptz not null default now()
);
create index if not exists sessoes_admin_idx on sessoes(admin_id);

-- -------------------------------------------------------------
-- CONFIGURAÇÃO DA EMPRESA (linha única)
-- -------------------------------------------------------------
create table if not exists config (
  id             int primary key default 1 check (id = 1),
  empresa_nome   text not null default 'Soulan Recursos Humanos',
  canal_mensagem text not null default 'Este é um canal seguro. Sua manifestação será analisada pela equipe de Gente e Gestão e você receberá um retorno.',
  min_grupo      int  not null default 5,
  atualizado_em  timestamptz not null default now()
);
insert into config (id) values (1) on conflict (id) do nothing;

-- -------------------------------------------------------------
-- ÁREAS / SETORES
-- -------------------------------------------------------------
create table if not exists areas (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null unique,
  ativa     boolean not null default true,
  ordem     int not null default 0,
  criado_em timestamptz not null default now()
);

-- =============================================================
-- PESQUISAS (NR-1, clima, eNPS, personalizadas)
-- =============================================================
create table if not exists pesquisas (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  titulo            text not null,
  descricao         text,
  mensagem_abertura text,
  tipo              text not null default 'nr1'
                    check (tipo in ('nr1','clima','personalizada')),
  status            text not null default 'rascunho'
                    check (status in ('rascunho','aberta','encerrada')),
  -- identificada  = e-mail fica visível para o admin
  -- confidencial  = e-mail só serve para evitar resposta duplicada (guardado com hash)
  -- anonima       = não pede e-mail
  identificacao     text not null default 'confidencial'
                    check (identificacao in ('identificada','confidencial','anonima')),
  min_grupo         int not null default 5,
  publico_alvo      int,
  abre_em           timestamptz,
  fecha_em          timestamptz,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);
create index if not exists pesquisas_status_idx on pesquisas(status);

create table if not exists secoes (
  id          uuid primary key default gen_random_uuid(),
  pesquisa_id uuid not null references pesquisas(id) on delete cascade,
  titulo      text not null,
  descricao   text,
  dimensao    text,
  ordem       int not null default 0
);
create index if not exists secoes_pesquisa_idx on secoes(pesquisa_id, ordem);

create table if not exists perguntas (
  id          uuid primary key default gen_random_uuid(),
  pesquisa_id uuid not null references pesquisas(id) on delete cascade,
  secao_id    uuid references secoes(id) on delete cascade,
  enunciado   text not null,
  ajuda       text,
  tipo        text not null default 'likert5'
              check (tipo in ('likert5','enps','nota10','escolha_unica','escolha_multipla','texto','texto_longo','sim_nao')),
  opcoes      jsonb,
  obrigatoria boolean not null default true,
  -- invertida: item protetivo (ex.: "meu gestor me apoia") — nota alta significa MENOS risco
  invertida   boolean not null default false,
  -- critica: assédio, violência, discriminação — qualquer ocorrência gera alerta
  critica     boolean not null default false,
  peso        numeric not null default 1,
  -- segmentacao: marca as perguntas de recorte (area, cargo, tempo_casa, modelo_trabalho)
  segmentacao text,
  ordem       int not null default 0
);
create index if not exists perguntas_pesquisa_idx on perguntas(pesquisa_id, ordem);
create index if not exists perguntas_secao_idx on perguntas(secao_id, ordem);

create table if not exists respostas (
  id              uuid primary key default gen_random_uuid(),
  pesquisa_id     uuid not null references pesquisas(id) on delete cascade,
  email           text,
  email_hash      text,
  area            text,
  cargo           text,
  tempo_casa      text,
  modelo_trabalho text,
  enviada_em      timestamptz not null default now()
);
create index if not exists respostas_pesquisa_idx on respostas(pesquisa_id);
-- impede a mesma pessoa de responder duas vezes a mesma pesquisa
create unique index if not exists respostas_dedupe_idx
  on respostas (pesquisa_id, email_hash) where email_hash is not null;

create table if not exists itens_resposta (
  id          uuid primary key default gen_random_uuid(),
  resposta_id uuid not null references respostas(id) on delete cascade,
  pergunta_id uuid not null references perguntas(id) on delete cascade,
  valor_num   numeric,
  valor_texto text,
  valor_json  jsonb
);
create index if not exists itens_resposta_resposta_idx on itens_resposta(resposta_id);
create index if not exists itens_resposta_pergunta_idx on itens_resposta(pergunta_id);

-- =============================================================
-- CANAL PERMANENTE — manifestações e o retorno ao colaborador
-- =============================================================
create table if not exists manifestacoes (
  id                 uuid primary key default gen_random_uuid(),
  tipo               text not null
                     check (tipo in ('sugestao','reclamacao','ideia','melhoria','reconhecimento')),
  titulo             text not null,
  descricao          text not null,
  nome               text,
  email              text,
  area               text not null,
  anonima            boolean not null default false,
  status             text not null default 'recebida'
                     check (status in ('recebida','em_analise','analisada','em_implementacao','implementada','nao_aplicavel','arquivada')),
  prioridade         text not null default 'media' check (prioridade in ('baixa','media','alta')),
  responsavel        text,
  resposta_publica   text,
  publicar_no_mural  boolean not null default false,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  analisada_em       timestamptz,
  implementada_em    timestamptz
);
create index if not exists manifestacoes_status_idx on manifestacoes(status);
create index if not exists manifestacoes_tipo_idx on manifestacoes(tipo);
create index if not exists manifestacoes_criado_idx on manifestacoes(criado_em desc);
create index if not exists manifestacoes_mural_idx on manifestacoes(publicar_no_mural) where publicar_no_mural;
create index if not exists manifestacoes_area_idx on manifestacoes(area);
create index if not exists manifestacoes_email_idx on manifestacoes(lower(email));

-- -------------------------------------------------------------
-- Ajuste para quem já rodou uma versão anterior deste arquivo.
-- Não faz nada em instalação nova.
-- -------------------------------------------------------------
alter table manifestacoes add column if not exists nome text;
alter table manifestacoes drop column if exists protocolo;
update manifestacoes set area = coalesce(area, 'Nao informada') where area is null;
alter table manifestacoes alter column area set not null;


-- cada movimentação vira uma linha aqui: é o histórico que o colaborador enxerga
create table if not exists manifestacao_updates (
  id                     uuid primary key default gen_random_uuid(),
  manifestacao_id        uuid not null references manifestacoes(id) on delete cascade,
  status_anterior        text,
  status_novo            text,
  mensagem               text,
  autor                  text,
  visivel_ao_colaborador boolean not null default true,
  criado_em              timestamptz not null default now()
);
create index if not exists manifestacao_updates_idx
  on manifestacao_updates(manifestacao_id, criado_em);

-- -------------------------------------------------------------
-- Carimba automaticamente as datas do funil quando o status muda
-- -------------------------------------------------------------
create or replace function marcar_datas_manifestacao()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();

  if new.status is distinct from old.status then
    if new.status in ('analisada','em_implementacao','implementada')
       and new.analisada_em is null then
      new.analisada_em := now();
    end if;

    if new.status = 'implementada' and new.implementada_em is null then
      new.implementada_em := now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_marcar_datas_manifestacao on manifestacoes;
create trigger trg_marcar_datas_manifestacao
  before update on manifestacoes
  for each row execute function marcar_datas_manifestacao();

create or replace function tocar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_pesquisas_atualizado on pesquisas;
create trigger trg_pesquisas_atualizado
  before update on pesquisas
  for each row execute function tocar_atualizado_em();

-- =============================================================
-- SEGURANÇA
-- O aplicativo acessa o banco apenas pelo servidor, usando a
-- service role key. Ligamos RLS sem criar políticas públicas:
-- assim, mesmo que a chave pública vaze, ninguém lê nada direto.
-- =============================================================
alter table admins               enable row level security;
alter table sessoes              enable row level security;
alter table config               enable row level security;
alter table areas                enable row level security;
alter table pesquisas            enable row level security;
alter table secoes               enable row level security;
alter table perguntas            enable row level security;
alter table respostas            enable row level security;
alter table itens_resposta       enable row level security;
alter table manifestacoes        enable row level security;
alter table manifestacao_updates enable row level security;

-- -------------------------------------------------------------
-- Áreas iniciais (edite à vontade depois, dentro do sistema)
-- -------------------------------------------------------------
insert into areas (nome, ordem) values
  ('Administrativo / Financeiro', 1),
  ('Comercial / Vendas', 2),
  ('Marketing', 3),
  ('Operações', 4),
  ('Produção', 5),
  ('Recursos Humanos', 6),
  ('Tecnologia', 7),
  ('Atendimento / Suporte', 8),
  ('Logística', 9),
  ('Liderança / Diretoria', 10)
on conflict (nome) do nothing;

-- -------------------------------------------------------------
-- CONTA INICIAL DA ADMINISTRAÇÃO
--
-- E-mail: gentecultura@soulan.com.br
-- Senha:  soulan123
--
-- A senha fica guardada como hash scrypt com sal individual — o valor
-- abaixo não permite voltar à senha original.
--
-- ATENÇÃO: esta é uma senha provisória e fraca. Troque no primeiro acesso,
-- em Configurações → Minha senha. Esta conta enxerga relatos de assédio e
-- manifestações identificadas.
-- -------------------------------------------------------------
insert into admins (nome, email, senha_hash) values (
  'Gente e Cultura',
  'gentecultura@soulan.com.br',
  '94153c2f9f34b6d5d43e2956fac6a25e:acf63378fbb79da86674d7a20f48d13c51f6a835806271c2e1ecea5cf84053e0dd29c0108a7877bef35e2b80372e8fe400c67900493e8dc09d78ba7e437439e2'
) on conflict (email) do nothing;
