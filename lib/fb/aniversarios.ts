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
