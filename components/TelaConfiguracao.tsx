import { Settings2 } from 'lucide-react'

/**
 * Mostrada quando o app ainda não tem as variáveis do Supabase.
 * É a primeira tela que aparece em uma instalação nova — por isso ela
 * explica o que fazer em vez de estourar um erro.
 */
export function TelaConfiguracao() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-12">
      <div className="cartao p-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-marca-clara text-marca">
          <Settings2 size={20} aria-hidden />
        </span>

        <h1 className="mt-4 text-xl font-semibold text-tinta">Falta conectar o banco de dados</h1>
        <p className="mt-2 text-sm leading-6 text-tinta-2">
          O Gente Cultura está instalado, mas ainda não sabe onde guardar os dados. Isso leva
          poucos minutos e é feito uma única vez.
        </p>

        <ol className="mt-5 space-y-4 text-sm leading-6 text-tinta-2">
          <li>
            <strong className="text-tinta">1. Crie um projeto no Supabase</strong>
            <br />
            Acesse <span className="font-mono text-xs">supabase.com</span>, crie uma conta
            gratuita e um projeto novo.
          </li>
          <li>
            <strong className="text-tinta">2. Rode o arquivo de estrutura</strong>
            <br />
            No menu <em>SQL Editor</em>, cole todo o conteúdo do arquivo{' '}
            <span className="font-mono text-xs">supabase/schema.sql</span> e clique em RUN.
          </li>
          <li>
            <strong className="text-tinta">3. Copie as duas chaves</strong>
            <br />
            Em <em>Project Settings → API</em>, copie a <em>Project URL</em> e a chave{' '}
            <em>service_role</em>.
          </li>
          <li>
            <strong className="text-tinta">4. Cole no arquivo .env.local</strong>
            <div className="mt-2 overflow-x-auto rounded-md border border-borda bg-superficie-2 p-3">
              <pre className="whitespace-pre font-mono text-xs leading-5 text-tinta-2">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...`}
              </pre>
            </div>
            <span className="mt-2 block text-xs text-tinta-3">
              Depois reinicie o servidor. Na Vercel, as mesmas duas linhas vão em{' '}
              <em>Settings → Environment Variables</em>.
            </span>
          </li>
        </ol>

        <p className="mt-6 border-t border-borda pt-4 text-xs leading-5 text-tinta-3">
          O passo a passo completo, com prints e a parte de publicação, está no arquivo{' '}
          <span className="font-mono">GUIA-DE-INSTALACAO.md</span>, na pasta do projeto.
        </p>
      </div>
    </main>
  )
}
