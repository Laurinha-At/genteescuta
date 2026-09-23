'use client'

// =============================================================
// Destaques do dia (aniversários e tempo de Soulan) para o Mural.
//
// Lê a projeção PÚBLICA `aniversarios` (só nome + dia/mês), compara com
// HOJE no fuso America/Sao_Paulo e monta as mensagens do dia.
// =============================================================
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export interface DestaqueDia {
  tipo: 'aniversario' | 'tempo'
  nome: string
  anos?: number
  texto: string
}

/** Data de hoje no fuso de São Paulo (independe do fuso do navegador). */
function hojeSaoPaulo(): { dia: number; mes: number; ano: number } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const get = (t: string) => Number(partes.find((p) => p.type === t)?.value)
  return { dia: get('day'), mes: get('month'), ano: get('year') }
}

export async function destaquesDoDia(): Promise<DestaqueDia[]> {
  const snap = await getDocs(collection(db(), 'aniversarios')).catch(() => null)
  if (!snap) return []
  const { dia, mes, ano } = hojeSaoPaulo()
  const out: DestaqueDia[] = []

  for (const d of snap.docs) {
    const x = d.data() as Record<string, unknown>
    const nome = String(x.nome ?? '').trim()
    if (!nome) continue

    if (x.aniv_dia === dia && x.aniv_mes === mes) {
      out.push({ tipo: 'aniversario', nome, texto: `Hoje ${nome} faz aniversário 🎉` })
    }
    if (x.adm_dia === dia && x.adm_mes === mes && x.adm_ano) {
      const anos = ano - Number(x.adm_ano)
      if (anos >= 1) {
        out.push({ tipo: 'tempo', nome, anos, texto: `Hoje ${nome} completa ${anos} ${anos === 1 ? 'ano' : 'anos'} de Soulan 🎉` })
      }
    }
  }
  // Aniversários primeiro, depois tempo de casa; ambos em ordem alfabética.
  return out.sort((a, b) => (a.tipo === b.tipo ? a.nome.localeCompare(b.nome) : a.tipo === 'aniversario' ? -1 : 1))
}

// -------------------------------------------------------------
// Painel do mês (página "Aniversariantes do mês")
// -------------------------------------------------------------
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export interface PessoaMes {
  nome: string
  dia: number
  hoje: boolean
  foto?: string | null
  anos?: number
}

export interface AniversariantesMes {
  mes: number
  mesNome: string
  temHoje: boolean
  aniversarios: PessoaMes[]
  tempos: PessoaMes[]
}

export async function aniversariantesDoMes(): Promise<AniversariantesMes> {
  const snap = await getDocs(collection(db(), 'aniversarios')).catch(() => null)
  const { dia, mes, ano } = hojeSaoPaulo()
  const aniversarios: PessoaMes[] = []
  const tempos: PessoaMes[] = []

  if (snap) for (const d of snap.docs) {
    const x = d.data() as Record<string, unknown>
    const nome = String(x.nome ?? '').trim()
    if (!nome) continue
    const foto = (x.foto as string) ?? null

    if (x.aniv_mes === mes && x.aniv_dia) {
      aniversarios.push({ nome, dia: Number(x.aniv_dia), hoje: x.aniv_dia === dia, foto })
    }
    if (x.adm_mes === mes && x.adm_dia && x.adm_ano) {
      const anos = ano - Number(x.adm_ano)
      if (anos >= 1) tempos.push({ nome, dia: Number(x.adm_dia), hoje: x.adm_dia === dia, anos, foto })
    }
  }

  const porDia = (a: PessoaMes, b: PessoaMes) => a.dia - b.dia || a.nome.localeCompare(b.nome)
  aniversarios.sort(porDia)
  tempos.sort(porDia)

  return {
    mes,
    mesNome: MESES[mes - 1],
    temHoje: aniversarios.some((p) => p.hoje) || tempos.some((p) => p.hoje),
    aniversarios,
    tempos,
  }
}
