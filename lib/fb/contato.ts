'use client'

// =============================================================
// Conteúdo da página "Contato e Suporte" — editável pelo painel.
// Guardado em `config/contato`. Público lê; só admin (Master) grava.
// Se ainda não houver o doc, usa CONTATO_PADRAO (o conteúdo atual).
// =============================================================
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { registrarLog } from './usuarios'

export interface Focal { assunto: string; responsaveis: string }
export interface ContatoPessoa { nome: string; cargo: string; email: string; telefone: string }

export interface ContatoConfig {
  email_contato: string
  intro_topo: string
  aviso_sigilo: string
  intro_focais: string
  focais: Focal[]
  contatos: ContatoPessoa[]
}

export const CONTATO_PADRAO: ContatoConfig = {
  email_contato: 'gentecultura@soulan.com.br',
  intro_topo: 'Precisa de ajuda ou quer falar diretamente com a equipe de Gente & Cultura? A gente responde.',
  aviso_sigilo: 'Para relatos que exigem sigilo, você também pode usar o próprio canal do Gente Cultura, de forma anônima.',
  intro_focais: 'Para facilitar a comunicação e garantir que suas dúvidas sejam rapidamente respondidas, listamos abaixo os contatos das pessoas focais para cada tipo de situação. Em caso de necessidade, entre em contato diretamente com o responsável pelo assunto específico:',
  focais: [
    { assunto: 'TI', responsaveis: 'Nil' },
    { assunto: 'Gente & Cultura', responsaveis: 'Sarah ou Laura' },
    { assunto: 'Ponto', responsaveis: 'Laura' },
    { assunto: 'Benefícios', responsaveis: 'Edna' },
    { assunto: 'Alterações cadastrais e pagamentos', responsaveis: 'Luciana ou Edilaine' },
    { assunto: 'Equipamentos (Notebook, Celular, Chip)', responsaveis: 'Nathalya ou Fabiana' },
  ],
  contatos: [
    { nome: 'Nil', cargo: 'TI', email: 'nil@scavasin.com.br', telefone: '11 98356-0033' },
    { nome: 'Sarah', cargo: 'Gente & Cultura', email: 'sarah.ribeiro@soulan.com.br', telefone: '11 98212-3474' },
    { nome: 'Laura', cargo: 'Gente & Cultura', email: 'laura.antunes@soulan.com.br', telefone: '11 99102-0882' },
    { nome: 'Fabiana', cargo: 'Cadastro e Suprimentos', email: 'fabiana@soulan.com.br', telefone: '11 98636-5791' },
    { nome: 'Nathalya', cargo: 'Cadastro e Suprimentos', email: 'nathalya.araujo@soulan.com.br', telefone: '11 94054-6040' },
    { nome: 'Daniela', cargo: 'Administrativo/Financeiro', email: 'daniela@soulan.com.br', telefone: '11 97662-3686' },
    { nome: 'Luciana', cargo: 'Administrativo/Financeiro', email: 'luciana.yassuda@souan.com.br', telefone: '11 98171-8659' },
    { nome: 'Edna', cargo: 'Benefícios', email: 'edna@soulan.com.br', telefone: '11 97642-9673' },
    { nome: 'Edilaine', cargo: 'Administrativo/Financeiro', email: 'edilaine@soulan.com.br', telefone: '11 99953-0630' },
  ],
}

export async function getContato(): Promise<ContatoConfig> {
  const snap = await getDoc(doc(db(), 'config', 'contato')).catch(() => null)
  if (!snap || !snap.exists()) return CONTATO_PADRAO
  const d = snap.data() as Partial<ContatoConfig>
  return {
    email_contato: d.email_contato ?? CONTATO_PADRAO.email_contato,
    intro_topo: d.intro_topo ?? CONTATO_PADRAO.intro_topo,
    aviso_sigilo: d.aviso_sigilo ?? CONTATO_PADRAO.aviso_sigilo,
    intro_focais: d.intro_focais ?? CONTATO_PADRAO.intro_focais,
    focais: Array.isArray(d.focais) ? (d.focais as Focal[]) : CONTATO_PADRAO.focais,
    contatos: Array.isArray(d.contatos) ? (d.contatos as ContatoPessoa[]) : CONTATO_PADRAO.contatos,
  }
}

export async function salvarContato(c: ContatoConfig): Promise<void> {
  const limpo: ContatoConfig = {
    email_contato: String(c.email_contato ?? '').trim(),
    intro_topo: String(c.intro_topo ?? '').trim(),
    aviso_sigilo: String(c.aviso_sigilo ?? '').trim(),
    intro_focais: String(c.intro_focais ?? '').trim(),
    focais: (c.focais ?? [])
      .map((f) => ({ assunto: String(f.assunto ?? '').trim(), responsaveis: String(f.responsaveis ?? '').trim() }))
      .filter((f) => f.assunto || f.responsaveis),
    contatos: (c.contatos ?? [])
      .map((p) => ({ nome: String(p.nome ?? '').trim(), cargo: String(p.cargo ?? '').trim(), email: String(p.email ?? '').trim(), telefone: String(p.telefone ?? '').trim() }))
      .filter((p) => p.nome || p.email || p.telefone),
  }
  await setDoc(doc(db(), 'config', 'contato'), { ...limpo, atualizado_em: new Date().toISOString() }, { merge: true })
  await registrarLog('contato_editar', `${limpo.focais.length} focais, ${limpo.contatos.length} contatos`)
}
