'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mail, UserX, MapPin, Calendar, User } from 'lucide-react'
import { getManifestacao } from '@/lib/fb/admin'
import { CabecalhoPagina, Cartao, Chip, Aviso } from '@/components/ui'
import { LinhaDoTempo, StatusChip } from '@/components/StatusManifestacao'
import { FormTratativa, FormMural } from '@/components/FormTratativa'
import { TIPO_MANIFESTACAO_LABEL, type ManifestacaoTipo } from '@/lib/types'
import { fmtDataHora } from '@/lib/format'

function Detalhe() {
  const params = useSearchParams()
  const id = params.get('id') ?? ''
  const [m, setM] = useState<any>(null)
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'nao'>('carregando')

  function recarregar() {
    if (!id) return setEstado('nao')
    getManifestacao(id).then((d) => { if (d) { setM(d); setEstado('ok') } else setEstado('nao') }).catch(() => setEstado('nao'))
  }
  useEffect(recarregar, [id])

  if (estado === 'carregando') return <div className="p-6 text-sm text-tinta-3">Carregando…</div>
  if (estado === 'nao' || !m) {
    return (
      <>
        <CabecalhoPagina titulo="Manifestação não encontrada" voltar={{ href: '/admin/canal', rotulo: 'Voltar ao canal' }} />
      </>
    )
  }

  const historico = (m.updates ?? []).filter((u: any) => u.visivel_ao_colaborador !== false)

  return (
    <>
      <CabecalhoPagina
        titulo={m.titulo}
        voltar={{ href: '/admin/canal', rotulo: 'Voltar ao canal' }}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            <StatusChip status={m.status} />
            <Chip faixa="neutro">{TIPO_MANIFESTACAO_LABEL[m.tipo as ManifestacaoTipo]}</Chip>
            <Chip faixa="marca">{m.area}</Chip>
            {m.anonima && <Chip faixa="neutro">Envio anônimo</Chip>}
          </span>
        }
      />

      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Cartao titulo="O que foi enviado">
            <p className="whitespace-pre-line text-sm leading-6 text-tinta-2">{m.descricao}</p>
          </Cartao>

          {m.anonima && (
            <Aviso tom="alerta" titulo="Manifestação anônima">
              Nome e e-mail não foram gravados. A área <strong>{m.area}</strong> ficou registrada: use ela para direcionar. O retorno só chega à pessoa pelo mural.
            </Aviso>
          )}

          <FormTratativa m={m} aoSalvar={recarregar} />
          <FormMural m={m} aoSalvar={recarregar} />
        </div>

        <div className="space-y-4">
          <Cartao titulo="Quem enviou">
            <dl className="space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                {m.anonima ? <UserX size={15} className="mt-0.5 flex-none text-tinta-3" aria-hidden /> : <User size={15} className="mt-0.5 flex-none text-tinta-3" aria-hidden />}
                <div className="min-w-0"><dt className="text-xs text-tinta-3">Nome</dt><dd className="font-medium text-tinta">{m.anonima ? 'Não identificado' : (m.nome ?? '—')}</dd></div>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail size={15} className="mt-0.5 flex-none text-tinta-3" aria-hidden />
                <div className="min-w-0"><dt className="text-xs text-tinta-3">E-mail</dt><dd className="break-all font-medium text-tinta">{m.anonima ? 'Não gravado' : (m.email ?? '—')}</dd></div>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin size={15} className="mt-0.5 flex-none text-tinta-3" aria-hidden />
                <div><dt className="text-xs text-tinta-3">Área ou setor</dt><dd className="font-medium text-tinta">{m.area}</dd></div>
              </div>
              <div className="flex items-start gap-2.5">
                <Calendar size={15} className="mt-0.5 flex-none text-tinta-3" aria-hidden />
                <div><dt className="text-xs text-tinta-3">Recebida em</dt><dd className="font-medium text-tinta">{fmtDataHora(m.criado_em)}</dd></div>
              </div>
              {m.responsavel && (
                <div className="border-t border-borda pt-3"><dt className="text-xs text-tinta-3">Responsável</dt><dd className="font-medium text-tinta">{m.responsavel}</dd></div>
              )}
            </dl>
          </Cartao>

          <Cartao titulo="Histórico"><LinhaDoTempo eventos={historico} /></Cartao>
        </div>
      </div>
    </>
  )
}

export default function DetalheManifestacao() {
  return <Suspense fallback={null}><Detalhe /></Suspense>
}
