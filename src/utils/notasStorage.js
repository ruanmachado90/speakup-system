import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { etapaToSemestre } from '../hooks/useAvaliacoesParciais';

export const PONTOS = { Written: 50, Listening: 30, Speaking: 20 };
const PREFIXO = { Written: 'W', Listening: 'L', Speaking: 'S' };

export const TIPOS = ['Written', 'Listening', 'Speaking'];

export const CONCEITO_SCALE = [
  { min: 95, label: 'A+' },
  { min: 90, label: 'A'  },
  { min: 85, label: 'B+' },
  { min: 80, label: 'B'  },
  { min: 75, label: 'C+' },
  { min: 70, label: 'C'  },
  { min: 60, label: 'C-' },
  { min: 50, label: 'D'  },
  { min: 0,  label: 'F'  },
];

export function conceito(total) {
  if (total == null || isNaN(total)) return '—';
  for (const { min, label } of CONCEITO_SCALE) {
    if (total >= min) return label;
  }
  return 'F';
}

// Salva uma avaliação nas coleções de produção ('avaliacoes' + 'grades').
// existingAvId: ID do documento já existente no Firestore (null = criar novo)
export async function salvarAvaliacao(turmaId, etapa, professorSlug, tipo, testIndex, notas, existingAvId = null) {
  const semestre = etapaToSemestre(etapa);
  const tipoKey  = tipo.toLowerCase();
  const maxPts   = PONTOS[tipo];

  // Encontra ou cria o documento de avaliação
  let avId = existingAvId;
  if (!avId) {
    const ref = await addDoc(collection(db, 'avaliacoes'), {
      turmaId,
      professorSlug,
      semestre,
      tipo:   tipoKey,
      pontos: maxPts,
      label:  `${PREFIXO[tipo]}${testIndex + 1}`,
      ordem:  testIndex,
      criadoEm: new Date().toISOString(),
    });
    avId = ref.id;
  }

  // Salva a nota de cada aluno no documento de grades (merge para não sobrescrever outras notas)
  await Promise.all(
    Object.entries(notas)
      .filter(([, score]) => score !== '' && score != null)
      .map(([studentId, score]) => {
        const gradeId = `${turmaId}_${semestre}_${studentId}`;
        return setDoc(
          doc(db, 'grades', gradeId),
          { studentId, turmaId, professorSlug, semestre, scores: { [avId]: parseFloat(score) } },
          { merge: true },
        );
      }),
  );
}

// Calcula o resultado de um aluno.
// avaliacoes: { Written: [{ id, pontos, notas: { [studentId]: score } }], ... }
// Normaliza corretamente quando o teste tem pontos diferentes do máximo da categoria.
export function calcularResultado(avaliacoes, alunoId) {
  const media = (tipo) => {
    const lista      = avaliacoes[tipo] ?? [];
    const catMax     = PONTOS[tipo];
    const scored     = lista.filter(a => {
      const v = a.notas?.[alunoId];
      return v != null && v !== '' && !isNaN(parseFloat(v));
    });
    if (!scored.length) return null;
    const avgPct = scored.reduce((s, a) => {
      const score   = parseFloat(a.notas[alunoId]);
      const testMax = a.pontos ?? catMax;
      return s + score / testMax;
    }, 0) / scored.length;
    return parseFloat((avgPct * catMax).toFixed(2));
  };

  const w = media('Written');
  const l = media('Listening');
  const s = media('Speaking');
  const total    = (w ?? 0) + (l ?? 0) + (s ?? 0);
  const temAlgum = w != null || l != null || s != null;

  return {
    written:   w,
    listening: l,
    speaking:  s,
    total:     temAlgum ? total : null,
    conceito:  temAlgum ? conceito(total) : '—',
  };
}
