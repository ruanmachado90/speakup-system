import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Table } from '../components/ui/Table';

export default function Vendas() {
  // Estado de loading global para operações
  const [loading, setLoading] = useState(true);
  // Estado de vendas
  const [vendas, setVendas] = useState([]);
  // Listener para vendas em tempo real
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, 'vendas'), (snap) => {
      setVendas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      setLoading(false);
      alert('Erro ao carregar vendas: ' + (err?.message || err));
    });
    return () => unsub();
  }, []);

  // Função para cancelar pagamento
  async function handleCancelarPagamento(venda) {
    if (!window.confirm('Deseja realmente cancelar o pagamento desta venda?')) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'vendas', venda.id), {
        status: 'pendente',
        valorPago: '',
        dataPagamento: '',
      });
      alert('Pagamento cancelado com sucesso!');
    } catch (err) {
      console.error('Erro ao cancelar pagamento:', err);
      alert('Erro ao cancelar pagamento. Tente novamente.\n' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }
  // Estado para cobrança selecionada para baixa
  const [cobrancaBaixa, setCobrancaBaixa] = useState(null);
  // Estado para formulário de baixa
  const [formBaixa, setFormBaixa] = useState({ valorPago: '', dataPagamento: '' });

    // Função para abrir modal de baixa de pagamento
    function handleOpenBaixaModal(cobranca) {
      setCobrancaBaixa(cobranca);
      setFormBaixa({ valorPago: cobranca.valor || '', dataPagamento: '' });
      setShowBaixaModal(true);
    }

  // Função para confirmar baixa de pagamento
  async function handleConfirmarBaixa() {
    if (!formBaixa.valorPago || !formBaixa.dataPagamento) {
      alert('Preencha todos os campos para dar baixa!');
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'vendas', cobrancaBaixa.id), {
        status: 'paga',
        valorPago: formBaixa.valorPago,
        dataPagamento: formBaixa.dataPagamento,
      });
      setShowBaixaModal(false);
      setCobrancaBaixa(null);
      setFormBaixa({ valorPago: '', dataPagamento: '' });
      alert('Pagamento registrado com sucesso!');
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err);
      alert('Erro ao registrar pagamento. Tente novamente.\n' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }
  // Estado para modal de visualização/edição
  const [showViewModal, setShowViewModal] = useState(false);
  const [cobrancaView, setCobrancaView] = useState(null);
  const [formView, setFormView] = useState({});
  // Estado para modal de baixa de pagamento
  const [showBaixaModal, setShowBaixaModal] = useState(false);
  // Estado para sugestões de aluno (autocomplete)
  const [alunoSugestoes, setAlunoSugestoes] = useState([]);

  // Função para abrir modal de visualização/edição
  function handleOpenViewModal(cobranca) {
    setCobrancaView(cobranca);
    setFormView({ ...cobranca });
    setShowViewModal(true);
  }
  // Função para salvar edição
  async function handleSalvarEdicao() {
    if (!formView.aluno || !formView.valor) {
      alert('Preencha os campos obrigatórios!');
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'vendas', formView.id), {
        aluno: formView.aluno,
        tipo: formView.tipo,
        livro: formView.livro,
        valor: formView.valor,
        pagamento: formView.pagamento,
        parcelas: formView.parcelas,
        vencimento: formView.vencimento,
        // Não altera status, valorPago, dataPagamento
      });
      setShowViewModal(false);
      setCobrancaView(null);
      setFormView({});
      alert('Venda editada com sucesso!');
    } catch (err) {
      console.error('Erro ao editar venda:', err);
      alert('Erro ao editar venda. Tente novamente.\n' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  // Função para deletar cobrança
  async function handleDeleteCobranca(id) {
    if (!window.confirm('Tem certeza que deseja excluir esta cobrança?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'vendas', id));
      alert('Cobrança excluída com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir cobrança:', err);
      alert('Erro ao excluir cobrança. Tente novamente.\n' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  // Toggle de visão dos indicadores
  const [visao, setVisao] = useState('mes'); // 'geral' ou 'mes'
  const [mesIndicador, setMesIndicador] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  });
  const { students } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    aluno: '',
    tipo: '',
    livro: '',
    valor: '',
    pagamento: '',
    parcelas: '1x',
    vencimento: '',
    search: '',
  });
  // ...existing code...
  const [mesFiltro, setMesFiltro] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  });
  const [statusFiltro, setStatusFiltro] = useState('');

  // ...existing code...

  // Lógica de status: pendente, atrasada, paga
  function getStatusVenda(venda) {
    if (venda.status === 'paga') return 'paga';
    const hoje = new Date();
    const dataVenda = venda.vencimento ? new Date(venda.vencimento) : (venda.createdAt ? new Date(venda.createdAt) : null);
    if (!dataVenda) return 'pendente';
    if (dataVenda < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()) && venda.status !== 'paga') {
      return 'atrasada';
    }
    return 'pendente';
  }

  // Filtrar vendas pelo mês e status
  const vendasFiltradas = useMemo(() => {
    // Remove vendas duplicadas por id
    const vendasUnicas = Array.from(new Map(vendas.map(v => [v.id, v])).values());
    let filtradas = vendasUnicas.filter(v => {
      if (!mesFiltro) return true;
      const data = v.vencimento ? new Date(v.vencimento) : (v.createdAt ? new Date(v.createdAt) : null);
      if (!data) return false;
      const anoMes = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
      return anoMes === mesFiltro;
    });
    if (statusFiltro) {
      filtradas = filtradas.filter(v => getStatusVenda(v) === statusFiltro);
    }
    if (form.search && form.search.trim() !== '') {
      const termo = form.search.trim().toLowerCase();
      filtradas = filtradas.filter(v =>
        (v.aluno && v.aluno.toLowerCase().includes(termo)) ||
        (v.livro && v.livro.toLowerCase().includes(termo))
      );
    }
    return filtradas;
  }, [vendas, mesFiltro, statusFiltro, form.search]);

  // Autocomplete de alunos
  const handleAlunoChange = (e) => {
    const value = e.target.value;
    setForm(f => ({ ...f, aluno: value }));
    if (value.length > 0 && students?.length) {
      setAlunoSugestoes(students.filter(s => s.name?.toLowerCase().includes(value.toLowerCase())));
    } else {
      setAlunoSugestoes([]);
    }
  };

  // Livros disponíveis
  const livros = useMemo(() => [
    'KIDS',
    'TEENS',
    'ADULTS/BUSINESS',
  ], []);

  return (
    <div className="w-full max-w-6xl mx-auto px-2 py-8">
      {/* Toggle de visão dos indicadores */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex gap-2 items-center">
          <button
            className={`px-4 py-2 rounded-l-lg font-bold border ${visao === 'geral' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-600'}`}
            onClick={() => setVisao('geral')}
          >
            Visão Geral
          </button>
          <button
            className={`px-4 py-2 rounded-r-lg font-bold border ${visao === 'mes' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-600'}`}
            onClick={() => setVisao('mes')}
          >
            Por Mês
          </button>
        </div>
        {visao === 'mes' && (
          <select
            value={mesIndicador}
            onChange={e => setMesIndicador(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#005DE4] focus:outline-none text-slate-700"
          >
            {Array.from({length: 12}, (_,i) => {
              const d = new Date();
              d.setMonth(i);
              return (
                <option key={i} value={`${d.getFullYear()}-${String(i+1).padStart(2,'0')}`}>{d.toLocaleString('pt-BR', { month: 'long' })}</option>
              );
            })}
          </select>
        )}
      </div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-black text-[#00234b]">Vendas</h2>
        <div className="flex gap-2">
          <button
            className="px-6 py-3 rounded-full bg-white text-[#005DE4] font-bold border border-[#005DE4] hover:bg-blue-50 transition-colors flex items-center gap-2"
            onClick={() => window.print()}
          >
            <svg width="20" height="20" fill="none" stroke="#005DE4" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="6" y="9" width="12" height="7" rx="2"/>
              <path d="M6 9V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4"/>
              <rect x="9" y="16" width="6" height="3" rx="1"/>
            </svg>
            Imprimir
          </button>
          <button
            className="px-6 py-3 rounded-full bg-[#005DE4] text-white font-bold hover:bg-[#004BB8] transition-colors"
            onClick={() => setShowModal(true)}
          >
            + Nova Venda
          </button>
        </div>
      </div>
      {/* Indicadores (cards) */}
      <div className="flex flex-wrap gap-6 mb-8">
        {(() => {
          // Filtragem para visão dos cards
          let vendasIndicadores = vendas;
          if (visao === 'mes') {
            vendasIndicadores = vendas.filter(v => {
              const data = v.vencimento ? new Date(v.vencimento) : (v.createdAt ? new Date(v.createdAt) : null);
              if (!data) return false;
              const anoMes = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
              return anoMes === mesIndicador;
            });
          }
          // Separar vencidas e pendentes
          const vencidas = vendasIndicadores.filter(v => getStatusVenda(v) === 'atrasada');
          const pendentes = vendasIndicadores.filter(v => getStatusVenda(v) === 'pendente');
          return <>
            {/* Card Receita Prevista */}
            <div className="flex-1 min-w-[220px] bg-white rounded-2xl shadow border border-slate-100 p-5 flex items-center gap-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-2 bg-blue-600 rounded-l-2xl" />
              <div>
                <div className="text-xs text-slate-500 font-semibold mb-1">Total Previsto</div>
                <div className="text-2xl font-black text-slate-900">R$ {vendasIndicadores.reduce((acc, v) => acc + Number(v.valor || 0), 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
              </div>
            </div>
            {/* Card Receita Recebida */}
            <div className="flex-1 min-w-[220px] bg-white rounded-2xl shadow border border-slate-100 p-5 flex items-center gap-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-2 bg-green-600 rounded-l-2xl" />
              <div>
                <div className="text-xs text-slate-500 font-semibold mb-1">Total Realizado</div>
                <div className="text-2xl font-black text-green-600">R$ {vendasIndicadores.filter(v => v.status === 'paga').reduce((acc, v) => acc + Number(v.valor || 0), 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
              </div>
            </div>
            {/* Card Parcelas Vencidas */}
            <div className="flex-1 min-w-[220px] bg-white rounded-2xl shadow border border-slate-100 p-5 flex items-center gap-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-2 bg-red-500 rounded-l-2xl" />
              <div>
                <div className="text-xs text-slate-500 font-semibold mb-1">Parcelas Vencidas</div>
                <div className="text-2xl font-black text-red-500">R$ {vencidas.reduce((acc, v) => acc + Number(v.valor || 0), 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
              </div>
            </div>
            {/* Card Parcelas Pendentes */}
            <div className="flex-1 min-w-[220px] bg-white rounded-2xl shadow border border-slate-100 p-5 flex items-center gap-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-2 bg-yellow-400 rounded-l-2xl" />
              <div>
                <div className="text-xs text-slate-500 font-semibold mb-1">Parcelas Pendentes</div>
                <div className="text-2xl font-black text-yellow-500">R$ {pendentes.reduce((acc, v) => acc + Number(v.valor || 0), 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
              </div>
            </div>
            {/* Card Vendas Efetuadas */}
            <div className="flex-1 min-w-[220px] bg-white rounded-2xl shadow border border-slate-100 p-5 flex items-center gap-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-2 bg-slate-400 rounded-l-2xl" />
              <div>
                <div className="text-xs text-slate-500 font-semibold mb-1">Vendas Efetuadas</div>
                <div className="text-2xl font-black text-slate-900">{
                  (() => {
                    // Contabiliza apenas vendas únicas por mês (não parcelas)
                    // Considera vendas com mesmo aluno, tipo, livro, valor, pagamento, criadas no mesmo dia
                    const vendasUnicas = new Map();
                    vendasIndicadores.forEach(v => {
                      // Chave composta: aluno|tipo|livro|valor|pagamento|dataVenda
                      const dataVenda = v.createdAt ? v.createdAt.slice(0,10) : (v.vencimento ? v.vencimento : '');
                      const chave = [v.aluno, v.tipo, v.livro, v.valor, v.pagamento, dataVenda].join('|');
                      if (!vendasUnicas.has(chave)) {
                        vendasUnicas.set(chave, v);
                      }
                    });
                    return vendasUnicas.size;
                  })()
                }</div>
              </div>
            </div>
          </>;
        })()}
      </div>

      {/* Modal de Nova Venda */}
            {/* Modal de Edição/Visualização de Venda */}
            {showViewModal && cobrancaView && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg relative">
                  <button className="absolute top-2 right-2 text-slate-400 hover:text-red-500" onClick={() => setShowViewModal(false)}>&times;</button>
                  <h3 className="text-xl font-bold mb-4">Editar Venda</h3>
                  <form className="space-y-4" onSubmit={async (e) => {
                    e.preventDefault();
                    await handleSalvarEdicao();
                  }}>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Nome do Aluno</label>
                      <input
                        type="text"
                        value={formView.aluno || ''}
                        onChange={e => setFormView(f => ({ ...f, aluno: e.target.value }))}
                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                        placeholder="Nome do aluno"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Tipo de Compra</label>
                      <select
                        value={formView.tipo || ''}
                        onChange={e => setFormView(f => ({ ...f, tipo: e.target.value, livro: '' }))}
                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                      >
                        <option value="">Selecione</option>
                        <option value="Material Didático">Material Didático</option>
                        <option value="Uniforme">Uniforme</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                    {formView.tipo === 'Material Didático' && (
                      <div>
                        <label className="block text-sm font-semibold mb-1">Livro</label>
                        <select
                          value={formView.livro || ''}
                          onChange={e => setFormView(f => ({ ...f, livro: e.target.value }))}
                          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                        >
                          <option value="">Selecione o livro</option>
                          {livros.map(livro => (
                            <option key={livro} value={livro}>{livro}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-semibold mb-1">Valor da Compra</label>
                      <input
                        type="number"
                        value={formView.valor || ''}
                        onChange={e => setFormView(f => ({ ...f, valor: e.target.value }))}
                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                        placeholder="R$ 0,00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Forma de Pagamento</label>
                      <select
                        value={formView.pagamento || ''}
                        onChange={e => setFormView(f => ({ ...f, pagamento: e.target.value }))}
                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                      >
                        <option value="">Selecione</option>
                        <option value="PIX">PIX</option>
                        <option value="BOLETO">BOLETO</option>
                        <option value="CARTÃO">CARTÃO</option>
                        <option value="DINHEIRO">DINHEIRO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Parcelas</label>
                      <input
                        type="text"
                        value={formView.parcelas || ''}
                        onChange={e => setFormView(f => ({ ...f, parcelas: e.target.value }))}
                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                        placeholder="Ex: 1/2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Vencimento</label>
                      <input
                        type="date"
                        value={formView.vencimento || ''}
                        onChange={e => setFormView(f => ({ ...f, vencimento: e.target.value }))}
                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                      <button type="button" className="px-4 py-2 rounded bg-slate-100" onClick={() => setShowViewModal(false)}>Cancelar</button>
                      <button type="submit" className="px-4 py-2 rounded bg-[#005DE4] text-white font-bold">Salvar Alterações</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg relative">
            <button className="absolute top-2 right-2 text-slate-400 hover:text-red-500" onClick={() => setShowModal(false)}>&times;</button>
            <h3 className="text-xl font-bold mb-4">Nova Venda</h3>
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              try {
                // Lógica de parcelamento
                const numParcelas = parseInt(form.parcelas.replace('x',''));
                const valorTotal = parseFloat(form.valor);
                if (!form.vencimento) {
                  alert('Informe o vencimento da 1ª parcela');
                  setLoading(false);
                  return;
                }
                const vendasParceladas = [];
                const dataBase = new Date(form.vencimento);
                for (let i = 0; i < numParcelas; i++) {
                  // Cria uma nova data baseada na dataBase para cada parcela
                  const venc = new Date(dataBase.getFullYear(), dataBase.getMonth() + i, dataBase.getDate());
                  vendasParceladas.push({
                    ...form,
                    parcela: `${i+1}/${numParcelas}`,
                    valor: (valorTotal/numParcelas).toFixed(2),
                    vencimento: venc.toISOString().slice(0,10),
                    createdAt: new Date().toISOString(),
                  });
                }
                // Salvar todas as parcelas no Firestore
                await Promise.all(
                  vendasParceladas.map(v => addDoc(collection(db, 'vendas'), v))
                );
                setShowModal(false);
                setForm({ aluno: '', tipo: '', livro: '', valor: '', pagamento: '', parcelas: '1x', vencimento: '', search: '' });
                alert('Venda registrada com sucesso!');
              } catch (err) {
                console.error('Erro ao registrar venda:', err);
                alert('Erro ao registrar venda. Tente novamente.\n' + (err?.message || err));
              } finally {
                setLoading(false);
              }
            }}>
              {/* Nome do Aluno com autocomplete */}
              <div>
                <label className="block text-sm font-semibold mb-1">Nome do Aluno</label>
                <input
                  type="text"
                  value={form.aluno}
                  onChange={handleAlunoChange}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                  placeholder="Digite para buscar..."
                  autoComplete="off"
                />
                {alunoSugestoes.length > 0 && (
                  <ul className="bg-white border rounded shadow mt-1 max-h-32 overflow-y-auto absolute w-[calc(100%-2rem)] z-10">
                    {alunoSugestoes.map(s => (
                      <li key={s.id} className="px-4 py-2 hover:bg-blue-100 cursor-pointer" onClick={() => { setForm(f => ({ ...f, aluno: s.name })); setAlunoSugestoes([]); }}>{s.name}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Tipo de compra */}
              <div>
                <label className="block text-sm font-semibold mb-1">Tipo de Compra</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value, livro: '' }))}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                >
                  <option value="">Selecione</option>
                  <option value="Material Didático">Material Didático</option>
                  <option value="Uniforme">Uniforme</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              {/* Dropdown de livros se Material Didático */}
              {form.tipo === 'Material Didático' && (
                <div>
                  <label className="block text-sm font-semibold mb-1">Livro</label>
                  <select
                    value={form.livro}
                    onChange={e => setForm(f => ({ ...f, livro: e.target.value }))}
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                  >
                    <option value="">Selecione o livro</option>
                    {livros.map(livro => (
                      <option key={livro} value={livro}>{livro}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Valor da compra */}
              <div>
                <label className="block text-sm font-semibold mb-1">Valor da Compra</label>
                <input
                  type="number"
                  value={form.valor}
                  onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                  placeholder="R$ 0,00"
                  min="0"
                  step="0.01"
                />
              </div>
              {/* Forma de pagamento */}
              <div>
                <label className="block text-sm font-semibold mb-1">Forma de Pagamento</label>
                <select
                  value={form.pagamento}
                  onChange={e => setForm(f => ({ ...f, pagamento: e.target.value }))}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                >
                  <option value="">Selecione</option>
                  <option value="PIX">PIX</option>
                  <option value="BOLETO">BOLETO</option>
                  <option value="CARTÃO">CARTÃO</option>
                  <option value="DINHEIRO">DINHEIRO</option>
                </select>
              </div>


              {/* Parcelas */}
              <div>
                <label className="block text-sm font-semibold mb-1">Parcelas</label>
                <select
                  value={form.parcelas}
                  onChange={e => setForm(f => ({ ...f, parcelas: e.target.value }))}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                >
                  <option value="1x">1x</option>
                  <option value="2x">2x</option>
                  <option value="3x">3x</option>
                </select>
              </div>

              {/* Vencimento da 1ª parcela */}
              <div>
                <label className="block text-sm font-semibold mb-1">Vencimento da 1ª parcela</label>
                <input
                  type="date"
                  value={form.vencimento}
                  onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                  min={new Date().toISOString().slice(0,10)}
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="px-4 py-2 rounded bg-slate-100" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded bg-[#005DE4] text-white font-bold">Salvar Venda</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Filtro de mês e tabela de vendas */}
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 mt-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <input
            type="text"
            placeholder="Buscar aluno ou venda..."
            className="border border-slate-300 rounded-lg px-4 py-2 w-full md:w-96 focus:ring-2 focus:ring-[#005DE4] focus:outline-none text-slate-700 shadow-sm"
            value={form.search || ''}
            onChange={e => setForm(f => ({ ...f, search: e.target.value }))}
          />
          <div className="flex gap-4 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <label className="font-semibold text-slate-700">Mês:</label>
              <select
                value={mesFiltro}
                onChange={e => setMesFiltro(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#005DE4] focus:outline-none text-slate-700"
              >
                {Array.from({length: 12}, (_,i) => {
                  const d = new Date();
                  d.setMonth(i);
                  return (
                    <option key={i} value={`${d.getFullYear()}-${String(i+1).padStart(2,'0')}`}>{d.toLocaleString('pt-BR', { month: 'long' })}</option>
                  );
                })}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="font-semibold text-slate-700">Status:</label>
              <select
                value={statusFiltro}
                onChange={e => setStatusFiltro(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#005DE4] focus:outline-none text-slate-700"
              >
                <option value="">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="atrasada">Atrasada</option>
                <option value="paga">Paga</option>
              </select>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="text-slate-400">Carregando vendas...</div>
        ) : vendasFiltradas.length === 0 ? (
          <div className="text-slate-400">Nenhuma venda registrada neste mês.</div>
        ) : (
          <Table
            header={[
              'Aluno', 'Livro', 'Valor', 'Parcelas', 'Data', 'Status', 'Ações'
            ]}
            data={vendasFiltradas}
            rowKey={venda => venda.id}
            render={venda => [
              <td key="aluno" className="py-3 px-4 text-slate-800 font-medium whitespace-nowrap">{venda.aluno}</td>,
              <td key="livro" className="py-3 px-4 text-slate-700 whitespace-nowrap">{venda.livro || '-'}</td>,
              <td key="valor" className="py-3 px-4 text-slate-700 whitespace-nowrap">R$ {Number(venda.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>,
              <td key="parcelas" className="py-3 px-4 text-slate-700 whitespace-nowrap">{venda.parcelas}</td>,
              <td key="data" className="py-3 px-4 text-slate-700 whitespace-nowrap">{venda.createdAt ? new Date(venda.createdAt).toLocaleDateString('pt-BR') : '-'}</td>,
              <td key="status" className="py-3 px-4">
                {(() => {
                  const status = getStatusVenda(venda);
                  if (status === 'paga') return <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">Paga</span>;
                  if (status === 'atrasada') return <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">Atrasada</span>;
                  return <span className="inline-block px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">Pendente</span>;
                })()}
              </td>,
              <td key="acoes" className="py-3 px-4">
                <div className="flex gap-1 items-center">
                  <button title="Imprimir recibo" className="p-0.5 hover:bg-green-50 rounded transition" onClick={() => window.open(`/recibo/${venda.id}`, '_blank')}>
                    <svg width="18" height="18" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2"/><rect x="8" y="13" width="8" height="3" rx="1"/></svg>
                  </button>
                  <button title="Visualizar" className="p-0.5 hover:bg-slate-100 rounded transition" onClick={() => handleOpenViewModal(venda)}>
                    <svg width="18" height="18" fill="none" stroke="#222" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </button>
                  {getStatusVenda(venda) === 'paga' ? (
                    <button title="Cancelar pagamento" className="p-0.5 hover:bg-red-100 rounded transition" onClick={() => handleCancelarPagamento(venda)}>
                      <svg width="18" height="18" fill="none" stroke="#ef4444" strokeWidth="2.2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  ) : (
                    <button title="Dar baixa" className="p-0.5 hover:bg-green-100 rounded transition" onClick={() => handleOpenBaixaModal(venda)}>
                      <svg width="18" height="18" fill="none" stroke="#16a34a" strokeWidth="2.2" viewBox="0 0 24 24"><polyline points="20 6 9.5 17 4 11.5"/></svg>
                    </button>
                  )}
                  <button title="Excluir" className="p-0.5 hover:bg-red-100 rounded transition" onClick={() => handleDeleteCobranca(venda.id)}>
                    <svg width="18" height="18" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24"><rect x="5" y="7" width="14" height="12" rx="2"/><path d="M9 11v4M15 11v4M10 7V5a2 2 0 012-2h0a2 2 0 012 2v2"/></svg>
                  </button>
                </div>
              </td>
            ]}
          />
        )}
      </div>
      {/* Modal de baixa de pagamento */}
      {showBaixaModal && cobrancaBaixa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg relative">
            <button className="absolute top-2 right-2 text-slate-400 hover:text-red-500" onClick={() => setShowBaixaModal(false)}>&times;</button>
            <h3 className="text-xl font-bold mb-4">Dar baixa na cobrança</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Valor Previsto</label>
                <input type="text" value={cobrancaBaixa.valor} disabled className="w-full border rounded-lg px-4 py-2 bg-slate-100" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Valor Pago</label>
                <input type="number" value={formBaixa.valorPago} onChange={e => setFormBaixa(f => ({ ...f, valorPago: e.target.value }))} className="w-full border rounded-lg px-4 py-2" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Data do Pagamento</label>
                <input type="date" value={formBaixa.dataPagamento} onChange={e => setFormBaixa(f => ({ ...f, dataPagamento: e.target.value }))} className="w-full border rounded-lg px-4 py-2" />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="px-4 py-2 rounded bg-slate-100" onClick={() => setShowBaixaModal(false)}>Cancelar</button>
                <button type="button" className="px-4 py-2 rounded bg-green-600 text-white font-bold" onClick={handleConfirmarBaixa}>Confirmar Pagamento</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}