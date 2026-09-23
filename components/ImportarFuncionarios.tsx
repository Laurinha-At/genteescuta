'use client'

// =============================================================
// Importar funcionários por planilha (.xlsx/.csv).
// Fluxo: baixar modelo → escolher arquivo → PRÉ-VISUALIZAR com erros →
// confirmar. Casa por e-mail (cria novos, atualiza existentes).
// =============================================================
import { useRef, useState } from 'react'
import { Download, Upload, CheckCircle2, X, Loader2 } from 'lucide-react'
import { lerEValidar, modeloCSV, type LinhaImport } from '@/lib/importarFuncionarios'
import { listarFuncionarios, importarFuncionarios } from '@/lib/fb/funcionarios'
import { Botao, Aviso, Chip } from '@/components/ui'

export function ImportarFuncionarios({ onDone }: { onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [linhas, setLinhas] = useState<LinhaImport[] | null>(null)
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [lendo, setLendo] = useState(false)
  const [importando, setImportando] = useState(false)

  const validas = linhas?.filter((l) => l.acao !== 'ignorar') ?? []
  const criar = validas.filter((l) => l.acao === 'criar').length
  const atualizar = validas.filter((l) => l.acao === 'atualizar').length
  const comErro = linhas?.filter((l) => l.acao === 'ignorar').length ?? 0

  function baixarModelo() {
    const blob = new Blob([modeloCSV()], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo-funcionarios.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  async function aoEscolher(file: File | null) {
    if (!file) return
    setErro(null); setAviso(null); setLinhas(null); setLendo(true); setNomeArquivo(file.name)
    try {
      const existentes = await listarFuncionarios()
      const emails = new Set(existentes.map((f: any) => String(f.email ?? '').toLowerCase()).filter(Boolean))
      const res = await lerEValidar(file, emails)
      if (res.length === 0) setErro('A planilha não tem linhas de dados (confira o cabeçalho e as colunas).')
      setLinhas(res)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui ler a planilha.')
    }
    setLendo(false)
  }

  function limpar() {
    setLinhas(null); setNomeArquivo(''); setErro(null); setAviso(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function confirmar() {
    if (!linhas) return
    setImportando(true); setErro(null); setAviso(null)
    try {
      const r = await importarFuncionarios(linhas)
      setAviso(`Importação concluída: ${r.criados} novo(s), ${r.atualizados} atualizado(s)` +
        (r.ignorados ? `, ${r.ignorados} ignorado(s) por erro` : '') +
        (r.falhas ? `, ${r.falhas} falha(s)` : '') + '.')
      limpar()
      onDone()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui importar.')
    }
    setImportando(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Botao type="button" variante="secundario" onClick={baixarModelo}>
          <Download size={15} aria-hidden /> Baixar modelo (.csv)
        </Botao>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-4 py-2.5 text-sm font-semibold text-tinta transition-colors hover:border-marca hover:text-marca-texto">
          <Upload size={15} aria-hidden /> {lendo ? 'Lendo…' : 'Escolher planilha (.xlsx/.csv)'}
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => aoEscolher(e.target.files?.[0] ?? null)} />
        </label>
        {nomeArquivo && <span className="text-xs text-tinta-3">{nomeArquivo}</span>}
      </div>

      <p className="text-xs leading-5 text-tinta-3">
        Colunas: <strong>Nome</strong>, <strong>E-mail institucional</strong>, <strong>Centro de custo</strong>,
        {' '}<strong>Data de aniversário</strong>, <strong>Data de admissão</strong>, <strong>Matrícula</strong> e (opcional) <strong>Papéis</strong>.
        Datas em DD/MM/AAAA. Novos entram com a senha padrão; existentes são atualizados pelo e-mail.
      </p>

      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {aviso && !erro && <Aviso tom="sucesso">{aviso}</Aviso>}

      {linhas && linhas.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Chip faixa="baixo">{criar} novo(s)</Chip>
            <Chip faixa="marca">{atualizar} atualização(ões)</Chip>
            {comErro > 0 && <Chip faixa="critico">{comErro} com erro</Chip>}
            <button type="button" onClick={limpar} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-tinta-3 hover:text-critico">
              <X size={13} aria-hidden /> Limpar
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-borda">
            <table className="w-full min-w-[52rem] text-xs">
              <thead>
                <tr className="border-b border-borda bg-superficie-2 text-left font-semibold text-tinta-3">
                  <th className="px-3 py-2">Linha</th>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">E-mail</th>
                  <th className="px-3 py-2">Centro de custo</th>
                  <th className="px-3 py-2">Matrícula</th>
                  <th className="px-3 py-2">Aniv.</th>
                  <th className="px-3 py-2">Admissão</th>
                  <th className="px-3 py-2">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {linhas.map((l) => (
                  <tr key={l.linha} className={l.acao === 'ignorar' ? 'bg-[#fdeaea]/40' : ''}>
                    <td className="px-3 py-2 text-tinta-3">{l.linha}</td>
                    <td className="px-3 py-2 text-tinta">{l.nome || '—'}</td>
                    <td className="px-3 py-2 text-tinta-2">{l.email || '—'}</td>
                    <td className="px-3 py-2 text-tinta-2">{l.centro_custo || '—'}</td>
                    <td className="px-3 py-2 text-tinta-2">{l.matricula || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-tinta-2">{l.aniversario || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-tinta-2">{l.admissao || '—'}</td>
                    <td className="px-3 py-2">
                      {l.acao === 'ignorar' ? (
                        <span className="font-medium text-critico">{l.erros.join(' ')}</span>
                      ) : (
                        <span className="text-tinta-2">
                          {l.acao === 'criar' ? 'Criar' : 'Atualizar'}
                          {l.avisos.length > 0 && <span className="block text-[#8a6d00]">⚠ {l.avisos.join(' ')}</span>}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Botao type="button" onClick={confirmar} disabled={importando || validas.length === 0}>
              {importando ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Importando…</> : <><CheckCircle2 size={15} aria-hidden /> Confirmar importação ({validas.length})</>}
            </Botao>
            {comErro > 0 && <p className="text-xs text-tinta-3">Linhas com erro são ignoradas; corrija na planilha e reenvie.</p>}
          </div>
        </>
      )}
    </div>
  )
}
