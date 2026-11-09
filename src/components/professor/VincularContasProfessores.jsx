import { useState } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { Link2 } from 'lucide-react';
import { db } from '../../firebase';
import { Dialogo } from '../agenda/AgendaDialogs';
import { botaoPrimario, botaoSecundario } from '../agenda/estiloAgenda';
import { paresDeVinculo, paresAGravar } from '../../utils/vincularProfessores';

const ROTULO = {
  vinculado: ['Já vinculado', 'text-success-fg bg-success-bg'],
  novo: ['Vai vincular', 'text-accent bg-blue-50'],
  trocar: ['Vai corrigir', 'text-warning-fg bg-warning-bg'],
  'sem-cadastro': ['Sem cadastro com esse nome', 'text-danger-fg bg-danger-bg'],
  ambiguo: ['2+ cadastros com esse nome', 'text-danger-fg bg-danger-bg'],
};

/**
 * Botão (só admin) que liga a conta de login de cada professor ao cadastro
 * dele: grava users/{uid}.professorId. As regras de notas e provas usam esse
 * vínculo para saber se a turma é do professor. Rodar de novo depois de
 * cadastrar um professor novo.
 */
export default function VincularContasProfessores({ contas, diretorio }) {
  const [aberto, setAberto] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [resultado, setResultado] = useState('');
  const [erro, setErro] = useState('');

  const pares = paresDeVinculo(contas, diretorio);
  const aGravar = paresAGravar(pares);

  const gravar = async () => {
    setGravando(true);
    setErro('');
    try {
      const lote = writeBatch(db);
      aGravar.forEach((p) => lote.update(doc(db, 'users', p.uid), { professorId: p.professorId }));
      await lote.commit();
      setResultado(`${aGravar.length} ${aGravar.length === 1 ? 'conta vinculada' : 'contas vinculadas'}.`);
    } catch (err) {
      console.error('[VincularContas] Erro ao gravar:', err);
      setErro(err.code === 'permission-denied' ? 'Só o admin pode vincular contas.' : 'Não foi possível gravar. Tente de novo.');
    } finally {
      setGravando(false);
    }
  };

  const fechar = () => { setAberto(false); setResultado(''); setErro(''); };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        title="Liga a conta de login de cada professor ao cadastro dele. Necessário para a regra de notas (cada professor só lança nota nas turmas dele)."
        className="px-3 py-1.5 text-xs border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
      >
        <Link2 size={13} aria-hidden="true" /> Vincular contas
      </button>
      {aberto && (
        <Dialogo
          titulo="Vincular contas dos professores"
          subtitulo="Conta de login ↔ cadastro do professor (pelo nome, sem acento)"
          onClose={fechar}
          rodape={resultado ? (
            <button type="button" onClick={fechar} className={botaoPrimario}>Fechar</button>
          ) : (
            <>
              <button type="button" onClick={fechar} className={botaoSecundario}>Cancelar</button>
              <button type="button" onClick={gravar} disabled={gravando || aGravar.length === 0} className={botaoPrimario}>
                {gravando ? 'Gravando…' : aGravar.length ? `Gravar ${aGravar.length} ${aGravar.length === 1 ? 'vínculo' : 'vínculos'}` : 'Nada a gravar'}
              </button>
            </>
          )}
        >
          <p className="text-su-sm text-content-body mb-3">
            Confira os pares. Com o vínculo, cada professor só lança nota e prova nas turmas dele; admin e secretaria continuam com acesso a todas.
          </p>
          <ul className="divide-y divide-subtle border border-subtle rounded-su-sm">
            {pares.map((p) => {
              const [rotulo, cor] = ROTULO[p.situacao];
              return (
                <li key={p.uid} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-su-sm">
                  <span className="text-content-strong font-semibold">
                    {p.contaNome || '(conta sem nome)'}
                    {p.cadastroNome && p.cadastroNome !== p.contaNome && <span className="font-normal text-content-muted"> → {p.cadastroNome}</span>}
                  </span>
                  <span className={`px-2 py-0.5 rounded-pill text-su-xs font-semibold ${cor}`}>{rotulo}</span>
                </li>
              );
            })}
          </ul>
          {pares.some((p) => p.situacao === 'sem-cadastro' || p.situacao === 'ambiguo') && (
            <p className="mt-3 text-su-xs text-content-muted">Contas em vermelho ficam sem vínculo: esse professor não vai conseguir lançar notas até o nome da conta e o do cadastro baterem.</p>
          )}
          {resultado && <p className="mt-3 text-su-sm font-semibold text-success-fg" role="status">{resultado}</p>}
          {erro && <p className="mt-3 text-su-sm text-danger-fg" role="alert">{erro}</p>}
        </Dialogo>
      )}
    </>
  );
}
