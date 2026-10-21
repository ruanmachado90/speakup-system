import { useMemo, useState } from 'react';
import { Search, Link2, Pencil, Users, UserX, Undo2 } from 'lucide-react';
import { filtrarLinhas, contarPorGrupo, GRUPOS_FILTRO } from '../../utils/renovacaoPainel';
import { SITUACAO_CONVITE, podeAjustar } from '../../utils/renovacaoEnvio';
import { STATUS } from '../../utils/renovacao';

const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const mesAno = (ym) => (ym ? `${ym.slice(5, 7)}/${ym.slice(0, 4)}` : '');

const chipCls = (ativo) => `px-3 py-1.5 rounded-full text-su-xs font-semibold border transition-colors focus:outline-none focus-visible:shadow-ring-accent ${
  ativo ? 'bg-accent border-accent text-white' : 'bg-surface-card border-strong text-content-body hover:bg-gr-50'
}`;
const btnCls = 'px-3 py-1.5 rounded-su-sm border border-strong bg-surface-card text-su-xs font-semibold text-content-body hover:bg-gr-50 disabled:opacity-50 focus:outline-none focus-visible:shadow-ring-accent';

export function Etiqueta({ tom, children, title }) {
  const tons = {
    alerta: 'bg-orange-50 text-orange-800 border-orange-200',
    aviso: 'bg-amber-50 text-amber-900 border-amber-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    neutro: 'bg-slate-100 text-slate-700 border-slate-200',
    sucesso: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };
  return <span title={title} className={`inline-block rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${tons[tom]}`}>{children}</span>;
}

const acaoCls = 'p-1.5 rounded-su-sm border border-subtle text-content-body hover:bg-gr-50 disabled:opacity-40 focus:outline-none focus-visible:shadow-ring-accent';

function AcaoIcone({ rotulo, onClick, children, pressionado }) {
  return (
    <button type="button" title={rotulo} aria-label={rotulo} aria-pressed={pressionado} onClick={onClick}
      className={`${acaoCls} ${pressionado ? 'bg-blue-50 border-blue-200 text-blue-800' : ''}`}>{children}</button>
  );
}

/** Situação do convite e as ações da linha (copiar, valor, irmão, não renovará). */
function CelulaConvite({ l, onAcao }) {
  const c = l.convite;
  if (!c) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-su-xs text-content-muted">Sem convite</span>
        <AcaoIcone rotulo="Não renovará" onClick={() => onAcao('naoRenovara', l)}><UserX size={14} aria-hidden="true" /></AcaoIcone>
      </div>
    );
  }
  const [rotulo, tom] = SITUACAO_CONVITE[c.status] || [c.status, 'neutro'];
  const ajustavel = podeAjustar(c);
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1">
        <Etiqueta tom={tom} title={l.nota ? `Motivo: ${l.nota.motivo}${l.nota.observacao ? ` (${l.nota.observacao})` : ''}` : undefined}>{rotulo}</Etiqueta>
        {c.enviosQtd > 1 && <span className="text-[11px] text-content-muted tabular-nums">{c.enviosQtd} envios</span>}
      </div>
      <div className="flex flex-wrap gap-1">
        {c.status !== STATUS.NAO_RENOVARA && (
          <AcaoIcone rotulo="Copiar link" onClick={() => onAcao('copiar', l)}><Link2 size={14} aria-hidden="true" /></AcaoIcone>
        )}
        {ajustavel && (
          <>
            <AcaoIcone rotulo="Ajustar valor" onClick={() => onAcao('valor', l)}><Pencil size={14} aria-hidden="true" /></AcaoIcone>
            <AcaoIcone rotulo={c.descontoIrmao ? 'Tirar desconto de irmão' : 'Dar desconto de irmão'} pressionado={Boolean(c.descontoIrmao)}
              onClick={() => onAcao('irmao', l)}><Users size={14} aria-hidden="true" /></AcaoIcone>
          </>
        )}
        {c.status === STATUS.NAO_RENOVARA ? (
          <AcaoIcone rotulo="Desfazer não renovará" onClick={() => onAcao('desfazer', l)}><Undo2 size={14} aria-hidden="true" /></AcaoIcone>
        ) : ajustavel && (
          <AcaoIcone rotulo="Não renovará" onClick={() => onAcao('naoRenovara', l)}><UserX size={14} aria-hidden="true" /></AcaoIcone>
        )}
      </div>
    </div>
  );
}

/**
 * Lista de alunos ativos com seleção e a situação do convite de cada um.
 * Quem grava é a página (onAcao); aqui só exibe e repassa.
 */
export default function TabelaRenovacao({ linhas, selecionados, setSelecionados, anoLetivo, acoesSelecao, onAcao }) {
  const [busca, setBusca] = useState('');
  const [grupo, setGrupo] = useState('todos');
  const [marcadores, setMarcadores] = useState({ soPendencia: false, soRevisar: false, soContrato: false, soSemConvite: false, soSelecionados: false });

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
            ['soSemConvite', 'Sem convite'],
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
          {acoesSelecao && <div className="flex flex-wrap gap-2 sm:ml-auto">{acoesSelecao}</div>}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-su-sm">
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
              <th className="px-3 py-2.5 font-semibold">Convite</th>
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
                    {brl(l.mensalidadeAtual)} <span className="text-content-muted" aria-hidden="true">→</span> <strong className="text-content-strong">{brl(l.convite?.mensalidadeNovaCentavos ?? l.mensalidadeNova)}</strong>
                  </p>
                  {l.convite && l.convite.mensalidadeBaseCentavos !== l.mensalidadeAtual ? (
                    <p className="text-su-xs text-content-muted">Base ajustada para {brl(l.convite.mensalidadeBaseCentavos)}</p>
                  ) : l.parcela12NoPrazo !== l.mensalidadeNova && (
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
                    {(l.convite ? l.convite.revisarValor : l.revisarValor) && (
                      <Etiqueta tom="aviso" title="Confira o valor (lápis na coluna Convite) antes de enviar">Revisar valor</Etiqueta>
                    )}
                    {l.irmaos.length > 0 && <Etiqueta tom="neutro" title={`Irmão(s): ${l.irmaos.join(', ')}`}>Irmão: {l.irmaos.map((n) => n.split(' ')[0]).join(', ')}</Etiqueta>}
                    {l.convite?.descontoIrmao && <Etiqueta tom="sucesso">Desconto de irmão</Etiqueta>}
                  </div>
                </td>
                <td className="px-3 py-2.5 align-top"><CelulaConvite l={l} onAcao={onAcao} /></td>
              </tr>
            ))}
            {!visiveis.length && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-content-muted">Nenhum aluno neste filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
