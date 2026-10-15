import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Settings2, Info } from 'lucide-react';
import { db } from '../firebase';
import { KPI } from '../components';
import { useData } from '../context/DataContext';
import { useAuthContext } from '../context/AuthContext';
import { useCampanhaRenovacao } from '../hooks/useCampanhaRenovacao';
import { montarLinhas, resumoPainel } from '../utils/renovacaoPainel';
import { CAMPANHA_PADRAO_2027 } from '../config/renovacao';
import TabelaRenovacao from '../components/renovacao/TabelaRenovacao';
import ConfigCampanhaModal from '../components/renovacao/ConfigCampanhaModal';

const ANO = CAMPANHA_PADRAO_2027.anoLetivo;
const CHAVE_SELECAO = `renovacao-selecao-${ANO}`;
const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : null);
const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_CAMPANHA = {
  rascunho: ['Em preparação', 'bg-slate-100 text-slate-700'],
  aberta: ['Campanha aberta', 'bg-emerald-50 text-emerald-800'],
  encerrada: ['Encerrada', 'bg-red-50 text-red-800'],
};

function lerSelecao() {
  try { return new Set(JSON.parse(localStorage.getItem(CHAVE_SELECAO) || '[]')); } catch { return new Set(); }
}

/**
 * Renovação de matrícula (etapa 2 do docs/rematricula/PLANO.md): configuração
 * da campanha e lista dos alunos com os valores. Ainda não envia nada.
 */
export default function Renovacao() {
  const { students = [], payments = [], dataLoading } = useData();
  const { role, user } = useAuthContext();
  const { campanha, carregando, erro, criar, salvar } = useCampanhaRenovacao(ANO);
  const [turmas, setTurmas] = useState([]);
  const [selecionados, setSelecionados] = useState(lerSelecao);
  const [configurando, setConfigurando] = useState(false);
  const [criando, setCriando] = useState(false);
  const ehAdmin = role === 'admin';
  const quem = user?.email || user?.uid || null;

  // Turmas brutas (com curso/book), lidas uma vez: o useTurmas também escuta
  // todas as aulas e descarta curso/book na normalização.
  useEffect(() => {
    getDocs(collection(db, 'turmas'))
      .then((s) => setTurmas(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch((e) => console.error('[renovacao] turmas:', e));
  }, []);

  useEffect(() => {
    try { localStorage.setItem(CHAVE_SELECAO, JSON.stringify([...selecionados])); } catch { /* sem armazenamento */ }
  }, [selecionados]);

  const linhas = useMemo(
    () => (campanha ? montarLinhas({ students, payments, turmas, campanha }) : []),
    [students, payments, turmas, campanha]
  );
  // Seleção de quem deixou de ser ativo não conta
  const selecaoValida = useMemo(() => new Set([...selecionados].filter((id) => linhas.some((l) => l.id === id))), [selecionados, linhas]);
  const resumo = useMemo(() => resumoPainel(linhas, selecaoValida), [linhas, selecaoValida]);

  if (carregando || dataLoading) {
    return <p className="p-6 text-su-sm text-content-muted">Carregando…</p>;
  }

  if (erro) {
    return (
      <div className="m-6 rounded-su-md border border-red-200 bg-red-50 p-4 text-su-sm text-red-800">
        Não foi possível carregar a campanha de renovação: {erro}
      </div>
    );
  }

  if (!campanha) {
    return (
      <div className="max-w-xl m-6 rounded-su-md border border-subtle bg-surface-card p-6 shadow-card space-y-3">
        <h2 className="font-display font-bold text-lg text-content-strong">Renovação de matrícula {ANO}</h2>
        {ehAdmin ? (
          <>
            <p className="text-su-sm text-content-body">
              A campanha ainda não foi criada. Ela começa com os valores combinados (reajuste de {CAMPANHA_PADRAO_2027.reajustePct}%,
              planos, descontos e vencimentos) e pode ser ajustada depois.
            </p>
            <button type="button" disabled={criando}
              onClick={async () => { setCriando(true); try { await criar(quem); } finally { setCriando(false); } }}
              className="px-4 py-2 rounded-su-sm bg-accent text-white text-su-sm font-semibold hover:bg-accent-hover disabled:opacity-50">
              {criando ? 'Criando…' : `Criar a campanha de ${ANO}`}
            </button>
          </>
        ) : (
          <p className="text-su-sm text-content-body">A campanha de renovação ainda não foi configurada pela direção.</p>
        )}
      </div>
    );
  }

  const [rotuloStatus, corStatus] = STATUS_CAMPANHA[campanha.status] || STATUS_CAMPANHA.rascunho;
  const periodo = campanha.abertura && campanha.encerramento
    ? `de ${dataBR(campanha.abertura)} a ${dataBR(campanha.encerramento)}`
    : 'datas ainda não definidas';

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <h2 className="font-display font-bold text-xl text-content-strong">Renovação de matrícula {ANO}</h2>
          <p className="text-su-sm text-content-muted">
            Campanha {periodo} · reajuste de {String(campanha.reajustePct).replace('.', ',')}% ·
            renovação no prazo {String(campanha.descontoRenovacaoNoPrazo?.pct ?? 0).replace('.', ',')}% (12x)
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-su-xs font-semibold ${corStatus}`}>{rotuloStatus}</span>
          {ehAdmin && (
            <button type="button" onClick={() => setConfigurando(true)}
              className="px-4 py-2 rounded-su-sm border border-strong bg-surface-card text-su-sm font-semibold text-content-body flex items-center gap-2 hover:bg-gr-50">
              <Settings2 size={16} aria-hidden="true" /> Configurar campanha
            </button>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-su-md border border-blue-200 bg-blue-50 p-3 text-su-sm text-blue-900">
        <Info size={18} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          Nesta etapa nada é enviado às famílias: selecione os alunos que vão renovar e confira os valores.
          A geração e o envio dos links por WhatsApp chegam na próxima etapa.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPI label="Alunos ativos" value={resumo.ativos} format="number" accent="blue" />
        <KPI label="Kids e Teens" value={resumo.kidsTeens} format="number" />
        <KPI label="Selecionados" value={resumo.selecionados} format="number" accent="green"
          sub={resumo.selecionados ? `${brl(resumo.receitaCheiaSelecionados)} no ano (valor cheio)` : undefined} />
        <KPI label={`Contrato vai até ${ANO}`} value={resumo.contratoInvadeAno} format="number" />
        <KPI label="Com parcela vencida" value={resumo.comPendencia} format="number" accent={resumo.comPendencia ? 'red' : undefined} />
        <KPI label="Revisar valor" value={resumo.revisarValor} format="number" accent={resumo.revisarValor ? 'yellow' : undefined} />
      </div>

      <TabelaRenovacao linhas={linhas} selecionados={selecaoValida} setSelecionados={setSelecionados} anoLetivo={ANO} />

      {configurando && (
        <ConfigCampanhaModal campanha={campanha} onSalvar={(dados) => salvar(dados, quem)} onClose={() => setConfigurando(false)} />
      )}
    </div>
  );
}
