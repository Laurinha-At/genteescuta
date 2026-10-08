'use client'

import { useEffect, useState } from 'react'
import { LifeBuoy, Mail, Phone, Users, Download, ChevronDown } from 'lucide-react'
import { BotaoVoltar } from '@/components/BotaoVoltar'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { getContato, CONTATO_PADRAO, type ContatoConfig } from '@/lib/fb/contato'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'

function telLink(t: string) {
  return `tel:+55${t.replace(/\D/g, '')}`
}

// -------------------------------------------------------------
// Tipos de solicitação (fluxo de orientação, ainda sem envio).
// Cada item é dado puro: no futuro, o botão "Escrever e-mail"
// pode virar um botão de solicitação real sem refazer a tela.
// -------------------------------------------------------------
type Solicitacao = {
  id: string
  emoji: string
  titulo: string
  email: string
  assunto: string
  corpo?: string[]
  observacao?: string
  documento?: { rotulo: string; href: string; instrucao: string }
  passos: string[]
}

const SOLICITACOES: Solicitacao[] = [
  {
    id: 'uber',
    emoji: '🚗',
    titulo: 'Cadastro de Uber',
    email: 'fabiana@soulan.com.br',
    assunto: 'Cadastro Uber',
    corpo: ['Nome completo:', 'Área/centro de custo:', 'Finalidade do uso:'],
    observacao: 'Coloque o seu gestor em cópia (CC). Ele precisa estar ciente e aprovar antes de seguir.',
    passos: [
      'Clique em "Escrever e-mail": ele já abre com o assunto e os campos prontos.',
      'Preencha nome completo, área/centro de custo e finalidade do uso.',
      'Coloque o seu gestor em cópia (CC) para aprovação.',
      'Envie o e-mail.',
    ],
  },
  {
    id: 'admissao-interna',
    emoji: '👤',
    titulo: 'Admissão Interna',
    email: 'gentecultura@soulan.com.br',
    assunto: 'Admissão Interna',
    documento: {
      rotulo: 'Baixar formulário de admissão',
      href: '/docs/formulario-nova-admissao.docx',
      instrucao: 'Preencha o formulário e anexe ao e-mail.',
    },
    passos: [
      'Baixe o formulário de admissão no botão acima.',
      'Preencha todos os campos do formulário.',
      'Clique em "Escrever e-mail" e anexe o formulário preenchido.',
      'Envie o e-mail.',
    ],
  },
  {
    id: 'movimentacao-interna',
    emoji: '🔄',
    titulo: 'Movimentação Interna',
    email: 'gentecultura@soulan.com.br',
    assunto: 'Movimentação Interna',
    documento: {
      rotulo: 'Baixar formulário de movimentação',
      href: '/docs/formulario-movimentacao-interna.docx',
      instrucao: 'Preencha o formulário e anexe ao e-mail.',
    },
    passos: [
      'Baixe o formulário de movimentação no botão acima.',
      'Preencha todos os campos do formulário.',
      'Clique em "Escrever e-mail" e anexe o formulário preenchido.',
      'Envie o e-mail.',
    ],
  },
  {
    id: 'convenio',
    emoji: '🏥',
    titulo: 'Convênio Médico',
    email: 'beneficios@soulan.com.br',
    assunto: 'Convênio Médico',
    corpo: ['Nome:', 'Centro de custo:', 'Tipo (cadastro, valores, inclusão de dependente, 2ª via, dúvida de cobertura):'],
    passos: [
      'Clique em "Escrever e-mail": ele já abre com o assunto e os campos prontos.',
      'Preencha nome, centro de custo e o tipo da solicitação.',
      'Envie o e-mail.',
    ],
  },
  {
    id: 'pagamentos',
    emoji: '💰',
    titulo: 'Pagamentos / Salários',
    email: 'folha@soulan.com.br',
    assunto: 'Salário referente ao mês de ',
    corpo: ['Nome:', 'Matrícula:', 'Mês de referência:', 'Descrição:'],
    passos: [
      'Clique em "Escrever e-mail" e complete o mês de referência no assunto.',
      'Preencha nome, matrícula, mês de referência e a descrição.',
      'Envie o e-mail.',
    ],
  },
  {
    id: 'vr-va-vt',
    emoji: '🍽️',
    titulo: 'VR, VA e VT',
    email: 'beneficios@soulan.com.br',
    assunto: 'VR / VA / VT',
    corpo: ['Nome:', 'Tipo (alteração cadastral, de residência ou valor errado):', 'Descrição:'],
    passos: [
      'Clique em "Escrever e-mail": ele já abre com o assunto e os campos prontos.',
      'Preencha nome, o tipo e a descrição.',
      'Envie o e-mail.',
    ],
  },
]

function mailtoHref(s: Solicitacao) {
  const params: string[] = []
  if (s.assunto) params.push(`subject=${encodeURIComponent(s.assunto)}`)
  const corpo = (s.corpo ?? []).join('\n')
  if (corpo) params.push(`body=${encodeURIComponent(corpo)}`)
  return `mailto:${s.email}${params.length ? `?${params.join('&')}` : ''}`
}

const ROTULO_BLOCO = 'text-[0.6875rem] font-semibold uppercase tracking-wide text-tinta-3'

function CardSolicitacao({ s }: { s: Solicitacao }) {
  return (
    <details className="group rounded-xl border border-borda bg-white open:shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="text-xl leading-none" aria-hidden>{s.emoji}</span>
        <span className="flex-1 text-sm font-semibold text-tinta sm:text-[0.9375rem]">{s.titulo}</span>
        <ChevronDown size={18} className="flex-none text-tinta-3 transition-transform group-open:rotate-180" aria-hidden />
      </summary>

      <div className="space-y-4 border-t border-borda px-4 py-4">
        {/* Com quem falar */}
        <div>
          <p className={ROTULO_BLOCO}>Com quem falar</p>
          <a
            href={mailtoHref(s)}
            className="botao-gradiente mt-2 inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold"
          >
            <Mail size={16} aria-hidden /> Escrever e-mail para {s.email}
          </a>
          {s.observacao && (
            <p className="mt-2 rounded-lg bg-superficie-2 px-3 py-2 text-xs leading-5 text-tinta-2">
              <strong className="font-semibold text-tinta">Atenção:</strong> {s.observacao}
            </p>
          )}
        </div>

        {/* Documento, quando houver */}
        {s.documento && (
          <div>
            <p className={ROTULO_BLOCO}>Documento</p>
            <a
              href={s.documento.href}
              download
              className="mt-2 inline-flex items-center gap-2 rounded-lg border border-borda-forte bg-white px-3.5 py-2.5 text-sm font-medium text-tinta transition-colors hover:border-marca hover:text-marca-texto"
            >
              <Download size={16} className="flex-none text-marca" aria-hidden /> {s.documento.rotulo}
            </a>
            <p className="mt-1.5 text-xs leading-5 text-tinta-3">{s.documento.instrucao}</p>
          </div>
        )}

        {/* Como pedir */}
        <div>
          <p className={ROTULO_BLOCO}>Como pedir</p>
          <ol className="mt-2 space-y-1.5">
            {s.passos.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-6 text-tinta-2">
                <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-marca-clara text-[0.6875rem] font-bold text-marca-texto">{i + 1}</span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </details>
  )
}

export default function Contato() {
  const [empresa, setEmpresa] = useState('Soulan Recursos Humanos')
  const [conteudo, setConteudo] = useState<ContatoConfig>(CONTATO_PADRAO)

  useEffect(() => {
    if (!configurado()) return
    getConfig().then((c) => setEmpresa(c.empresa_nome)).catch(() => {})
    getContato().then(setConteudo).catch(() => {})
  }, [])

  if (!configurado()) return <TelaConfiguracao />

  const EMAIL_CONTATO = conteudo.email_contato
  const FOCAIS = conteudo.focais
  const CONTATOS = conteudo.contatos

  return (
    <div className="min-h-screen">
      <CabecalhoPublico empresa={empresa} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <BotaoVoltar />

        {/* Cabeçalho */}
        <div className="mt-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-marca-clara text-marca">
            <LifeBuoy size={22} aria-hidden />
          </span>
          <h1 className="titulo-hero mt-4 text-[1.75rem] text-tinta">Contato e Suporte</h1>
          <p className="mt-3 max-w-2xl whitespace-pre-wrap text-[0.9688rem] leading-7 text-tinta-2">{conteudo.intro_topo}</p>
        </div>

        {/* Duas colunas: solicitações (maior) + contatos (menor). No celular empilha com as solicitações em cima. */}
        <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
          {/* Coluna esquerda: solicitações */}
          <section className="cartao-g p-5 sm:p-6">
            <h2 className="titulo-secao text-tinta">Qual solicitação você deseja realizar?</h2>
            <p className="mt-2 text-sm leading-6 text-tinta-2">Escolha o tipo para ver a orientação: com quem falar, como pedir e, quando houver, o documento necessário.</p>
            <div className="mt-4 space-y-2.5">
              {SOLICITACOES.map((s) => (
                <CardSolicitacao key={s.id} s={s} />
              ))}
            </div>
          </section>

          {/* Coluna direita: contatos diretos (conteúdo existente, reorganizado) */}
          <aside className="cartao-g p-5 sm:p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-marca-clara text-marca">
              <Users size={20} aria-hidden />
            </span>
            <h2 className="titulo-secao mt-3 text-tinta">Contatos diretos</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-tinta-2">{conteudo.intro_focais}</p>

            {EMAIL_CONTATO && (
              <a
                href={`mailto:${EMAIL_CONTATO}`}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-borda-forte bg-white px-3.5 py-2.5 text-sm font-medium text-tinta transition-colors hover:border-marca hover:text-marca-texto"
              >
                <Mail size={16} className="flex-none text-marca" aria-hidden /> {EMAIL_CONTATO}
              </a>
            )}

            {/* Responsáveis por assunto */}
            {FOCAIS.length > 0 && (
              <>
                <h3 className="mt-6 text-sm font-semibold text-tinta">Por assunto</h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {FOCAIS.map(({ assunto, responsaveis }, i) => (
                    <li key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg bg-superficie-2 px-3.5 py-2.5 text-sm">
                      <span className="font-semibold text-tinta">{assunto}:</span>
                      <span className="text-tinta-2">{responsaveis}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Diretório: telefones e e-mails */}
            {CONTATOS.length > 0 && (
              <>
                <h3 className="mt-6 text-sm font-semibold text-tinta">Telefones e e-mails</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {CONTATOS.map(({ nome, cargo, telefone, email }, i) => (
                    <div key={i} className="rounded-lg border border-borda bg-white px-4 py-3">
                      <span className="block text-sm font-semibold text-tinta">{nome}</span>
                      {cargo && <span className="block text-xs text-tinta-3">{cargo}</span>}
                      <div className="mt-1.5 flex flex-col gap-1 text-sm">
                        {telefone && (
                          <a href={telLink(telefone)} className="inline-flex items-center gap-1.5 text-tinta-2 transition-colors hover:text-marca-texto">
                            <Phone size={14} className="flex-none text-marca" aria-hidden /> {telefone}
                          </a>
                        )}
                        {email && (
                          <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 break-all text-tinta-2 transition-colors hover:text-marca-texto">
                            <Mail size={14} className="flex-none text-marca" aria-hidden /> {email}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </aside>
        </div>
      </main>
      <RodapePublico />
    </div>
  )
}
