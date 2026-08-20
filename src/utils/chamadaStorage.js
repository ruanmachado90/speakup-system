import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const sanitize = str => String(str).replace(/[/\.#[\]\s]/g, '_');

// Salva (ou atualiza) uma aula no diário do professor.
// turmaId: id do documento da turma no Firestore
// etapa: '1º Semestre' | '2º Semestre'
// aula: { id, data, conteudo, devercasa, tarefaPara, presenca, obs, registradoEm }
export async function salvarAula(turmaId, etapa, aula) {
  const docId = sanitize(aula.id || `${turmaId}__${etapa}__${aula.data}`);
  await setDoc(doc(db, 'diario', docId), {
    ...aula,
    turmaId,
    etapa,
  }, { merge: true });
}

// Salva o mapa de tarefas de uma aula (cria o doc se ainda não existir).
export async function salvarTarefas(turmaId, etapa, aulaId, tarefas) {
  const docId = sanitize(aulaId);
  await setDoc(doc(db, 'diario', docId), { turmaId, etapa, tarefas }, { merge: true });
}
