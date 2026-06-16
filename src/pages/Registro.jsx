import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../utils/constants';
import { CheckCircle, Loader2, AlertCircle, User, CreditCard, Users, GraduationCap, Shield } from 'lucide-react';

const col = (name) => collection(db, 'artifacts', APP_ID, 'public', 'data', name);

const FORMAS_PAG = ['PIX', 'Boleto', 'Dinheiro'];
const DIAS_VENC  = ['5', '10', '15', '20'];

function maskCPF(v) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function maskPhone(v) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}
function maskCEP(v) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

/* ── Paleta de seções ─────────────────────────────────────────── */
const THEME = {
  blue:   { strip: 'from-[#0e48fe] to-[#0041a8]', ring: 'focus:ring-[#0e48fe]/25 focus:border-[#0e48fe]', chip: 'bg-[#0e48fe] border-[#0e48fe]', hover: 'hover:border-[#0e48fe]/40 hover:text-[#0e48fe]' },
  orange: { strip: 'from-[#fc6e1f] to-[#d95810]', ring: 'focus:ring-[#fc6e1f]/25 focus:border-[#fc6e1f]', chip: 'bg-[#fc6e1f] border-[#fc6e1f]', hover: 'hover:border-[#fc6e1f]/40 hover:text-[#fc6e1f]' },
  pink:   { strip: 'from-[#c98800] to-[#ffae1e]', ring: 'focus:ring-[#ffae1e]/30 focus:border-[#c98800]', chip: 'bg-[#c98800] border-[#c98800]', hover: 'hover:border-[#ffae1e]/60 hover:text-[#c98800]' },
};

function SectionCard({ theme = THEME.blue, icon: Icon, title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Faixa colorida */}
      <div className={`bg-gradient-to-r ${theme.strip} px-5 py-3.5 flex items-center gap-3`}>
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-white/70 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={11} />{error}
        </p>
      )}
    </div>
  );
}

function Input({ ring = THEME.blue.ring, ...props }) {
  return (
    <input
      className={`w-full border border-slate-200 bg-slate-50 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${ring}`}
      {...props}
    />
  );
}

function ChipGroup({ options, value, onChange, theme = THEME.blue }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
            value === opt
              ? `${theme.chip} text-white`
              : `border-slate-200 text-slate-500 bg-slate-50 ${theme.hover}`
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function Registro() {
  const [papel, setPapel] = useState('');
  const [consentimento, setConsentimento] = useState(false);
  const [form, setForm] = useState({
    nome: '', cpf: '', celular: '', email: '',
    dataNascimento: '', cep: '', endereco: '',
    responsavelNome: '', responsavelCelular: '', responsavelCpf: '', responsavelEmail: '',
    formaPagamento: '', diaVencimento: '',
  });
  const [erros, setErros] = useState({});
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const clearErr = (field) => setErros(prev => { const n = { ...prev }; delete n[field]; return n; });

  const handleCEP = async (raw) => {
    const cep = raw.replace(/\D/g, '');
    set('cep', maskCEP(raw));
    if (cep.length === 8) {
      setBuscandoCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) { set('endereco', `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`); clearErr('cep'); }
        else setErros(p => ({ ...p, cep: 'CEP não encontrado.' }));
      } catch { /* silent */ } finally { setBuscandoCep(false); }
    }
  };

  const validar = () => {
    const e = {};
    if (!papel) e.papel = 'Selecione uma opção para continuar.';
    if (!form.nome.trim()) e.nome = 'Campo obrigatório.';
    if (!form.cpf || form.cpf.replace(/\D/g, '').length < 11) e.cpf = 'CPF inválido.';
    if (!form.celular || form.celular.replace(/\D/g, '').length < 10) e.celular = 'Celular inválido.';
    if (papel === 'responsavel') {
      if (!form.responsavelNome.trim()) e.responsavelNome = 'Campo obrigatório.';
      if (!form.responsavelCelular || form.responsavelCelular.replace(/\D/g, '').length < 10) e.responsavelCelular = 'Celular inválido.';
    }
    if (!form.formaPagamento) e.formaPagamento = 'Selecione uma opção.';
    if (!form.diaVencimento) e.diaVencimento = 'Selecione uma data.';
    if (!consentimento) e.consentimento = 'Você precisa aceitar os termos para continuar.';
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) { document.getElementById('reg-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    setEnviando(true);
    try {
      await addDoc(col('pre-cadastros'), {
        papel,
        nome: form.nome.trim(), cpf: form.cpf, celular: form.celular,
        email: form.email.trim(), dataNascimento: form.dataNascimento,
        cep: form.cep, endereco: form.endereco.trim(),
        responsavelNome: papel === 'responsavel' ? form.responsavelNome.trim() : '',
        responsavelCelular: papel === 'responsavel' ? form.responsavelCelular : '',
        responsavelCpf: papel === 'responsavel' ? form.responsavelCpf : '',
        responsavelEmail: papel === 'responsavel' ? form.responsavelEmail.trim() : '',
        formaPagamento: form.formaPagamento, diaVencimento: form.diaVencimento,
        status: 'pendente', source: 'formulario-online',
        consentimentoLGPD: true,
        consentimentoEm: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      setEnviado(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { console.error(err); alert('Erro ao enviar. Tente novamente.'); }
    finally { setEnviando(false); }
  };

  /* ── Tela de sucesso ─────────────────────────────────────────── */
  if (enviado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#edf2f8] to-[#dbe8f8] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden w-full max-w-md text-center">
          <div className="bg-gradient-to-r from-[#0e48fe] to-[#0041a8] px-8 py-8">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={32} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Cadastro enviado!</h1>
          </div>
          <div className="px-8 py-7">
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Recebemos seus dados com sucesso. Nossa equipe entrará em contato em breve para confirmar a matrícula e indicar a melhor turma.
            </p>
            <img src="https://www.speakupcataguases.com/wp-content/uploads/2026/02/logo-speakup-azul.png" alt="SpeakUp" className="h-7 object-contain mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  /* ── Formulário ──────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#edf2f8] to-[#dbe8f8]">

      {/* Hero header */}
      <div id="reg-top" className="bg-gradient-to-r from-[#005DE4] to-[#0e48fe] relative overflow-hidden">
        {/* Decoração de pontos */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '18px 18px' }} />
        <div className="relative max-w-xl mx-auto px-6 py-8 text-center">
          <img src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png" alt="SpeakUp" className="h-9 object-contain mx-auto mb-5" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Pré-Cadastro</h1>
          <p className="text-blue-100 text-sm mt-2 leading-relaxed">
            Preencha seus dados para iniciar a matrícula na SpeakUp English Academy.
          </p>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 mt-4">
            <Shield size={12} className="text-white" />
            <span className="text-xs font-semibold text-white tracking-wide">Dados protegidos · 100% seguro</span>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-7 space-y-5">

        {/* ── Seletor de papel ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-sm font-bold text-slate-700 mb-1">Quem está preenchendo este formulário?</p>
          <p className="text-xs text-slate-400 mb-4">Selecione uma opção para continuar.</p>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                key: 'aluno',
                icon: GraduationCap,
                title: 'Sou o aluno',
                sub: 'Maior de idade, preenchendo meus próprios dados',
                color: 'border-[#005DE4] bg-[#005DE4]/5',
                iconActive: 'bg-[#005DE4] text-white',
                iconIdle: 'bg-slate-100 text-slate-500',
                titleActive: 'text-[#005DE4]',
                check: 'bg-[#005DE4]',
              },
              {
                key: 'responsavel',
                icon: Users,
                title: 'Sou o responsável',
                sub: 'Pai, mãe ou responsável por um menor de idade',
                color: 'border-[#fc6e1f] bg-[#fc6e1f]/5',
                iconActive: 'bg-[#fc6e1f] text-white',
                iconIdle: 'bg-slate-100 text-slate-500',
                titleActive: 'text-[#fc6e1f]',
                check: 'bg-[#fc6e1f]',
              },
            ].map(opt => {
              const Icon = opt.icon;
              const isActive = papel === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => { setPapel(opt.key); clearErr('papel'); }}
                  className={`relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all text-center ${
                    isActive ? opt.color : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {isActive && (
                    <div className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full ${opt.check} flex items-center justify-center`}>
                      <CheckCircle size={12} className="text-white" />
                    </div>
                  )}
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${isActive ? opt.iconActive : opt.iconIdle}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold leading-tight ${isActive ? opt.titleActive : 'text-slate-700'}`}>{opt.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{opt.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {erros.papel && (
            <p className="mt-3 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={11} />{erros.papel}
            </p>
          )}
        </div>

        {/* ── Restante só aparece após selecionar ─────────────── */}
        {papel && (
          <>
            {/* Dados do Estudante */}
            <SectionCard
              theme={THEME.blue}
              icon={User}
              title="Dados do Estudante"
              subtitle={papel === 'responsavel' ? 'Dados do aluno que será matriculado' : 'Seus dados pessoais'}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="Nome completo do estudante" required error={erros.nome}>
                    <Input ring={THEME.blue.ring} value={form.nome} onChange={e => { set('nome', e.target.value); clearErr('nome'); }} placeholder="Nome completo" maxLength={150} />
                  </Field>
                </div>
                <Field label="CPF" required error={erros.cpf}>
                  <Input ring={THEME.blue.ring} value={form.cpf} onChange={e => { set('cpf', maskCPF(e.target.value)); clearErr('cpf'); }} placeholder="000.000.000-00" maxLength={14} />
                </Field>
                <Field label="Data de nascimento" error={erros.dataNascimento}>
                  <Input ring={THEME.blue.ring} type="date" value={form.dataNascimento} onChange={e => set('dataNascimento', e.target.value)} />
                </Field>
                <Field label="Celular" required error={erros.celular}>
                  <Input ring={THEME.blue.ring} value={form.celular} onChange={e => { set('celular', maskPhone(e.target.value)); clearErr('celular'); }} placeholder="(32) 99999-9999" maxLength={15} />
                </Field>
                <Field label="Email" error={erros.email}>
                  <Input ring={THEME.blue.ring} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="seu@email.com" maxLength={200} />
                </Field>
                <Field label="CEP" error={erros.cep}>
                  <div className="relative">
                    <Input ring={THEME.blue.ring} value={form.cep} onChange={e => handleCEP(e.target.value)} placeholder="00000-000" />
                    {buscandoCep && <Loader2 size={14} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />}
                  </div>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Endereço completo" error={erros.endereco}>
                    <Input ring={THEME.blue.ring} value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Rua, número, bairro, cidade - UF" maxLength={300} />
                  </Field>
                </div>
              </div>
            </SectionCard>

            {/* Dados do Responsável */}
            {papel === 'responsavel' && (
              <SectionCard
                theme={THEME.orange}
                icon={Users}
                title="Seus dados (Responsável)"
                subtitle="Seus dados ficam vinculados à matrícula do aluno"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Field label="Nome completo do responsável" required error={erros.responsavelNome}>
                      <Input ring={THEME.orange.ring} value={form.responsavelNome} onChange={e => { set('responsavelNome', e.target.value); clearErr('responsavelNome'); }} placeholder="Seu nome completo" maxLength={150} />
                    </Field>
                  </div>
                  <Field label="CPF do responsável" error={erros.responsavelCpf}>
                    <Input ring={THEME.orange.ring} value={form.responsavelCpf} onChange={e => set('responsavelCpf', maskCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} />
                  </Field>
                  <Field label="Celular do responsável" required error={erros.responsavelCelular}>
                    <Input ring={THEME.orange.ring} value={form.responsavelCelular} onChange={e => { set('responsavelCelular', maskPhone(e.target.value)); clearErr('responsavelCelular'); }} placeholder="(32) 99999-9999" maxLength={15} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Email do responsável" error={erros.responsavelEmail}>
                      <Input ring={THEME.orange.ring} type="email" value={form.responsavelEmail} onChange={e => set('responsavelEmail', e.target.value)} placeholder="seu@email.com" />
                    </Field>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Pagamento */}
            <SectionCard theme={THEME.pink} icon={CreditCard} title="Informações de Pagamento" subtitle="Preferências para a cobrança mensal">
              <Field label="Selecione uma forma de pagamento" required error={erros.formaPagamento}>
                <ChipGroup theme={THEME.pink} options={FORMAS_PAG} value={form.formaPagamento} onChange={v => { set('formaPagamento', v); clearErr('formaPagamento'); }} />
              </Field>
              <Field label="Selecione uma data para o vencimento da mensalidade" required error={erros.diaVencimento}>
                <div className="flex flex-wrap gap-2">
                  {DIAS_VENC.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => { set('diaVencimento', d); clearErr('diaVencimento'); }}
                      className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                        form.diaVencimento === d
                          ? 'bg-[#c98800] border-[#c98800] text-white'
                          : 'border-slate-200 text-slate-500 bg-slate-50 hover:border-[#ffae1e]/60 hover:text-[#c98800]'
                      }`}
                    >
                      Dia {d}
                    </button>
                  ))}
                </div>
              </Field>
            </SectionCard>

            {/* ── Consentimento LGPD ── */}
            <div className={`bg-white rounded-2xl border p-5 shadow-sm ${erros.consentimento ? 'border-red-300' : 'border-slate-100'}`}>
              <label className="flex items-start gap-3 cursor-pointer" onClick={() => { setConsentimento(v => !v); clearErr('consentimento'); }}>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                  consentimento ? 'bg-[#0e48fe] border-[#0e48fe]' : 'border-slate-300 bg-white'
                }`}>
                  {consentimento && (
                    <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                      <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-xs text-slate-600 leading-relaxed select-none">
                  Li e concordo com a coleta e tratamento dos meus dados pessoais (incluindo CPF) pela{' '}
                  <strong className="text-slate-700">SpeakUp English Academy</strong> exclusivamente para fins de matrícula e comunicação,
                  conforme a <strong className="text-[#0e48fe]">Lei Geral de Proteção de Dados — LGPD (Lei 13.709/2018)</strong>.
                  Estou ciente de que posso solicitar a exclusão dos meus dados a qualquer momento.
                </span>
              </label>
              {erros.consentimento && (
                <p className="mt-2 text-xs text-red-500 flex items-center gap-1 ml-8">
                  <AlertCircle size={11} />{erros.consentimento}
                </p>
              )}
            </div>

            {/* Erros globais */}
            {Object.keys(erros).filter(k => k !== 'papel' && k !== 'consentimento').length > 0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm font-medium">
                <AlertCircle size={15} className="flex-shrink-0" />
                Verifique os campos obrigatórios antes de enviar.
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={enviando}
              className="w-full py-4 bg-gradient-to-r from-[#005DE4] to-[#0e48fe] hover:from-[#0041a8] hover:to-[#005DE4] text-white font-bold rounded-2xl text-base transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#005DE4]/25"
            >
              {enviando ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : 'Enviar pré-cadastro'}
            </button>

            <p className="text-center text-xs text-slate-400 pb-4">
              Seus dados são utilizados exclusivamente para fins de matrícula e comunicação com a SpeakUp.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
