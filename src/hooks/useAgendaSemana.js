import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection, query, where, onSnapshot, getDocs, addDoc, updateDoc, deleteDoc, doc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { normalizeNome } from '../utils/normalizeNome';
import { normalizarProfessoresDasTurmas } from '../utils/professores';
import { buildProfessorSlug } from '../utils/turmas';
import { textoRecadoEvento } from '../utils/agendaProfessor';

// Escuta em tempo real os documentos de `colecao` com `data` entre inicio e fim
// (texto "AAAA-MM-DD" ordena como data). Só a faixa pedida — a coleção de
// aulas inteira passa de mil documentos.
function usePeriodo(colecao, inicioISO, fimISO) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const chave = `${inicioISO}|${fimISO}`;
  const [chaveAnterior, setChaveAnterior] = useState(chave);
  if (chaveAnterior !== chave) {
    setChaveAnterior(chave);
    setLoading(true);
  }

  useEffect(() => {
    const q = query(collection(db, colecao), where('data', '>=', inicioISO), where('data', '<=', fimISO));
    return onSnapshot(
      q,
      (snap) => {
        setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error(`[useAgendaSemana] Erro ao carregar ${colecao}:`, err);
        setError(err.message);
        setLoading(false);
      }
    );
  }, [colecao, inicioISO, fimISO]);

  return { docs, loading, error };
}

/**
 * Turmas com o nome do professor já canônico. Mais leve que useTurmas, que
 * também escuta a coleção `aulas` inteira.
 */
export function useTurmasDaEscola(professores) {
  const [brutas, setBrutas] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => onSnapshot(
    collection(db, 'turmas'),
    (snap) => { setBrutas(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
    (err) => { console.error('[useTurmasDaEscola] Erro ao carregar turmas:', err); setLoading(false); }
  ), []);
  const turmas = useMemo(() => normalizarProfessoresDasTurmas(brutas, professores), [brutas, professores]);
  return { turmas, loading };
}

/** Minuto do dia (0–1439), atualizado a cada minuto — para a linha do "agora". */
export function useAgoraMin() {
  const ler = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const [agora, setAgora] = useState(ler);
  useEffect(() => {
    const t = setInterval(() => setAgora(ler()), 60 * 1000);
    return () => clearInterval(t);
  }, []);
  return agora;
}

/** Aulas registradas, aulas avulsas e compromissos (agendaEventos) entre duas datas. */
export function useAgendaSemana(inicioISO, fimISO) {
  const aulas = usePeriodo('aulas', inicioISO, fimISO);
  const avulsas = usePeriodo('aulasAvulsas', inicioISO, fimISO);
  const eventos = usePeriodo('agendaEventos', inicioISO, fimISO);
  return {
    aulas: aulas.docs,
    avulsas: avulsas.docs,
    eventos: eventos.docs,
    loading: aulas.loading || avulsas.loading || eventos.loading,
    // Avulsa é extra: se a leitura falhar (regra ainda não publicada), a agenda segue.
    error: aulas.error || eventos.error,
  };
}

/** Grava uma aula avulsa já montada (utils/aulasAvulsas → montarAulaAvulsa). */
export const registrarAulaAvulsa = (dados) => addDoc(collection(db, 'aulasAvulsas'), dados);

export const excluirAulaAvulsa = (id) => deleteDoc(doc(db, 'aulasAvulsas', id));

// Conta de login do professor (users/{uid}): o painel dele lê os recados pelo
// slug da URL, e as regras deixam ele marcar como lido quando `professor`
// bate com o nome da conta. Sem conta, cai no slug gerado pelo nome, como em
// Recados.jsx.
async function destinatarioDoRecado(professor) {
  const chave = normalizeNome(professor.nome);
  let conta = null;
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'professor')));
    conta = snap.docs.map((d) => d.data()).find((u) =>
      (u.nomeKey || normalizeNome(u.nome)) === chave ||
      (!!professor.email && !!u.email && u.email.toLowerCase() === professor.email.toLowerCase())
    ) || null;
  } catch (err) {
    console.warn('[useAgendaSemana] Sem acesso às contas de professor; usando o slug pelo nome.', err);
  }
  const nome = conta?.nome || professor.nome;
  return { professor: nome, professorKey: normalizeNome(nome), professorSlug: conta?.slug || buildProfessorSlug(professor.nome) };
}

async function enviarRecado(professor, texto, extras = {}) {
  const destino = await destinatarioDoRecado(professor);
  await addDoc(collection(db, 'recados'), {
    ...destino,
    tipo: 'agenda',
    texto,
    lido: false,
    createdAt: Date.now(),
    origem: 'admin',
    ...extras,
  });
}

const avisarProfessor = (professor, evento, acao) =>
  enviarRecado(professor, textoRecadoEvento(evento, acao), { agendaEventoId: evento.id || null });

/**
 * Criar / alterar / cancelar compromisso na agenda de um professor.
 * `avisar` manda um recado (aparece em Avisos no painel do professor).
 * O recado é um extra: se falhar, o compromisso continua salvo e quem chamou
 * recebe `avisoFalhou` para dizer isso na tela.
 */
export function useEventosAgenda(professor, usuario) {
  const salvarEvento = useCallback(async (dados, { id = null, avisar = true } = {}) => {
    const payload = {
      titulo: dados.titulo.trim(),
      tipo: dados.tipo,
      data: dados.data,
      inicio: dados.inicio,
      fim: dados.fim,
      link: (dados.link || '').trim(),
      aluno: (dados.aluno || '').trim(),
      observacoes: (dados.observacoes || '').trim(),
      professorId: professor.id,
      professorNome: professor.nome,
      atualizadoEm: Date.now(),
    };
    let eventoId = id;
    if (id) {
      await updateDoc(doc(db, 'agendaEventos', id), payload);
    } else {
      const ref = await addDoc(collection(db, 'agendaEventos'), {
        ...payload,
        criadoEm: Date.now(),
        criadoPor: usuario?.email || usuario?.uid || null,
      });
      eventoId = ref.id;
    }
    if (!avisar) return { id: eventoId, avisoFalhou: false };
    try {
      await avisarProfessor(professor, { ...payload, id: eventoId }, id ? 'alterado' : 'criado');
      return { id: eventoId, avisoFalhou: false };
    } catch (err) {
      console.error('[useEventosAgenda] Compromisso salvo, mas o recado falhou:', err);
      return { id: eventoId, avisoFalhou: true };
    }
  }, [professor, usuario]);

  const excluirEvento = useCallback(async (evento, { avisar = true } = {}) => {
    await deleteDoc(doc(db, 'agendaEventos', evento.id));
    if (!avisar) return { avisoFalhou: false };
    try {
      await avisarProfessor(professor, evento, 'cancelado');
      return { avisoFalhou: false };
    } catch (err) {
      console.error('[useEventosAgenda] Compromisso excluído, mas o recado falhou:', err);
      return { avisoFalhou: true };
    }
  }, [professor]);

  // Lembrete para a aula que já passou e não foi registrada.
  const lembrarRegistro = useCallback(async (turma, iso) => {
    const quando = new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    await enviarRecado(
      professor,
      `Lembrete: a aula de ${turma.nome} de ${quando} ainda não foi registrada. Pode lançar conteúdo e chamada?`,
      { turmaId: turma.id, dataAula: iso }
    );
  }, [professor]);

  return { salvarEvento, excluirEvento, lembrarRegistro };
}
