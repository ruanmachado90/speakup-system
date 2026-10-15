import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { filtrarLinhas, contarPorGrupo, GRUPOS_FILTRO } from '../../utils/renovacaoPainel';

const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const mesAno = (ym) => (ym ? `${ym.slice(5, 7)}/${ym.slice(0, 4)}` : '');

const chipCls = (ativo) => `px-3 py-1.5 rounded-full text-su-xs font-semibold border transition-colors focus:outline-none focus-visible:shadow-ring-accent ${
  ativo ? 'bg-accent border-accent text-white' : 'bg-surface-card border-strong text-content-body hover:bg-gr-50'
}`;
const btnCls = 'px-3 py-1.5 rounded-su-sm border border-strong bg-surface-card text-su-xs font-semibold text-content-body hover:bg-gr-50 disabled:opacity-50 focus:outline-none focus-visible:shadow-ring-accent';

function Etiqueta({ tom, children, title }) {
  const tons = {
    alerta: 'bg-orange-50 text-orange-800 border-orange-200',
    aviso: 'bg-amber-50 text-amber-900 border-amber-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    neutro: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return <span title={title} className={`inline-block rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${tons[tom]}`}>{children}</span>;
}

/**
 * Lista de alunos ativos com seleção. Nada aqui grava: a seleção vira convite
 * só na etapa 3.
 */
export default function TabelaRenovacao({ linhas, selecionados, setSelecionados, anoLetivo }) {
  const [busca, setBusca] = useState('');
  const [grupo, setGrupo] = useState('todos');
  const [marcadores, setMarcadores] = useState({ soPendencia: false, soRevisar: false, soContrato: false, soSelecionados: false });

  const contagem = useMemo(() => contarPorGrupo(linhas), [linhas]);
  const visiveis = useMemo(
    () => filtrarLinhas(linhas, { busca, grupo, ...marcadores, selecionados }),
    [linhas, busca, grupo, marcadores, selecionados]
  );
  const todosVisiveisMarcados = visiveis.length > 0 && visiveis.every((l) => selecionados.has(l.id));

  const alterar = (ids, marcar) => setSelecionados((atual) => {
    const novo = new Set(atual);
    ids.forEach((id) => (marcar ? novo.add(id) : novo.delete(id)));
    return novo;
  });
  const alternarMarcador = (k) => setMarcadores((m) => ({ ...m, [k]: !m[k] }));

  return (
    <div className="bg-surface-card border border-subtle rounded-su-md shadow-card">
      <div className="p-4 space-y-3 border-b border-subtle">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" aria-hidden="true" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar aluno, responsável, curso ou turma"
            aria-label="Buscar"
            className="w-full pl-9 pr-3 py-2 border border-strong rounded-su-sm bg-surface-card text-su-sm text-content-body focus:outline-none focus-visible:shadow-ring-accent"
          />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Curso">
          {GRUPOS_FILTRO.filter((g) => g.id === 'todos' || contagem[g.id]).map((g) => (
            <button key={g.id} type="button" aria-pressed={grupo === g.id} onClick={() => setGrupo(g.id)} className={chipCls(grupo === g.id)}>
              {g.rotulo} <span className="opacity-75 tabular-nums">{contagem[g.id] || 0}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Marcadores">
          {[
            ['soPendencia', 'Com parcela vencida'],
            ['soRevisar', 'Revisar valor'],
            ['soContrato', `Contrato vai até ${anoLetivo}`],
            ['soSelecionados', 'Só os selecionados'],
          ].map(([k, rotulo]) => (
            <button key={k} type="button" aria-pressed={marcadores[k]} onClick={() => alternarMarcador(k)} className={chipCls(marcadores[k])}>{rotulo}</button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-su-sm bg-blue-50 border border-blue-100 px-3 py-2">
          <span className="text-su-sm text-blue-900"><strong className="tabular-nums">{selecionados.size}</strong> selecionado(s)</span>
          <button type="button" className={btnCls} onClick={() => alterar(linhas.filter((l) => l.sugerido).map((l) => l.id), true)}>Selecionar Kids e Teens</button>
          <button type="button" className={btnCls} disabled={!visiveis.length} onClick={() => alterar(visiveis.map((l) => l.id), true)}>Selecionar os {visiveis.length} da lista</button>
          <button type="button" className={btnCls} disabled={!selecionados.size} onClick={() => setSelecionados(new Set())}>Limpar seleção</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-su-sm">
          <thead className="bg-surface-sunken text-left text-su-xs uppercase tracking-wide text-content-muted">
            <tr>
              <th className="w-10 px-4 py-2.5">
                <input type="checkbox" className="accent-accent" aria-label="Selecionar todos da lista" checked={todosVisiveisMarcados}
                  onChange={(e) => alterar(visiveis.map((l) => l.id), e.target.checked)} />
              </th>
              <th className="px-3 py-2.5 font-semibold">Aluno e responsável</th>
              <th className="px-3 py-2.5 font-semibold">Curso e turma</th>
              <th className="px-3 py-2.5 font-semibold">Mensalidade {anoLetivo - 1} → {anoLetivo}</th>
              <th className="px-3 py-2.5 font-semibold">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {visiveis.map((l) => (
              <tr key={l.id} className={selecionados.has(l.id) ? 'bg-blue-50/50' : 'hover:bg-gr-50'}>
                <td className="px-4 py-2.5 align-top">
                  <input type="checkbox" className="accent-accent mt-0.5" aria-label={`Selecionar ${l.nome}`} checked={selecionados.has(l.id)}
                    onChange={(e) => alterar([l.id], e.target.checked)} />
                </td>
                <td className="px-3 py-2.5 align-top">
                  <p className="font-semibold text-content-strong">{l.nome}</p>
                  <p className="text-su-xs text-content-muted">
                    {l.responsavel || 'Sem responsável'} · {l.telefone || <span className="text-red-700">sem telefone</span>}
                  </p>
                </td>
                <td className="px-3 py-2.5 align-top">
                  <p className="text-content-body">{l.curso || <span className="text-content-muted">Sem curso</span>}</p>
                  {l.turmas.length > 0 && <p className="text-su-xs text-content-muted">{l.turmas.join(' · ')}</p>}
                </td>
                <td className="px-3 py-2.5 align-top tabular-nums">
                  <p className="text-content-body">
                    {brl(l.mensalidadeAtual)} <span className="text-content-muted" aria-hidden="true">→</span> <strong className="text-content-strong">{brl(l.mensalidadeNova)}</strong>
                  </p>
                  {l.parcela12NoPrazo !== l.mensalidadeNova && (
                    <p className="text-su-xs text-content-muted">12x renovando no prazo: {brl(l.parcela12NoPrazo)}</p>
                  )}
                </td>
                <td className="px-3 py-2.5 align-top">
                  <div className="flex flex-wrap gap-1">
                    {l.pendencia.quantidade > 0 && (
                      <Etiqueta tom="alerta">{l.pendencia.quantidade} vencida(s) · {brl(l.pendencia.valor)}</Etiqueta>
                    )}
                    {l.contratoInvadeAno && (
                      <Etiqueta tom="info" title="O contrato atual termina em dezembro; estas parcelas são canceladas quando a renovação for efetivada">
                        Contrato até {mesAno(l.contratoAte)} · {l.antigas.cancelar} a cancelar
                      </Etiqueta>
                    )}
                    {l.antigas.bloqueiam > 0 && (
                      <Etiqueta tom="alerta" title={`Parcela de ${anoLetivo} já paga (inteira ou em parte): a secretaria decide antes de efetivar`}>
                        {l.antigas.bloqueiam} parcela(s) de {anoLetivo} já paga(s)
                      </Etiqueta>
                    )}
                    {l.revisarValor && <Etiqueta tom="aviso">Revisar valor</Etiqueta>}
                    {l.irmaos.length > 0 && <Etiqueta tom="neutro" title={`Irmão(s): ${l.irmaos.join(', ')}`}>Irmão: {l.irmaos.map((n) => n.split(' ')[0]).join(', ')}</Etiqueta>}
                  </div>
                </td>
              </tr>
            ))}
            {!visiveis.length && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-content-muted">Nenhum aluno neste filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
