/**
 * Firestore em memória para testar os handlers (utils/handlers.js) sem rede.
 * Cobre só o que eles usam: collection/doc/query/where, getDoc/getDocs,
 * updateDoc, writeBatch (set/update/delete/commit atômico) e arrayUnion.
 *
 * Uso: jest.mock('firebase/firestore', () => require('./firestoreFake').modulo);
 *      const { semear, ler, existe, todos, falharProximoCommit } = require('./firestoreFake');
 */

const dados = new Map(); // caminho → objeto
let seq = 0;
let falhaNoCommit = false;

const caminho = (...partes) => partes.filter(Boolean).join('/');
const clonar = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));

const aplicarUpdate = (atual, mudancas) => {
  const novo = { ...atual };
  Object.entries(mudancas).forEach(([k, v]) => {
    if (v && typeof v === 'object' && v.__arrayUnion) novo[k] = [...(novo[k] || []), ...v.__arrayUnion];
    else novo[k] = v;
  });
  return novo;
};

const refDe = (path) => ({ path, id: path.split('/').pop() });

const docSnap = (path) => ({
  id: path.split('/').pop(),
  ref: refDe(path),
  exists: () => dados.has(path),
  data: () => clonar(dados.get(path)),
});

const igual = (a, b) => a === b;
const casa = (doc, filtros) => filtros.every((f) => f.op === '==' && igual(doc[f.campo], f.valor));

// ── API estilo firebase/firestore ──────────────────────────────────────────
const collection = (base, ...partes) => ({ __col: true, path: caminho(...(base && base.__col ? [base.path] : []), ...partes) });

const doc = (base, ...partes) => {
  if (base && base.__col) return refDe(caminho(base.path, partes[0] || `auto${(seq += 1)}`));
  return refDe(caminho(...partes)); // doc(db, 'turmas', id) → 'turmas/id'
};

const where = (campo, op, valor) => ({ campo, op, valor });
const query = (col, ...filtros) => ({ __query: true, col, filtros });

const getDoc = async (ref) => docSnap(ref.path);

const getDocs = async (alvo) => {
  const col = alvo.__query ? alvo.col : alvo;
  const filtros = alvo.__query ? alvo.filtros : [];
  const prefixo = `${col.path}/`;
  const docs = [...dados.entries()]
    .filter(([p, v]) => p.startsWith(prefixo) && !p.slice(prefixo.length).includes('/') && casa(v, filtros))
    .map(([p]) => docSnap(p));
  return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn) => docs.forEach(fn) };
};

const updateDoc = async (ref, mudancas) => {
  if (!dados.has(ref.path)) throw new Error(`No document to update: ${ref.path}`);
  dados.set(ref.path, aplicarUpdate(dados.get(ref.path), mudancas));
};

const setDoc = async (ref, valor) => { dados.set(ref.path, clonar(valor)); };
const addDoc = async (col, valor) => {
  const ref = doc(col);
  dados.set(ref.path, clonar(valor));
  return ref;
};
const deleteDoc = async (ref) => { dados.delete(ref.path); };

const arrayUnion = (...itens) => ({ __arrayUnion: itens });

const writeBatch = () => {
  const ops = [];
  return {
    set: (ref, valor) => ops.push({ tipo: 'set', ref, valor }),
    update: (ref, mudancas) => ops.push({ tipo: 'update', ref, mudancas }),
    delete: (ref) => ops.push({ tipo: 'delete', ref }),
    commit: async () => {
      if (falhaNoCommit) { falhaNoCommit = false; throw new Error('falha simulada no commit'); }
      // Atômico: valida tudo antes de aplicar qualquer coisa.
      ops.forEach((o) => {
        if (o.tipo === 'update' && !dados.has(o.ref.path)) throw new Error(`No document to update: ${o.ref.path}`);
      });
      ops.forEach((o) => {
        if (o.tipo === 'set') dados.set(o.ref.path, clonar(o.valor));
        else if (o.tipo === 'update') dados.set(o.ref.path, aplicarUpdate(dados.get(o.ref.path), o.mudancas));
        else dados.delete(o.ref.path);
      });
    },
  };
};

// ── utilidades de teste ────────────────────────────────────────────────────
const semear = (path, valor) => dados.set(path, clonar(valor));
const ler = (path) => clonar(dados.get(path));
const existe = (path) => dados.has(path);
const todos = (prefixo) => [...dados.entries()]
  .filter(([p]) => p.startsWith(`${prefixo}/`) && !p.slice(prefixo.length + 1).includes('/'))
  .map(([p, v]) => ({ id: p.split('/').pop(), ...clonar(v) }));
const limpar = () => { dados.clear(); seq = 0; falhaNoCommit = false; };
const falharProximoCommit = () => { falhaNoCommit = true; };

module.exports = {
  modulo: { collection, doc, where, query, getDoc, getDocs, updateDoc, setDoc, addDoc, deleteDoc, writeBatch, arrayUnion },
  semear, ler, existe, todos, limpar, falharProximoCommit,
};
