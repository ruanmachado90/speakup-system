import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { Users, UserPlus, KeyRound, Trash2, Eye, EyeOff, GraduationCap } from 'lucide-react';
import { useProfessoresData } from '../hooks';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function ProfessoresAdmin() {
  const [professores, setProfessores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome: '', email: '', slug: '', senha: '' });
  const [showSenha, setShowSenha] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetUid, setResetUid] = useState(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null); // { nome, email, senha }

  const fns = getFunctions();

  // Carrega professores do Firestore
  useEffect(() => {
    const qry = query(collection(db, 'users'), where('role', '==', 'professor'));
    const unsub = onSnapshot(qry, snap => {
      setProfessores(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.nome || !form.email || !form.slug || !form.senha) {
      setError('Preencha todos os campos.'); return;
    }
    if (form.senha.length < 6) { setError('Senha mínima: 6 caracteres.'); return; }
    setSaving(true);
    try {
      const fn = httpsCallable(fns, 'createProfessor');
      await fn({ nome: form.nome, email: form.email, slug: form.slug, password: form.senha });
      setCreatedCredentials({ nome: form.nome, email: form.email, senha: form.senha });
      setSuccess('');
      setForm({ nome: '', email: '', slug: '', senha: '' });
    } catch (err) {
      setError(err.message || 'Erro ao criar professor.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSenha = async (uid) => {
    if (!novaSenha || novaSenha.length < 6) { setError('Nova senha mínima: 6 caracteres.'); return; }
    setResetSaving(true); setError('');
    try {
      const fn = httpsCallable(fns, 'updateProfessorPassword');
      await fn({ uid, password: novaSenha });
      setSuccess('Senha atualizada!');
      setResetUid(null); setNovaSenha('');
    } catch (err) {
      setError(err.message || 'Erro ao atualizar senha.');
    } finally {
      setResetSaving(false);
    }
  };

  const handleDelete = async (uid, nome) => {
    if (!window.confirm(`Remover professor ${nome}? Esta ação não pode ser desfeita.`)) return;
    setError('');
    try {
      const fn = httpsCallable(fns, 'deleteProfessor');
      await fn({ uid });
      setSuccess(`${nome} removido.`);
    } catch (err) {
      setError(err.message || 'Erro ao remover professor.');
    }
  };

  const [fixingCadastros, setFixingCadastros] = useState(false);
  const handleCorrigirCadastros = async () => {
    setFixingCadastros(true); setError(''); setSuccess('');
    try {
      const fn = httpsCallable(fns, 'backfillProfessorNomeKeys');
      const res = await fn();
      setSuccess(`Cadastros corrigidos: ${res.data.updated} professor(es) atualizados.`);
    } catch (err) {
      setError(err.message || 'Erro ao corrigir cadastros.');
    } finally {
      setFixingCadastros(false);
    }
  };

  const [fixingParcelas, setFixingParcelas] = useState(false);
  const handleCorrigirParcelas = async () => {
    setFixingParcelas(true); setError(''); setSuccess('');
    try {
      const fn = httpsCallable(fns, 'backfillParcelasCanceladas');
      const res = await fn();
      setSuccess(`Parcelas conciliadas: ${res.data.updatedPayments} parcela(s) de ${res.data.scannedStudents} aluno(s) cancelado(s) marcadas como canceladas.`);
    } catch (err) {
      setError(err.message || 'Erro ao conciliar parcelas.');
    } finally {
      setFixingParcelas(false);
    }
  };

  // Auto-gerar slug a partir do nome
  const handleNomeChange = (e) => {
    const nome = e.target.value;
    const slug = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setForm(f => ({ ...f, nome, slug }));
  };

  // \u2500\u2500 Diret\u00f3rio de professores (cole\u00e7\u00e3o `professores`) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // Fonte usada nos <select> de Turmas e do formul\u00e1rio de aluno \u2014 separado
  // da conta de acesso (login) acima, que \u00e9 gerenciada por Cloud Function.
  const diretorio = useProfessoresData();
  const [diretorioForm, setDiretorioForm] = useState({ nome: '', email: '', telefone: '' });
  const [diretorioSaving, setDiretorioSaving] = useState(false);
  const [diretorioError, setDiretorioError] = useState('');

  const handleCreateDiretorio = async (e) => {
    e.preventDefault();
    setDiretorioError('');
    if (!diretorioForm.nome.trim()) { setDiretorioError('Informe o nome do professor.'); return; }
    setDiretorioSaving(true);
    try {
      await addDoc(collection(db, 'professores'), {
        nome: diretorioForm.nome.trim(),
        email: diretorioForm.email.trim(),
        telefone: diretorioForm.telefone.trim(),
        status: 'ativo',
        createdAt: Timestamp.now(),
      });
      setDiretorioForm({ nome: '', email: '', telefone: '' });
    } catch (err) {
      setDiretorioError(err.message || 'Erro ao cadastrar professor.');
    } finally {
      setDiretorioSaving(false);
    }
  };

  const handleToggleStatusDiretorio = async (professor) => {
    try {
      await updateDoc(doc(db, 'professores', professor.id), {
        status: professor.status === 'inativo' ? 'ativo' : 'inativo',
      });
    } catch (err) {
      setDiretorioError(err.message || 'Erro ao atualizar status.');
    }
  };

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <GraduationCap size={22} className="text-accent" />
          <h2 className="text-xl font-bold text-slate-800">Gerenciar Professores</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCorrigirParcelas}
            disabled={fixingParcelas}
            title="Marca como 'cancelada' as parcelas pendentes de alunos já cancelados (execute uma vez após a atualização). Nenhum registro é excluído."
            className="px-3 py-1.5 text-xs border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >{fixingParcelas ? 'Conciliando...' : 'Conciliar parcelas canceladas'}</button>
          <button
            onClick={handleCorrigirCadastros}
            disabled={fixingCadastros}
            title="Corrige o cadastro de professores existentes para tolerar acentos/maiúsculas ao lançar conteúdo (execute uma vez após a atualização do sistema)"
            className="px-3 py-1.5 text-xs border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >{fixingCadastros ? 'Corrigindo...' : 'Corrigir cadastros (acentos)'}</button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">{success}</div>}

      {/* Credenciais do professor recém-criado/atualizado */}
      {createdCredentials && (
        <div className="bg-blue-50 border border-[#0e48fe]/30 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-accent mb-2">✅ Conta de <span className="font-bold">{createdCredentials.nome}</span> pronta!</p>
              <p className="text-xs text-slate-600 mb-1">Passe estas credenciais para o professor:</p>
              <div className="mt-2 space-y-1 font-mono text-sm bg-white border border-slate-200 rounded-xl px-4 py-3">
                <p><span className="text-slate-400 text-xs">E-mail:</span> <span className="text-slate-800 font-medium">{createdCredentials.email}</span></p>
                <p><span className="text-slate-400 text-xs">Senha:</span> <span className="text-slate-800 font-medium">{createdCredentials.senha}</span></p>
                <p><span className="text-slate-400 text-xs">Link:</span> <span className="text-slate-800 font-medium">{window.location.origin}/professor-login</span></p>
              </div>
            </div>
            <button
              onClick={() => {
                const txt = `Professor: ${createdCredentials.nome}\nE-mail: ${createdCredentials.email}\nSenha: ${createdCredentials.senha}\nAcesso: ${window.location.origin}/professor-login`;
                navigator.clipboard.writeText(txt);
              }}
              className="flex-shrink-0 px-3 py-1.5 text-xs border border-[#0e48fe]/40 text-accent rounded-lg hover:bg-[#0e48fe]/10 transition-colors"
            >Copiar</button>
          </div>
          <button onClick={() => setCreatedCredentials(null)} className="mt-3 text-xs text-slate-400 hover:text-slate-600">Fechar</button>
        </div>
      )}

      {/* Formulário de criação */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <UserPlus size={16} className="text-accent" /> Novo Professor
        </h3>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Nome completo</label>
            <input
              value={form.nome}
              onChange={handleNomeChange}
              placeholder="Ex: Cecília Lima"
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Slug (URL do painel)</label>
            <input
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="Ex: cecilia-lima"
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent font-mono"
            />
            {form.slug && <p className="text-xs text-slate-400 mt-1">/professor/{form.slug}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="professor@email.com"
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Senha inicial</label>
            <div className="relative">
              <input
                type={showSenha ? 'text' : 'password'}
                value={form.senha}
                onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button type="button" onClick={() => setShowSenha(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? 'Criando...' : 'Criar conta'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de professores */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700">Professores cadastrados</h3>
        </div>
        {loading ? (
          <div className="py-10 text-center text-slate-400 text-sm">Carregando...</div>
        ) : professores.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">Nenhum professor cadastrado ainda.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {professores.map(p => (
              <div key={p.uid} className="px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-[#0e48fe]/10 flex items-center justify-center flex-shrink-0">
                    <GraduationCap size={16} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm">{p.nome}</p>
                    <p className="text-xs text-slate-400">{p.email} · <span className="font-mono">/professor/{p.slug}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setResetUid(resetUid === p.uid ? null : p.uid); setNovaSenha(''); setError(''); setSuccess(''); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-600 hover:border-accent hover:text-accent transition-colors"
                      title="Redefinir senha"
                    >
                      <KeyRound size={13} /> Senha
                    </button>
                    <button
                      onClick={() => handleDelete(p.uid, p.nome)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      title="Remover professor"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Formulário de reset de senha inline */}
                {resetUid === p.uid && (
                  <div className="mt-3 flex items-center gap-3 pl-13">
                    <div className="relative flex-1 max-w-xs">
                      <input
                        type={showNovaSenha ? 'text' : 'password'}
                        value={novaSenha}
                        onChange={e => setNovaSenha(e.target.value)}
                        placeholder="Nova senha (mín. 6 caracteres)"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <button type="button" onClick={() => setShowNovaSenha(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" tabIndex={-1}>
                        {showNovaSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button
                      onClick={() => handleResetSenha(p.uid)}
                      disabled={resetSaving}
                      className="px-4 py-2 bg-accent text-white text-xs rounded-lg hover:bg-accent-hover disabled:opacity-50"
                    >
                      {resetSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button onClick={() => setResetUid(null)} className="text-xs text-slate-400 hover:text-slate-600">Cancelar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Diretório de professores — usado nos <select> de Turmas e Alunos ── */}
      <div className="pt-2 border-t border-slate-200">
        <div className="flex items-center gap-3 mb-4 mt-2">
          <Users size={20} className="text-accent" />
          <h2 className="text-lg font-bold text-slate-800">Diretório de Professores</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4 -mt-2">
          Lista usada nos formulários de turma e aluno. Não precisa de senha — é só o cadastro (nome, contato) que aparece nos seletores.
        </p>

        {diretorioError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{diretorioError}</div>}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4">
          <form onSubmit={handleCreateDiretorio} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Nome completo</label>
              <input
                value={diretorioForm.nome}
                onChange={e => setDiretorioForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Cecília Lima"
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">E-mail (opcional)</label>
              <input
                type="email"
                value={diretorioForm.email}
                onChange={e => setDiretorioForm(f => ({ ...f, email: e.target.value }))}
                placeholder="professor@email.com"
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Telefone (opcional)</label>
              <input
                value={diretorioForm.telefone}
                onChange={e => setDiretorioForm(f => ({ ...f, telefone: e.target.value }))}
                placeholder="(32) 99999-9999"
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={diretorioSaving}
                className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {diretorioSaving ? 'Cadastrando...' : 'Cadastrar no diretório'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700">Professores no diretório</h3>
          </div>
          {diretorio.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">Nenhum professor cadastrado ainda.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {diretorio.map(p => (
                <div key={p.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-[#0e48fe]/10 flex items-center justify-center flex-shrink-0">
                    <Users size={16} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm">{p.nome}</p>
                    <p className="text-xs text-slate-400">{[p.email, p.telefone].filter(Boolean).join(' · ') || 'Sem contato cadastrado'}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.status === 'inativo' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {p.status === 'inativo' ? 'Inativo' : 'Ativo'}
                  </span>
                  <button
                    onClick={() => handleToggleStatusDiretorio(p)}
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-600 hover:border-accent hover:text-accent transition-colors"
                  >
                    {p.status === 'inativo' ? 'Ativar' : 'Desativar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
