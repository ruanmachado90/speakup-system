import { useMemo, useState } from 'react';
import { Check, ChevronDown, Copy, ListChecks, Info } from 'lucide-react';
import { Card } from '../ui/Card';
import { Etiqueta } from './TabelaRenovacao';
import { SITUACAO_CONVITE } from '../../utils/renovacaoEnvio';
import {
  variaveisDaCampanha, descontosDaCampanha, etapaAtual, partesDoTexto, textoParaCopiar, modeloConvite, progressoChecklist,
} from '../../utils/renovacaoGuia';
import {
  ETAPAS, CHECKLIST_PREPARACAO, PAPEIS, AVISO_PROFESSORES, SITUACOES, MENSAGENS, DUVIDAS, SIGNIFICADO_STATUS,
} from '../../content/renovacaoGuia';

const dataHora = (ms) => new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const btnCls = 'px-3 py-1.5 rounded-su-sm border border-strong bg-surface-card text-su-xs font-semibold text-content-body flex items-center gap-1.5 hover:bg-gr-50 focus:outline-none focus-visible:shadow-ring-accent';

const ADefinir = () => (
  <span className="inline-block rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900 align-baseline">A definir</span>
);

/** Texto do guia com negrito, valores da campanha e campos do aluno destacados. */
function Texto({ texto, vars }) {
  return partesDoTexto(texto, vars).map((p, i) => {
    if ('texto' in p) return <span key={i}>{p.texto}</span>;
    if ('negrito' in p) return <strong key={i} className="font-semibold text-content-strong"><Texto texto={p.negrito} vars={vars} /></strong>;
    if ('variavel' in p) return p.valor == null ? <ADefinir key={i} /> : <span key={i} className="font-semibold text-content-strong">{p.valor}</span>;
    return <span key={i} className="rounded bg-blue-50 px-1 font-mono text-[0.85em] text-blue-800">{`{${p.campoAluno}}`}</span>;
  });
}

function BotaoCopiar({ texto, rotulo = 'Copiar' }) {
  const [ok, setOk] = useState(false);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 2000); } catch { /* sem área de transferência */ }
  };
  return (
    <button type="button" onClick={copiar} className={btnCls}>
      {ok ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />} {ok ? 'Copiado' : rotulo}
    </button>
  );
}

function Secao({ titulo, sub, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-display font-bold text-base text-content-strong">{titulo}</h3>
        {sub && <p className="text-su-sm text-content-muted">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

/** Item de accordion (details nativo: teclado e leitor de tela de graça). */
function Sanfona({ titulo, aberto = false, extra, children }) {
  return (
    <details open={aberto} className="group rounded-su-md border border-subtle bg-surface-card shadow-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-su-sm font-semibold text-content-strong [&::-webkit-details-marker]:hidden">
        <span className="flex-1">{titulo}</span>
        {extra}
        <ChevronDown size={16} aria-hidden="true" className="text-content-muted transition-transform duration-base group-open:rotate-180" />
      </summary>
      <div className="border-t border-subtle px-4 py-3 text-su-sm text-content-body">{children}</div>
    </details>
  );
}

function ItemResumo({ rotulo, children }) {
  return (
    <div>
      <dt className="text-su-xs uppercase tracking-wide text-content-muted">{rotulo}</dt>
      <dd className="mt-0.5 text-su-sm text-content-strong">{children}</dd>
    </div>
  );
}

/**
 * Aba "Como funciona" da renovação: guia da campanha para a equipe
 * (docs/rematricula/PLANO_COMO_FUNCIONA.md). Texto em content/renovacaoGuia.js;
 * valores sempre da campanha salva.
 */
export default function ComoFunciona({ campanha, onMarcarItem, quem }) {
  const vars = useMemo(() => variaveisDaCampanha(campanha), [campanha]);
  const descontos = useMemo(() => descontosDaCampanha(campanha), [campanha]);
  const atual = etapaAtual(campanha);
  const idxAtual = ETAPAS.findIndex((e) => e.id === atual);
  const checklist = campanha.guia?.checklist || {};
  const progresso = progressoChecklist(CHECKLIST_PREPARACAO, checklist);
  const [salvando, setSalvando] = useState(null);
  const [erroChecklist, setErroChecklist] = useState(null);

  const alternar = async (item) => {
    setSalvando(item.id);
    setErroChecklist(null);
    try { await onMarcarItem(item.id, !checklist[item.id]?.feito, quem); } catch (e) { setErroChecklist(e.message); } finally { setSalvando(null); }
  };

  const valor = (v) => (v == null ? <ADefinir /> : v);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* 1. Resumo */}
      <Card padding="none" accent="blue">
        <div className="flex flex-wrap items-center gap-2 border-b border-subtle px-4 py-3 sm:px-6">
          <h3 className="font-display font-bold text-base text-content-strong">Resumo da campanha {campanha.anoLetivo}</h3>
          <span className="ml-auto rounded-full bg-accent px-3 py-1 text-su-xs font-semibold text-white">
            Etapa atual: {ETAPAS[idxAtual].titulo}
          </span>
        </div>
        <dl className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          <ItemResumo rotulo="Abertura">{valor(vars.abertura)}</ItemResumo>
          <ItemResumo rotulo="Encerramento">{valor(vars.encerramento)}</ItemResumo>
          <ItemResumo rotulo="Reajuste">{valor(vars.reajuste)}</ItemResumo>
          <ItemResumo rotulo="Planos">{valor(vars.planos)}</ItemResumo>
          <ItemResumo rotulo="Formas de pagamento">{valor(vars.formas)}</ItemResumo>
          <ItemResumo rotulo="Dias de vencimento">{valor(vars.diasVencimento)}</ItemResumo>
          <div className="sm:col-span-2 lg:col-span-3">
            <ItemResumo rotulo="Descontos (não se somam: vale o maior)">
              {descontos.length ? (
                <ul className="mt-1 space-y-1">
                  {descontos.map((d) => <li key={d} className="flex gap-2"><span className="text-content-muted" aria-hidden="true">•</span>{d}</li>)}
                </ul>
              ) : <ADefinir />}
            </ItemResumo>
          </div>
        </dl>
        <ol className="flex border-t border-subtle" aria-label="Etapas da campanha">
          {ETAPAS.map((e, i) => (
            <li key={e.id} aria-current={i === idxAtual ? 'step' : undefined}
              className={`flex-1 px-1 py-2 text-center text-[11px] font-semibold leading-tight sm:text-su-xs ${
                i === idxAtual ? 'bg-blue-50 text-blue-800' : i < idxAtual ? 'text-content-muted' : 'text-content-body'
              } ${i > 0 ? 'border-l border-subtle' : ''}`}>
              {i < idxAtual && <Check size={12} className="mr-0.5 inline" aria-hidden="true" />}{e.titulo}
            </li>
          ))}
        </ol>
      </Card>

      {/* 2. Checklist da preparação */}
      <Secao titulo="Checklist da preparação" sub="Fica salvo na campanha: todos da equipe veem o mesmo progresso.">
        <Card padding="none">
          <div className="flex items-center gap-3 border-b border-subtle px-4 py-3">
            <ListChecks size={18} className="text-content-muted" aria-hidden="true" />
            <span className="text-su-sm font-semibold text-content-strong">{progresso.feitos} de {progresso.total} feitos</span>
            <div className="ml-auto h-2 w-32 overflow-hidden rounded-full bg-gr-100" aria-hidden="true">
              <div className="h-full rounded-full bg-success transition-all duration-base" style={{ width: `${(progresso.feitos / progresso.total) * 100}%` }} />
            </div>
          </div>
          <ul className="divide-y divide-subtle">
            {CHECKLIST_PREPARACAO.map((item) => {
              const marca = checklist[item.id];
              return (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-gr-50">
                    <input type="checkbox" checked={!!marca?.feito} disabled={salvando === item.id} onChange={() => alternar(item)}
                      className="mt-0.5 h-4 w-4 flex-shrink-0 accent-accent" />
                    <span className="flex-1 text-su-sm">
                      <span className={marca?.feito ? 'text-content-muted line-through' : 'text-content-body'}><Texto texto={item.texto} vars={vars} /></span>
                      <span className="mt-0.5 block text-su-xs text-content-muted">
                        {item.quem}{marca?.feito && marca.em ? ` · feito${marca.por ? ` por ${marca.por}` : ''} em ${dataHora(marca.em)}` : ''}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {erroChecklist && <p className="border-t border-subtle px-4 py-2 text-su-xs text-red-700">Não foi possível salvar: {erroChecklist}</p>}
        </Card>
      </Secao>

      {/* 3. Linha do tempo */}
      <Secao titulo="Etapas da campanha" sub="A etapa de hoje já vem aberta.">
        <div className="space-y-2">
          {ETAPAS.map((e, i) => (
            <Sanfona key={e.id} aberto={i === idxAtual}
              titulo={<><span className="text-content-muted">{i + 1}.</span> {e.titulo} <span className="font-normal text-content-muted">· <Texto texto={e.quando} vars={vars} /></span></>}
              extra={i === idxAtual ? <Etiqueta tom="info">Agora</Etiqueta> : i < idxAtual ? <Etiqueta tom="neutro">Concluída</Etiqueta> : null}>
              <div className="space-y-4">
                {e.grupos.map((g) => (
                  <div key={g.quem}>
                    <p className="mb-1.5 text-su-xs font-semibold uppercase tracking-wide text-content-muted">{g.quem}</p>
                    <ul className="space-y-1.5">
                      {g.tarefas.map((t) => (
                        <li key={t} className="flex gap-2"><span className="text-content-muted" aria-hidden="true">•</span><span><Texto texto={t} vars={vars} /></span></li>
                      ))}
                    </ul>
                  </div>
                ))}
                {e.id === 'preparacao' && (
                  <p className="text-su-xs text-content-muted">Checklist: {progresso.feitos} de {progresso.total} feitos.</p>
                )}
              </div>
            </Sanfona>
          ))}
        </div>
      </Secao>

      {/* 4. Quem faz o quê */}
      <Secao titulo="Quem faz o quê">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {PAPEIS.map((p, i) => (
            <Card key={p.quem} padding="sm" accent={['blue', 'pink', 'orange'][i]}>
              <p className="font-semibold text-su-sm text-content-strong">{p.quem}</p>
              <p className="mt-1 text-su-sm text-content-body">{p.texto}</p>
            </Card>
          ))}
        </div>
        <div className="flex items-start gap-3 rounded-su-md border border-blue-200 bg-blue-50 p-3 text-su-sm text-blue-900">
          <Info size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p>{AVISO_PROFESSORES}</p>
        </div>
      </Secao>

      {/* 5. Situações especiais */}
      <Secao titulo="Situações especiais">
        <div className="space-y-2">
          {SITUACOES.map((s) => (
            <Sanfona key={s.titulo} titulo={s.titulo}><p><Texto texto={s.texto} vars={vars} /></p></Sanfona>
          ))}
        </div>
      </Secao>

      {/* 6. Mensagens prontas */}
      <Secao titulo="Mensagens prontas"
        sub={<>Os dados da campanha já vêm preenchidos. Complete os campos em azul, como <span className="rounded bg-blue-50 px-1 font-mono text-[0.85em] text-blue-800">{'{aluno}'}</span>, antes de enviar.</>}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {MENSAGENS.map((m) => {
            const texto = m.modelo === 'convite' ? modeloConvite(campanha) : m.texto;
            return (
              <Card key={m.id} padding="none">
                <div className="flex items-center gap-2 border-b border-subtle px-4 py-2.5">
                  <p className="flex-1 text-su-sm font-semibold text-content-strong">{m.titulo}</p>
                  <BotaoCopiar texto={textoParaCopiar(texto, vars)} />
                </div>
                <p className="whitespace-pre-wrap px-4 py-3 text-su-sm text-content-body"><Texto texto={texto} vars={vars} /></p>
                {m.nota && <p className="border-t border-subtle px-4 py-2 text-su-xs text-content-muted">{m.nota}</p>}
              </Card>
            );
          })}
        </div>
      </Secao>

      {/* 7. Dúvidas frequentes */}
      <Secao titulo="Respostas para dúvidas frequentes">
        <div className="space-y-2">
          {DUVIDAS.map((d) => (
            <Sanfona key={d.pergunta} titulo={d.pergunta}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <p className="flex-1"><Texto texto={d.resposta} vars={vars} /></p>
                <BotaoCopiar texto={textoParaCopiar(d.resposta, vars)} />
              </div>
            </Sanfona>
          ))}
        </div>
      </Secao>

      {/* 8. Status */}
      <Secao titulo="O que significa cada situação do convite" sub="Os mesmos nomes da coluna Convite do painel.">
        <Card padding="none">
          <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,1.3fr)] gap-4 border-b border-subtle px-4 py-2 text-su-xs font-semibold uppercase tracking-wide text-content-muted md:grid">
            <span>Situação</span><span>Significado</span><span>O que a secretaria faz</span>
          </div>
          <ul className="divide-y divide-subtle">
            {Object.entries(SIGNIFICADO_STATUS).map(([status, [significado, acao]]) => {
              const [rotulo, tom] = SITUACAO_CONVITE[status] || [status, 'neutro'];
              return (
                <li key={status} className="grid grid-cols-1 gap-1 px-4 py-3 text-su-sm md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,1.3fr)] md:gap-4">
                  <span><Etiqueta tom={tom}>{rotulo}</Etiqueta></span>
                  <span className="text-content-body"><Texto texto={significado} vars={vars} /></span>
                  <span className="text-content-muted md:text-content-body"><span className="md:hidden font-semibold">O que fazer: </span><Texto texto={acao} vars={vars} /></span>
                </li>
              );
            })}
          </ul>
        </Card>
      </Secao>
    </div>
  );
}
