import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { useStudents, usePayments, useExpenses, useLeads, useProfessoresData, useParametrosData } from './useSelectors';
import { useVendas } from './useVendas';
import { useSaldosBancarios } from './useSaldosBancarios';
import { useCalendarioLetivo } from './useCalendarioLetivo';
import { useAgendaSemana, useTurmasDaEscola } from './useAgendaSemana';
import { intervaloDoTrimestre } from '../utils/relatorioTrimestral';

// Leitura única (não precisa de tempo real num relatório): notas do semestre
// e contratos assinados. Guarda por chave para não misturar trimestres.
function useLeituraUnica(chave, ler) {
  const [estado, setEstado] = useState({ chave: null, dados: null, erro: null });
  useEffect(() => {
    let vivo = true;
    ler()
      .then((dados) => { if (vivo) setEstado({ chave, dados, erro: null }); })
      .catch((erro) => {
        console.error(`[RelatorioTrimestral] Erro ao ler ${chave}:`, erro);
        if (vivo) setEstado({ chave, dados: null, erro: erro.message });
      });
    return () => { vivo = false; };
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps
  return estado.chave === chave ? estado : { chave, dados: null, erro: null };
}

const lerColecao = async (q) => (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() }));

/**
 * Tudo que o relatório trimestral precisa. Base de alunos, parcelas,
 * despesas e leads vêm do DataContext (já carregados); aulas, avulsas e
 * compromissos só do trimestre; notas do semestre do trimestre.
 */
export function useDadosRelatorioTrimestral(tri, ano) {
  const intervalo = intervaloDoTrimestre(tri, ano);
  const students = useStudents();
  const payments = usePayments();
  const expenses = useExpenses();
  const leads = useLeads();
  const professores = useProfessoresData();
  const { parametros } = useParametrosData();
  const { vendas } = useVendas();
  const { porCompetencia } = useSaldosBancarios();
  const { dados: calendarioAno } = useCalendarioLetivo(ano);
  const { turmas, loading: carregandoTurmas } = useTurmasDaEscola(professores);
  const { aulas, avulsas, eventos, loading: carregandoAulas } = useAgendaSemana(intervalo.inicio, intervalo.fim);

  const notas = useLeituraUnica(`notas:${intervalo.semestre}`, async () => {
    const [avaliacoes, grades] = await Promise.all([
      lerColecao(query(collection(db, 'avaliacoes'), where('semestre', '==', intervalo.semestre))),
      lerColecao(query(collection(db, 'grades'), where('semestre', '==', intervalo.semestre))),
    ]);
    return { avaliacoes, grades };
  });
  // Contrato do ano tem id "<aluno>_<ano>"; o de matrícula, o id do aluno.
  const contratos = useLeituraUnica('contratos', async () =>
    new Set((await lerColecao(collection(db, 'artifacts', APP_ID, 'public', 'data', 'contratos'))).map((c) => c.id.split('_')[0])));

  return {
    intervalo,
    students, payments, expenses, leads, professores, vendas, turmas, aulas, avulsas, eventos, calendarioAno,
    params: parametros,
    saldosBancarios: Object.values(porCompetencia),
    avaliacoes: notas.dados?.avaliacoes || [],
    grades: notas.dados?.grades || [],
    contratosAssinados: contratos.dados || new Set(),
    carregando: carregandoTurmas || carregandoAulas || !notas.dados && !notas.erro || !contratos.dados && !contratos.erro,
    avisos: [notas.erro && 'Notas não puderam ser lidas.', contratos.erro && 'Contratos não puderam ser lidos.'].filter(Boolean),
  };
}
