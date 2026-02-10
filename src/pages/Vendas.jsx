import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';

const livros = [
  "KIDS Book 1", "KIDS Book 2", "KIDS Book 3", "KIDS Book 4",
  "Teens Book 1", "Teens Book 2", "Teens Book 3", "Teens Book 4", "Teens Book 5", "Teens Book 6",
  "Adults Book 1", "Adults Book 2", "Adults Book 3", "Adults Book 4", "Adults Book 5", "Adults Book 6",
  "Business Book 1", "Business Book 2", "Business Book 3", "Business Book 4", "Business Book 5", "Business Book 6"
];

// Categorias de livros
const categoriasLivros = [
  { valor: 'KIDS', label: 'KIDS', maxBooks: 4 },
  { valor: 'Teens', label: 'Teens', maxBooks: 6 },
  { valor: 'Adults', label: 'Adults', maxBooks: 6 },
  { valor: 'Business', label: 'Business', maxBooks: 6 }
];

// Função para gerar números de livros baseado na categoria
const gerarNumerosLivros = (categoria) => {
  const categoriaInfo = categoriasLivros.find(c => c.valor === categoria);
  if (!categoriaInfo) return [];
  
  const numeros = [];
  for (let i = 1; i <= categoriaInfo.maxBooks; i++) {
    numeros.push({ valor: i.toString(), label: `Book ${i}` });
  }
  return numeros;
};

// URLs das imagens dos livros
const livroImages = {
  // KIDS Books
  "KIDS Book 1": "https://www.speakupcataguases.com/wp-content/uploads/2026/02/kids-book-1.png.png",
  "KIDS Book 2": "https://www.speakupcataguases.com/wp-content/uploads/2026/02/kids-book-2.png.png",
  "KIDS Book 3": "https://www.speakupcataguases.com/wp-content/uploads/2026/02/kids-book-3.png.png",
  "KIDS Book 4": "https://www.speakupcataguases.com/wp-content/uploads/2026/02/kids-book-4.png.png",
  
  // Teens Books
  "Teens Book 1": "https://www.speakupcataguases.com/wp-content/uploads/2026/02/CAPA-STUDENTS-BOOK-1.png",
  "Teens Book 2": "https://www.speakupcataguases.com/wp-content/uploads/2026/02/CAPA-BOOK-2.png", 
  "Teens Book 3": "https://www.speakupcataguases.com/wp-content/uploads/2026/02/CAPA-STUDENTS-BOOK-3.png",
  "Teens Book 4": "https://www.speakupcataguases.com/wp-content/uploads/2026/02/TEENS-STUDENTS-BOOK-4.png",
  "Teens Book 5": "https://via.placeholder.com/80x100?text=Teen+5",
  "Teens Book 6": "https://via.placeholder.com/80x100?text=Teen+6",
  
  // Adults Books
  "Adults Book 1": "https://via.placeholder.com/80x100?text=Adult+1",
  "Adults Book 2": "https://www.speakupcataguases.com/wp-content/uploads/2026/02/adults-book-2.png.png",
  "Adults Book 3": "https://via.placeholder.com/80x100?text=Adult+3",
  "Adults Book 4": "https://via.placeholder.com/80x100?text=Adult+4",
  "Adults Book 5": "https://via.placeholder.com/80x100?text=Adult+5",
  "Adults Book 6": "https://via.placeholder.com/80x100?text=Adult+6",
  
  // Business Books
  "Business Book 1": "https://via.placeholder.com/80x100?text=Biz+1",
  "Business Book 2": "https://via.placeholder.com/80x100?text=Biz+2",
  "Business Book 3": "https://via.placeholder.com/80x100?text=Biz+3",
  "Business Book 4": "https://via.placeholder.com/80x100?text=Biz+4",
  "Business Book 5": "https://via.placeholder.com/80x100?text=Biz+5",
  "Business Book 6": "https://via.placeholder.com/80x100?text=Biz+6"
};

function Vendas() {
  const [vendas, setVendas] = useState([]);
  const [estoque, setEstoque] = useState([]);
  
  // Simplified functions
  const showToast = (message, type) => {
    alert(message);
  };
  
  const showConfirm = (options) => {
    return Promise.resolve(confirm(options.message));
  };
  
  const validateVendaForm = (form) => ({ isValid: true, errors: [] });
  const validateEstoqueForm = (form) => ({ isValid: true, errors: [] });
  const sanitizeInput = (input) => input;
  
  const handleError = (err, context) => {
    console.error(`Erro em ${context}:`, err);
    alert(`Erro ao ${context}: ${err.message || 'Erro desconhecido'}`);
  };

  // Função auxiliar para verificar se documento existe antes de atualizar
  const verificarDocumentoExiste = async (collection_name, docId) => {
    try {
      const docRef = doc(db, collection_name, docId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (err) {
      return false;
    }
  };
  const [form, setForm] = useState({ 
    aluno: '', tipo: '', categoria: '', numeroLivro: '', livro: '', valor: '', pagamento: '', parcelas: '1/1', vencimento: ''
  });
  const [estoqueForm, setEstoqueForm] = useState({
    categoria: '', numeroLivro: '', livro: '', quantidade: '', estoqueMinimo: '5', precoCusto: '', precoVenda: ''
  });
  const [formView, setFormView] = useState({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEstoqueModal, setShowEstoqueModal] = useState(false);
  const [cobrancaView, setCobrancaView] = useState(null);
  const [editingEstoque, setEditingEstoque] = useState(null);
  const [filterAluno, setFilterAluno] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMes, setFilterMes] = useState('02'); // Mês atual (Fevereiro)
  const [filterAno, setFilterAno] = useState('2026'); // Ano atual
  
  // Filtros para estoque
  const [filterCategoriaEstoque, setFilterCategoriaEstoque] = useState('');
  const [ordenacaoEstoque, setOrdenacaoEstoque] = useState('categoria'); // categoria, nome, quantidade

  const [valorPago, setValorPago] = useState('');
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState(null);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  
  // Estados para controlar seções expandidas/recolhidas
  const [expandedSections, setExpandedSections] = useState({
    vendas: true,
    estoque: true,
    indicadores: true
  });

  // Funções para ações da tabela
  const abrirPagamentoParcela = (venda) => {
    setVendaSelecionada(venda);
    setValorPago(venda.valor);
    setShowPagamentoModal(true);
  };

  const processarPagamentoParcela = async () => {
    if (!vendaSelecionada || !valorPago) {
      showToast('Informe o valor pago', 'error');
      return;
    }

    const valorPagoNum = parseFloat(valorPago);
    if (isNaN(valorPagoNum) || valorPagoNum <= 0) {
      showToast('Valor pago deve ser maior que zero', 'error');
      return;
    }

    try {
      // Verificar se o documento ainda existe
      const documentoExiste = await verificarDocumentoExiste('vendas', vendaSelecionada.id);
      
      if (!documentoExiste) {
        showToast('Esta venda não existe mais no sistema. Recarregando dados...', 'error');
        // Recarregar dados para sincronizar
        const vendasRef = collection(db, 'vendas');
        const vendasSnap = await getDocs(vendasRef);
        const vendasData = vendasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setVendas(vendasData);
        setShowPagamentoModal(false);
        return;
      }

      await updateDoc(doc(db, 'vendas', vendaSelecionada.id), {
        status: 'pago',
        valorPago: valorPagoNum.toFixed(2),
        dataPagamento: new Date().toISOString()
      });
      
      setVendas(prev => 
        prev.map(v => 
          v.id === vendaSelecionada.id 
            ? { ...v, status: 'pago', valorPago: valorPagoNum.toFixed(2), dataPagamento: new Date().toISOString() }
            : v
        )
      );
      
      setShowPagamentoModal(false);
      setVendaSelecionada(null);
      setValorPago('');
      showToast('Pagamento registrado com sucesso!', 'success');
    } catch (err) {
      handleError(err, 'registrar pagamento');
    }
  };

  const imprimirRecibo = (venda) => {
    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recibo de Pagamento - SpeakUp</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #005DE4; padding-bottom: 20px; margin-bottom: 20px; }
          .info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .total { background-color: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          .status { color: #28a745; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="color: #005DE4;">SpeakUp Cataguases</h1>
          <h2>Recibo de Pagamento</h2>
        </div>
        
        <div class="info">
          <div>
            <strong>Aluno:</strong> ${venda.aluno}<br>
            <strong>Serviço:</strong> ${venda.tipo}<br>
            ${venda.livro ? `<strong>Material:</strong> ${venda.livro}<br>` : ''}
            <strong>Parcela:</strong> ${venda.parcelas}
          </div>
          <div>
            <strong>Vencimento:</strong> ${new Date(venda.vencimento).toLocaleDateString('pt-BR')}<br>
            <strong>Pagamento:</strong> ${venda.pagamento}<br>
            <strong>Data Pagamento:</strong> ${venda.dataPagamento ? new Date(venda.dataPagamento).toLocaleDateString('pt-BR') : 'Pendente'}<br>
            <strong>Status:</strong> <span class="status">${venda.status === 'pago' ? 'PAGO' : 'PENDENTE'}</span>
          </div>
        </div>
        
        <div class="total">
          <h3>Valor: R$ ${parseFloat(venda.valorPago || venda.valor).toFixed(2)}</h3>
        </div>
        
        <div class="footer">
          <p>Recibo gerado em ${new Date().toLocaleString('pt-BR')}</p>
          <p>SpeakUp Cataguases - Sistema de Gestão</p>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const abrirDetalhesVenda = (venda) => {
    setVendaSelecionada(venda);
    setShowDetalhesModal(true);
  };

  const cancelarCobranca = async (venda) => {
    const confirmou = await showConfirm({
      title: 'Cancelar Cobrança',
      message: `Tem certeza que deseja cancelar a cobrança de ${venda.aluno}?\nEsta ação não pode ser desfeita.`,
      type: 'danger',
      confirmText: 'Cancelar Cobrança',
      cancelText: 'Manter'
    });
    
    if (!confirmou) return;

    try {
      await updateDoc(doc(db, 'vendas', venda.id), {
        status: 'cancelado',
        dataCancelamento: new Date().toISOString()
      });
      
      setVendas(prev => 
        prev.map(v => 
          v.id === venda.id 
            ? { ...v, status: 'cancelado', dataCancelamento: new Date().toISOString() }
            : v
        )
      );
      
      showToast('Cobrança cancelada com sucesso', 'success');
    } catch (err) {
      handleError(err, 'cancelar cobrança');
    }
  };

  const expandirSecao = (secao) => {
    setExpandedSections(prev => ({
      ...prev,
      [secao]: !prev[secao]
    }));
  };

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const vendasRef = collection(db, 'vendas');
        const estoqueRef = collection(db, 'estoque');
        
        const [vendasSnap, estoqueSnap] = await Promise.all([
          getDocs(vendasRef),
          getDocs(estoqueRef)
        ]);
        
        const vendasData = vendasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const estoqueData = estoqueSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setVendas(vendasData);
        setEstoque(estoqueData);
      } catch (err) {
        handleError(err, 'carregar dados');
      }
    };

    carregarDados();
  }, []);

  // Função para atualizar livro completo quando categoria ou número mudam
  const atualizarLivroCompleto = (categoria, numero, isEstoque = false) => {
    const livroCompleto = categoria && numero ? `${categoria} Book ${numero}` : '';
    
    if (isEstoque) {
      setEstoqueForm(prev => ({ ...prev, livro: livroCompleto }));
    } else {
      setForm(prev => ({ ...prev, livro: livroCompleto }));
    }
  };

  const deletarCobranca = async (cobrancaId, cobrancaInfo) => {
    if (!cobrancaId) return;

    const confirmou = await showConfirm({
      title: 'Deletar Venda',
      message: `Tem certeza que deseja deletar a venda de ${cobrancaInfo.aluno}?`,
      type: 'danger',
      confirmText: 'Deletar',
      cancelText: 'Cancelar'
    });
    
    if (!confirmou) return;

    try {
      await deleteDoc(doc(db, 'vendas', cobrancaId));
      setVendas(prev => prev.filter(v => v.id !== cobrancaId));
      showToast('Venda deletada com sucesso!', 'success');
    } catch (err) {
      handleError(err, 'deletar venda');
    }
  };

  const abrirEdicaoCobranca = (cobranca) => {
    setCobrancaView(cobranca);
    setFormView({
      aluno: cobranca.aluno || '',
      tipo: cobranca.tipo || '',
      livro: cobranca.livro || '',
      valor: cobranca.valor || '',
      pagamento: cobranca.pagamento || '',
      parcelas: cobranca.parcelas || '',
      vencimento: cobranca.vencimento || '',
      status: cobranca.status || 'pendente'
    });
    setShowViewModal(true);
  };

  const handleSalvarEdicao = async () => {
    if (!cobrancaView?.id) return;

    // Validações básicas
    const validation = validateVendaForm(formView);
    if (!validation.isValid) {
      showToast(`Erro: ${validation.errors.join(', ')}`, 'error');
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'vendas', cobrancaView.id), {
        aluno: formView.aluno.trim(),
        tipo: formView.tipo,
        livro: formView.livro || '',
        valor: formView.valor.toString(),
        pagamento: formView.pagamento,
        vencimento: formView.vencimento,
        updatedAt: new Date().toISOString()
      });

      // Atualizar estado local
      setVendas(prev => 
        prev.map(v => 
          v.id === cobrancaView.id 
            ? { ...v, ...formView, valor: formView.valor.toString() }
            : v
        )
      );

      setShowViewModal(false);
      showToast('Venda atualizada com sucesso!', 'success');
    } catch (err) {
      handleError(err, 'salvar edição');
    } finally {
      setLoading(false);
    }
  };

  const marcarComoPago = async (cobrancaId) => {
    if (!cobrancaId) return;
    
    try {
      // Verificar se o documento ainda existe
      const documentoExiste = await verificarDocumentoExiste('vendas', cobrancaId);
      
      if (!documentoExiste) {
        showToast('Esta venda não existe mais no sistema. Recarregando dados...', 'error');
        // Recarregar dados para sincronizar
        const vendasRef = collection(db, 'vendas');
        const vendasSnap = await getDocs(vendasRef);
        const vendasData = vendasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setVendas(vendasData);
        return;
      }

      await updateDoc(doc(db, 'vendas', cobrancaId), {
        status: 'pago',
        dataPagamento: new Date().toISOString()
      });
      
      setVendas(prev => 
        prev.map(v => 
          v.id === cobrancaId 
            ? { ...v, status: 'pago', dataPagamento: new Date().toISOString() }
            : v
        )
      );
      
      showToast('Venda marcada como paga!', 'success');
    } catch (err) {
      handleError(err, 'marcar como pago');
    }
  };

  // Filtros otimizados com useMemo para performance
  const vendasFiltradas = useMemo(() => {
    return vendas.filter(venda => {
      const filtroAluno = !filterAluno || venda.aluno.toLowerCase().includes(filterAluno.toLowerCase());
      const filtroStatus = !filterStatus || venda.status === filterStatus;
      
      // Filtro por mês e ano (baseado na data de vencimento para parcelas individuais)
      let filtroData = true;
      if ((filterMes && filterAno) || filterMes || filterAno) {
        const dataVenda = venda.vencimento ? venda.vencimento.slice(0, 10) : ''; // YYYY-MM-DD
        const anoVenda = dataVenda.slice(0, 4); // YYYY
        const mesVenda = dataVenda.slice(5, 7); // MM
        
        const filtroMesMatch = !filterMes || mesVenda === filterMes;
        const filtroAnoMatch = !filterAno || anoVenda === filterAno;
        
        filtroData = filtroMesMatch && filtroAnoMatch;
      }
      
      return filtroAluno && filtroStatus && filtroData;
    });
  }, [vendas, filterAluno, filterStatus, filterMes, filterAno]);
  
  // Para os indicadores, usar filtro por data de criação das vendas
  const vendasFiltradasParaIndicadores = useMemo(() => {
    return vendas.filter(venda => {
      // Filtro por mês e ano (baseado na data de criação para vendas únicas)
      let filtroData = true;
      if ((filterMes && filterAno) || filterMes || filterAno) {
        // Usar createdAt se existir, senão usar vencimento como fallback
        const dataReferencia = venda.createdAt || venda.vencimento || '';
        const dataVenda = dataReferencia.slice(0, 10); // YYYY-MM-DD
        const anoVenda = dataVenda.slice(0, 4); // YYYY
        const mesVenda = dataVenda.slice(5, 7); // MM
        
        const filtroMesMatch = !filterMes || mesVenda === filterMes;
        const filtroAnoMatch = !filterAno || anoVenda === filterAno;
        
        filtroData = filtroMesMatch && filtroAnoMatch;
      }
      
      return filtroData;
    });
  }, [vendas, filterMes, filterAno]);

  const hoje = new Date().toISOString().slice(0, 10);
  const vendasVencidas = vendasFiltradas.filter(v => v.status === 'pendente' && v.vencimento < hoje);
  const vendasVencendoHoje = vendasFiltradas.filter(v => v.status === 'pendente' && v.vencimento === hoje);

  // Gerar opções de meses e anos para os dropdowns
  const gerarOpcoesMeses = () => {
    return [
      { valor: '01', label: 'Janeiro' },
      { valor: '02', label: 'Fevereiro' },
      { valor: '03', label: 'Março' },
      { valor: '04', label: 'Abril' },
      { valor: '05', label: 'Maio' },
      { valor: '06', label: 'Junho' },
      { valor: '07', label: 'Julho' },
      { valor: '08', label: 'Agosto' },
      { valor: '09', label: 'Setembro' },
      { valor: '10', label: 'Outubro' },
      { valor: '11', label: 'Novembro' },
      { valor: '12', label: 'Dezembro' }
    ];
  };
  
  const gerarOpcoesAnos = () => {
    const anoAtual = new Date().getFullYear();
    const anos = [];
    
    // Adicionar 3 anos anteriores, ano atual e 3 anos futuros
    for (let i = anoAtual - 3; i <= anoAtual + 3; i++) {
      anos.push({ valor: i.toString(), label: i.toString() });
    }
    
    return anos;
  };

  // Função para lidar com estoque
  const handleSalvarEstoque = async () => {
    // Validação usando hook
    const validation = validateEstoqueForm(estoqueForm);
    if (!validation.isValid) {
      showToast(`Erro: ${validation.errors.join(', ')}`, 'error');
      return;
    }

    const quantidade = parseInt(estoqueForm.quantidade);
    const estoqueMinimo = parseInt(estoqueForm.estoqueMinimo);
    const precoCusto = parseFloat(estoqueForm.precoCusto);
    const precoVenda = parseFloat(estoqueForm.precoVenda);

    setLoading(true);
    try {
      if (editingEstoque) {
        // Editar item existente
        await updateDoc(doc(db, 'estoque', editingEstoque.id), {
          quantidade,
          estoqueMinimo,
          precoCusto: precoCusto.toFixed(2),
          precoVenda: precoVenda.toFixed(2),
          updatedAt: new Date().toISOString()
        });

        setEstoque(prev => 
          prev.map(item => 
            item.id === editingEstoque.id 
              ? { ...item, quantidade, estoqueMinimo, precoCusto: precoCusto.toFixed(2), precoVenda: precoVenda.toFixed(2) }
              : item
          )
        );

        showToast('Item do estoque atualizado com sucesso!', 'success');
      } else {
        // Verificar se já existe o livro no estoque
        const itemExistente = estoque.find(item => item.livro === estoqueForm.livro);
        if (itemExistente) {
          showToast('Este livro já está cadastrado no estoque!', 'warning');
          return;
        }

        // Adicionar novo item
        const novoItem = {
          livro: estoqueForm.livro,
          quantidade,
          estoqueMinimo,
          precoCusto: precoCusto.toFixed(2),
          precoVenda: precoVenda.toFixed(2),
          createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'estoque'), novoItem);
        setEstoque(prev => [...prev, { id: docRef.id, ...novoItem }]);

        showToast('Item adicionado ao estoque com sucesso!', 'success');
      }

      setShowEstoqueModal(false);
      setEditingEstoque(null);
      setEstoqueForm({ livro: '', quantidade: '', estoqueMinimo: '5', precoCusto: '', precoVenda: '' });
    } catch (err) {
      handleError(err, 'salvar item do estoque');
    } finally {
      setLoading(false);
    }
  };

  const editarEstoque = (item) => {
    setEditingEstoque(item);
    setEstoqueForm({
      livro: item.livro,
      quantidade: item.quantidade.toString(),
      estoqueMinimo: item.estoqueMinimo?.toString() || '5',
      precoCusto: item.precoCusto?.toString() || '',
      precoVenda: item.precoVenda?.toString() || ''
    });
    setShowEstoqueModal(true);
  };

  const deletarEstoque = async (itemId, livro) => {
    const confirmacao = confirm(`Tem certeza que deseja deletar "${livro}" do estoque?`);
    if (!confirmacao) return;

    try {
      await deleteDoc(doc(db, 'estoque', itemId));
      setEstoque(prev => prev.filter(item => item.id !== itemId));
      showToast('Item removido do estoque com sucesso!', 'success');
    } catch (err) {
      handleError(err, 'deletar item do estoque');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Sistema de Vendas</h1>

        {/* Seção de Indicadores Rápidos */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => expandirSecao('indicadores')} 
              className="flex items-center gap-2 text-xl font-semibold text-gray-700"
            >
              📊 Indicadores Rápidos
              <svg 
                className={`w-5 h-5 transition-transform ${expandedSections.indicadores ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expandedSections.indicadores && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">Período:</span>
                <select
                  value={filterMes}
                  onChange={(e) => setFilterMes(e.target.value)}
                  className="border rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                >
                  <option value="">Todos os meses</option>
                  {gerarOpcoesMeses().map(({ valor, label }) => (
                    <option key={valor} value={valor}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  value={filterAno}
                  onChange={(e) => setFilterAno(e.target.value)}
                  className="border rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                >
                  <option value="">Todos os anos</option>
                  {gerarOpcoesAnos().map(({ valor, label }) => (
                    <option key={valor} value={valor}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          {expandedSections.indicadores && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
              {(() => {
                const hoje = new Date().toISOString().slice(0, 10);
                
                console.log('=== DEBUG KPIs ===');
                console.log('Filtros ativos:', { filterMes, filterAno, filterAluno });
                console.log('Total vendas no sistema:', vendas.length);
                console.log('Vendas filtradas para indicadores:', vendasFiltradasParaIndicadores.length);
                
                // Debug: verificar vendas de fevereiro 2026
                const vendasFev2026 = vendas.filter(v => {
                  const dataRef = v.createdAt || v.vencimento || '';
                  const data = dataRef.slice(0, 10);
                  return data.startsWith('2026-02');
                });
                console.log('Vendas de Fevereiro 2026:', vendasFev2026);
                console.log('Vendas pagas em Fev 2026:', vendasFev2026.filter(v => v.status === 'pago'));
                
                // Aplicar filtro de aluno nas vendas individuais para cálculos de valor
                const vendasComFiltroAluno = vendasFiltradasParaIndicadores.filter(venda => {
                  return !filterAluno || venda.aluno.toLowerCase().includes(filterAluno.toLowerCase());
                });
                
                console.log('Vendas após filtro de aluno:', vendasComFiltroAluno.length);
                
                // Agrupar vendas para identificar vendas únicas (não contar parcelas como vendas separadas)
                const vendasUnicas = new Map();
                
                vendasComFiltroAluno.forEach(venda => {
                  // Usar createdAt se disponível, senão usar vencimento como fallback
                  const dataReferencia = venda.createdAt || venda.vencimento || '';
                  const dataBase = dataReferencia.slice(0, 10);
                  // Chave única: aluno + tipo + livro + data de criação para identificar uma venda original
                  const chaveUnica = `${venda.aluno}-${venda.tipo}-${venda.livro || ''}-${dataBase}`;
                  
                  if (!vendasUnicas.has(chaveUnica)) {
                    vendasUnicas.set(chaveUnica, {
                      ...venda,
                      valorTotal: parseFloat(venda.valor || 0)
                    });
                  } else {
                    // Se já existe, somar o valor das parcelas
                    const vendaExistente = vendasUnicas.get(chaveUnica);
                    vendaExistente.valorTotal += parseFloat(venda.valor || 0);
                  }
                });
                
                const totalVendasGeradas = vendasUnicas.size;
                const totalPrevisto = vendasComFiltroAluno.reduce((acc, v) => acc + parseFloat(v.valor || 0), 0);
                const valorPago = vendasComFiltroAluno.filter(v => v.status === 'pago').reduce((acc, v) => acc + parseFloat(v.valor || 0), 0);
                const valorPendente = vendasComFiltroAluno.filter(v => v.status === 'pendente').reduce((acc, v) => acc + parseFloat(v.valor || 0), 0);
                const cobrancasAtrasadas = vendasComFiltroAluno.filter(v => v.status === 'pendente' && v.vencimento < hoje).length;
                
                console.log('KPIs calculados:', {
                  totalVendasGeradas,
                  totalPrevisto: totalPrevisto.toFixed(2),
                  valorPago: valorPago.toFixed(2),
                  valorPendente: valorPendente.toFixed(2),
                  cobrancasAtrasadas
                });
                console.log('Vendas pagas encontradas:', vendasComFiltroAluno.filter(v => v.status === 'pago'));
                console.log('=== FIM DEBUG ===');

                return [
                  { titulo: 'Vendas Geradas', valor: totalVendasGeradas, cor: 'bg-blue-500', icone: '🛒' },
                  { titulo: 'Total Previsto', valor: `R$ ${totalPrevisto.toFixed(2)}`, cor: 'bg-purple-500', icone: '💰' },
                  { titulo: 'Valor Pago', valor: `R$ ${valorPago.toFixed(2)}`, cor: 'bg-green-500', icone: '✅' },
                  { titulo: 'Valor Pendente', valor: `R$ ${valorPendente.toFixed(2)}`, cor: 'bg-yellow-500', icone: '⏳' },
                  { titulo: 'Cobranças Atrasadas', valor: cobrancasAtrasadas, cor: 'bg-red-500', icone: '⚠️' }
                ].map((indicador, idx) => (
                  <div key={idx} className="bg-white border border-gray-100 rounded-lg p-4 relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-16 h-16 ${indicador.cor} opacity-10 rounded-full -mr-8 -mt-8`}></div>
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <h3 className="text-sm text-gray-500 font-medium">{indicador.titulo}</h3>
                        <p className="text-2xl font-bold text-gray-800">{indicador.valor}</p>
                      </div>
                      <div className="text-3xl">{indicador.icone}</div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Controle de Estoque */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => expandirSecao('estoque')} 
              className="flex items-center gap-2 text-xl font-semibold text-gray-700"
            >
              📦 Controle de Estoque
              <svg 
                className={`w-5 h-5 transition-transform ${expandedSections.estoque ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.estoque && (
              <button 
                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors font-medium"
                onClick={() => setShowEstoqueModal(true)}
              >
                + Adicionar ao Estoque
              </button>
            )}
          </div>

          {expandedSections.estoque && (
            <>
              {/* Filtros do Estoque */}
              <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Categoria</label>
                  <select
                    value={filterCategoriaEstoque}
                    onChange={(e) => setFilterCategoriaEstoque(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todas as categorias</option>
                    {categoriasLivros.map(categoria => (
                      <option key={categoria.valor} value={categoria.valor}>
                        {categoria.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-1 min-w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organizar por</label>
                  <select
                    value={ordenacaoEstoque}
                    onChange={(e) => setOrdenacaoEstoque(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="categoria">Categoria</option>
                    <option value="nome">Nome do Livro</option>
                    <option value="quantidade">Quantidade</option>
                    <option value="estoqueBaixo">Estoque Baixo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {(() => {
                  // Se não há itens no estoque, mostrar mensagem inicial
                  if (estoque.length === 0) {
                    return (
                      <div className="col-span-full text-center py-8 text-gray-500">
                        <div className="text-6xl mb-4">📚</div>
                        <p>Nenhum item no estoque ainda.</p>
                        <p className="text-sm">Adicione livros para começar o controle de estoque.</p>
                      </div>
                    );
                  }
                  
                  // Filtrar estoque por categoria
                  let estoqueFiltrado = estoque.filter(item => {
                    if (filterCategoriaEstoque) {
                      // Extrair categoria do nome do livro
                      const categoriaItem = item.livro.includes('KIDS') ? 'KIDS' :
                                           item.livro.includes('Teens') ? 'Teens' :
                                           item.livro.includes('Adults') ? 'Adults' :
                                           item.livro.includes('Business') ? 'Business' : '';
                      return categoriaItem === filterCategoriaEstoque;
                    }
                    return true;
                  });
                  
                  // Ordenar estoque
                  estoqueFiltrado.sort((a, b) => {
                    if (ordenacaoEstoque === 'categoria') {
                      const catA = a.livro.includes('KIDS') ? 'KIDS' :
                                   a.livro.includes('Teens') ? 'Teens' :
                                   a.livro.includes('Adults') ? 'Adults' :
                                   a.livro.includes('Business') ? 'Business' : 'ZZZ';
                      const catB = b.livro.includes('KIDS') ? 'KIDS' :
                                   b.livro.includes('Teens') ? 'Teens' :
                                   b.livro.includes('Adults') ? 'Adults' :
                                   b.livro.includes('Business') ? 'Business' : 'ZZZ';
                      return catA.localeCompare(catB);
                    } else if (ordenacaoEstoque === 'nome') {
                      return a.livro.localeCompare(b.livro);
                    } else if (ordenacaoEstoque === 'quantidade') {
                      return parseInt(b.quantidade) - parseInt(a.quantidade);
                    } else if (ordenacaoEstoque === 'estoqueBaixo') {
                      const baixoA = a.quantidade <= (a.estoqueMinimo || 5);
                      const baixoB = b.quantidade <= (b.estoqueMinimo || 5);
                      return baixoB - baixoA; // Estoque baixo primeiro
                    }
                    return 0;
                  });
                  
                  return estoqueFiltrado.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      <div className="text-6xl mb-4">📚</div>
                      <p>Nenhum item encontrado.</p>
                      <p className="text-sm">Tente ajustar os filtros para ver os itens.</p>
                    </div>
                  ) : (
                    estoqueFiltrado.map(item => {
                      const imagemUrl = livroImages[item.livro] || "https://via.placeholder.com/80x100?text=Livro";
                      const isEstoqueBaixo = item.quantidade <= (item.estoqueMinimo || 5);
                      
                      return (
                        <div key={item.id} className={`border rounded-lg p-4 ${isEstoqueBaixo ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'} transition-all hover:shadow-md`}>
                          {/* Layout com imagem grande à esquerda */}
                          <div className="space-y-2">
                            {/* Título no topo */}
                            <h3 className="font-bold text-gray-800 text-base text-center">{item.livro}</h3>
                            
                            <div className="flex gap-3">
                              {/* Imagem grande do livro */}
                              <div className="flex-shrink-0">
                                <img 
                                  src={imagemUrl} 
                                  alt={item.livro}
                                  className="w-28 h-36 object-cover rounded-lg border border-gray-200 shadow-lg"
                                  onError={(e) => {
                                    e.target.src = "https://via.placeholder.com/112x144?text=Livro";
                                  }}
                                />
                              </div>
                              
                              {/* Informações à direita */}
                              <div className="flex-1 space-y-2">
                                <div className="grid grid-cols-2 gap-y-2 gap-x-1">
                                  <div>
                                    <span className="text-gray-600 text-xs block mb-1">Quantidade:</span>
                                    <span className={`text-xl font-bold ${isEstoqueBaixo ? 'text-red-600' : 'text-green-600'}`}>
                                      {item.quantidade}
                                    </span>
                                  </div>
                                  
                                  <div>
                                    <span className="text-gray-600 text-xs block mb-1">Estoque Mín:</span>
                                    <span className="text-lg font-semibold text-gray-700">{item.estoqueMinimo || 5}</span>
                                  </div>
                                  
                                  <div>
                                    <span className="text-gray-600 text-xs block mb-1">Custo:</span>
                                    <span className="text-sm font-medium text-gray-700">R$ {item.precoCusto || '0.00'}</span>
                                  </div>
                                  
                                  <div>
                                    <span className="text-gray-600 text-xs block mb-1">Venda:</span>
                                    <span className="text-sm font-bold text-green-600">R$ {item.precoVenda || '0.00'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {isEstoqueBaixo && (
                              <div className="flex items-center justify-center gap-1 py-1 text-xs text-red-600 bg-red-100 rounded-md">
                                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path d="M12 9v3.75m0 3.75h.007v.008H12V12z"/>
                                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span className="font-medium">Estoque baixo!</span>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <button
                                onClick={() => editarEstoque(item)}
                                className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-blue-600 transition-colors font-medium"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => deletarEstoque(item.id, item.livro)}
                                className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-600 transition-colors font-medium"
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  );
                })()}
              </div>
              </>
            )}
        </div>

        {/* Seção de Vendas */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => expandirSecao('vendas')} 
                className="flex items-center gap-2 text-xl font-semibold text-gray-700"
              >
                💰 Vendas Realizadas
                <svg 
                  className={`w-5 h-5 transition-transform ${expandedSections.vendas ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const vendasRef = collection(db, 'vendas');
                    const estoqueRef = collection(db, 'estoque');
                    
                    const [vendasSnap, estoqueSnap] = await Promise.all([
                      getDocs(vendasRef),
                      getDocs(estoqueRef)
                    ]);
                    
                    const vendasData = vendasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    const estoqueData = estoqueSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    
                    setVendas(vendasData);
                    setEstoque(estoqueData);
                    showToast('Dados recarregados!', 'success');
                  } catch (err) {
                    handleError(err, 'recarregar dados');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-2 py-1 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                title="Recarregar dados"
              >
                🔄
              </button>
            </div>
            {expandedSections.vendas && (
              <button 
                className="bg-[#005DE4] text-white px-4 py-2 rounded-lg hover:bg-[#004BB8] transition-colors font-medium"
                onClick={() => setShowModal(true)}
              >
                + Nova Venda
              </button>
            )}
          </div>

          {expandedSections.vendas && (
            <div className="space-y-4">
              {/* Debug info */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <p><strong>Debug:</strong> Total vendas: {vendas.length} | Filtradas: {vendasFiltradas.length}</p>
                <p>Pendentes: {vendas.filter(v => v.status === 'pendente').length} | Pagas: {vendas.filter(v => v.status === 'pago').length}</p>
                {vendas.length === 0 && (
                  <button 
                    onClick={async () => {
                      try {
                        await addDoc(collection(db, 'vendas'), {
                          aluno: 'Teste Usuario',
                          tipo: 'Mensalidade',
                          livro: '',
                          valor: '100.00',
                          pagamento: 'PIX',
                          parcelas: '1/1',
                          vencimento: '2026-02-15',
                          status: 'pendente',
                          createdAt: new Date().toISOString()
                        });
                        // Recarregar dados
                        const vendasRef = collection(db, 'vendas');
                        const vendasSnap = await getDocs(vendasRef);
                        const vendasData = vendasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        setVendas(vendasData);
                        showToast('Venda de teste criada!', 'success');
                      } catch (err) {
                        handleError(err, 'criar venda teste');
                      }
                    }}
                    className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-sm"
                  >
                    Criar Venda Teste
                  </button>
                )}
              </div>

              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Filtrar por aluno..."
                  value={filterAluno}
                  onChange={(e) => setFilterAluno(e.target.value)}
                  className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                >
                  <option value="">Todos os status</option>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <select
                  value={filterMes}
                  onChange={(e) => setFilterMes(e.target.value)}
                  className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                >
                  <option value="">Todos os meses</option>
                  {gerarOpcoesMeses().map(({ valor, label }) => (
                    <option key={valor} value={valor}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  value={filterAno}
                  onChange={(e) => setFilterAno(e.target.value)}
                  className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                >
                  <option value="">Todos os anos</option>
                  {gerarOpcoesAnos().map(({ valor, label }) => (
                    <option key={valor} value={valor}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contador de Vendas */}
              {vendasFiltradas.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 font-semibold">📊 Resultados:</span>
                      <span className="text-blue-800 font-bold">{vendasFiltradas.length} venda(s) encontrada(s)</span>
                    </div>
                    <div className="text-sm text-blue-600">
                      {(() => {
                        const totalValor = vendasFiltradas.reduce((sum, venda) => sum + parseFloat(venda.valor), 0);
                        const totalPago = vendasFiltradas.reduce((sum, venda) => sum + parseFloat(venda.valorPago || 0), 0);
                        return `Total: R$ ${totalValor.toFixed(2)} | Pago: R$ ${totalPago.toFixed(2)}`;
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Tabela de Vendas Responsiva */}
              {vendasFiltradas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-6xl mb-4">🛒</div>
                  <p>Nenhuma venda encontrada.</p>
                  <p className="text-sm mt-2">
                    Total de vendas no sistema: {vendas.length} | 
                    Filtros ativos: {filterStatus || 'Todos'} | {filterAluno || 'Todos alunos'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Versão Desktop - Tabela Completa */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full bg-white rounded-lg shadow-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Aluno (Responsável)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Material Didático
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vencimento
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Valor Parcela
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Valor Pago
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {vendasFiltradas.map(venda => {
                          const dataVencimento = new Date(venda.vencimento);
                          const hoje = new Date();
                          const isVencida = venda.status === 'pendente' && dataVencimento < hoje;
                          
                          return (
                            <tr key={venda.id} className={`hover:bg-gray-50 ${
                              venda.status === 'pago' ? 'bg-green-50' : 
                              venda.status === 'cancelado' ? 'bg-red-50' :
                              isVencida ? 'bg-yellow-50' : ''
                            }`}>
                              {/* Aluno (Responsável) */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{venda.aluno}</div>
                                <div className="text-sm text-gray-500">{venda.tipo}</div>
                                <div className="text-xs text-gray-400">Parcela {venda.parcelas}</div>
                              </td>
                              
                              {/* Material Didático */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {venda.livro || '-'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {venda.pagamento}
                                </div>
                              </td>
                              
                              {/* Vencimento */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className={`text-sm ${
                                  isVencida ? 'text-red-600 font-medium' : 'text-gray-900'
                                }`}>
                                  {dataVencimento.toLocaleDateString('pt-BR')}
                                </div>
                                {isVencida && (
                                  <div className="text-xs text-red-500 font-medium">
                                    Vencida
                                  </div>
                                )}
                              </td>
                              
                              {/* Valor Parcela */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  R$ {parseFloat(venda.valor).toFixed(2)}
                                </div>
                              </td>
                              
                              {/* Valor Pago */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {venda.valorPago ? `R$ ${parseFloat(venda.valorPago).toFixed(2)}` : '-'}
                                </div>
                                {venda.dataPagamento && (
                                  <div className="text-xs text-gray-500">
                                    {new Date(venda.dataPagamento).toLocaleDateString('pt-BR')}
                                  </div>
                                )}
                              </td>
                              
                              {/* Status */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  venda.status === 'pago' ? 'bg-green-100 text-green-800' :
                                  venda.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                                  isVencida ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {venda.status === 'pago' ? '✓ Pago' :
                                   venda.status === 'cancelado' ? '✗ Cancelado' :
                                   isVencida ? '⚠ Vencida' : '◐ Pendente'}
                                </span>
                              </td>
                              
                              {/* Ações */}
                              <td className="px-4 py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center space-x-0">
                                  {/* Dar Baixa Personalizada */}
                                  {venda.status === 'pendente' && (
                                    <button
                                      onClick={() => abrirPagamentoParcela(venda)}
                                      className="text-green-600 hover:text-green-800 hover:bg-green-100 p-2 rounded-full transition-colors text-sm"
                                      title="Dar Baixa"
                                    >
                                      💰
                                    </button>
                                  )}
                                  
                                  {/* Imprimir Recibo */}
                                  <button
                                    onClick={() => imprimirRecibo(venda)}
                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-2 rounded-full transition-colors text-sm"
                                    title="Imprimir Recibo"
                                  >
                                    🖨️
                                  </button>
                                  
                                  {/* Ver Detalhes (Lupa) */}
                                  <button
                                    onClick={() => abrirDetalhesVenda(venda)}
                                    className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 p-2 rounded-full transition-colors text-sm"
                                    title="Ver Detalhes"
                                  >
                                    🔍
                                  </button>
                                  
                                  {/* Editar */}
                                  {venda.status !== 'cancelado' && (
                                    <button
                                      onClick={() => abrirEdicaoCobranca(venda)}
                                      className="text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 p-2 rounded-full transition-colors text-sm"
                                      title="Editar"
                                    >
                                      ✏️
                                    </button>
                                  )}
                                  
                                  {/* Cancelar Cobrança */}
                                  {venda.status === 'pendente' && (
                                    <button
                                      onClick={() => cancelarCobranca(venda)}
                                      className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-full transition-colors text-sm"
                                      title="Cancelar Cobrança"
                                    >
                                      ❌
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Versão Mobile - Cards */}
                  <div className="md:hidden space-y-4">
                    {vendasFiltradas.map(venda => {
                      const dataVencimento = new Date(venda.vencimento);
                      const hoje = new Date();
                      const isVencida = venda.status === 'pendente' && dataVencimento < hoje;
                      
                      return (
                        <div key={venda.id} className={`border rounded-lg p-4 ${
                          venda.status === 'pago' ? 'border-green-200 bg-green-50' : 
                          venda.status === 'cancelado' ? 'border-red-200 bg-red-50' :
                          isVencida ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'
                        }`}>
                          {/* Header Card */}
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-800">{venda.aluno}</h3>
                              <p className="text-sm text-gray-600">{venda.tipo}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                              venda.status === 'pago' ? 'bg-green-100 text-green-800' :
                              venda.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                              isVencida ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {venda.status === 'pago' ? '✓ Pago' :
                               venda.status === 'cancelado' ? '✗ Cancelado' :
                               isVencida ? '⚠ Vencida' : '◐ Pendente'}
                            </span>
                          </div>
                          
                          {/* Info Grid */}
                          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                            <div>
                              <span className="text-gray-500">Material:</span>
                              <p className="font-medium">{venda.livro || '-'}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Vencimento:</span>
                              <p className={`font-medium ${isVencida ? 'text-red-600' : ''}`}>
                                {dataVencimento.toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">Valor Parcela:</span>
                              <p className="font-bold text-blue-600">R$ {parseFloat(venda.valor).toFixed(2)}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Valor Pago:</span>
                              <p className="font-medium text-green-600">
                                {venda.valorPago ? `R$ ${parseFloat(venda.valorPago).toFixed(2)}` : '-'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Ações Mobile */}
                          <div className="flex gap-2 justify-center flex-wrap">
                            {venda.status === 'pendente' && (
                              <>
                                <button
                                  onClick={() => abrirPagamentoParcela(venda)}
                                  className="bg-green-500 text-white px-3 py-2 rounded-lg text-xs hover:bg-green-600 transition-colors flex items-center gap-1"
                                  title="Dar Baixa Personalizada"
                                >
                                  💰 Baixa
                                </button>
                                <button
                                  onClick={() => marcarComoPago(venda.id)}
                                  className="bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs hover:bg-emerald-600 transition-colors flex items-center gap-1"
                                  title="Marcar Pago"
                                >
                                  ✓ Pago
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => imprimirRecibo(venda)}
                              className="bg-blue-500 text-white px-3 py-2 rounded-lg text-xs hover:bg-blue-600 transition-colors flex items-center gap-1"
                            >
                              🖨️ Recibo
                            </button>
                            <button
                              onClick={() => abrirDetalhesVenda(venda)}
                              className="bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs hover:bg-indigo-600 transition-colors flex items-center gap-1"
                            >
                              🔍 Ver
                            </button>
                            {venda.status !== 'cancelado' && (
                              <button
                                onClick={() => abrirEdicaoCobranca(venda)}
                                className="bg-yellow-500 text-white px-3 py-2 rounded-lg text-xs hover:bg-yellow-600 transition-colors flex items-center gap-1"
                              >
                                ✏️ Editar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Nova Venda */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg relative">
            <button className="absolute top-2 right-2 text-slate-400 hover:text-red-500" onClick={() => setShowModal(false)}>&times;</button>
            <h3 className="text-xl font-bold mb-4">Nova Venda</h3>
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              
              // Validações
              if (!form.aluno?.trim() || !form.tipo || !form.valor || !form.pagamento || !form.vencimento) {
                showToast('Preencha todos os campos obrigatórios!', 'error');
                return;
              }
              
              if (form.tipo === 'Material Didático' && !form.livro) {
                showToast('Selecione o livro para Material Didático!', 'error');
                return;
              }
              
              const valor = parseFloat(form.valor);
              if (isNaN(valor) || valor <= 0) {
                showToast('Digite um valor válido!', 'error');
                return;
              }
              
              setLoading(true);
              try {
                const totalParcelas = parseInt(form.parcelas.split('/')[0]) || 1;
                const valorParcela = (valor / totalParcelas).toFixed(2);
                
                for (let i = 1; i <= totalParcelas; i++) {
                  const dataVencimento = new Date(form.vencimento);
                  dataVencimento.setMonth(dataVencimento.getMonth() + (i - 1));
                  
                  await addDoc(collection(db, 'vendas'), {
                    aluno: form.aluno.trim(),
                    tipo: form.tipo,
                    livro: form.livro || '',
                    valor: valorParcela,
                    pagamento: form.pagamento,
                    parcelas: `${i}/${totalParcelas}`,
                    vencimento: dataVencimento.toISOString().slice(0, 10),
                    status: 'pendente',
                    createdAt: new Date().toISOString()
                  });
                }
                
                setForm({ aluno: '', tipo: '', livro: '', valor: '', pagamento: '', parcelas: '1/1', vencimento: '' });
                setShowModal(false);
                showToast(`Venda criada com ${totalParcelas} parcela(s)!`, 'success');
                
                // Recarregar dados
                const vendasRef = collection(db, 'vendas');
                const vendasSnap = await getDocs(vendasRef);
                const vendasData = vendasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setVendas(vendasData);
                
              } catch (err) {
                handleError(err, 'criar venda');
              } finally {
                setLoading(false);
              }
            }}>
              <div>
                <label className="block text-sm font-semibold mb-1">Nome do Aluno *</label>
                <input
                  type="text"
                  value={form.aluno || ''}
                  onChange={e => setForm(f => ({ ...f, aluno: e.target.value }))}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Tipo de Compra *</label>
                <select
                  value={form.tipo || ''}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value, livro: '' }))}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                  required
                >
                  <option value="">Selecione o tipo</option>
                  <option value="Material Didático">Material Didático</option>
                  <option value="Uniforme">Uniforme</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              
              {form.tipo === 'Material Didático' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Categoria *</label>
                    <select
                      value={form.categoria || ''}
                      onChange={e => {
                        const categoria = e.target.value;
                        setForm(f => ({ ...f, categoria, numeroLivro: '', livro: '' }));
                        if (categoria && form.numeroLivro) {
                          atualizarLivroCompleto(categoria, form.numeroLivro);
                        }
                      }}
                      className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                      required
                    >
                      <option value="">Selecione a categoria</option>
                      {categoriasLivros.map(categoria => (
                        <option key={categoria.valor} value={categoria.valor}>
                          {categoria.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {form.categoria && (
                    <div>
                      <label className="block text-sm font-semibold mb-1">Livro *</label>
                      <select
                        value={form.numeroLivro || ''}
                        onChange={e => {
                          const numero = e.target.value;
                          setForm(f => ({ ...f, numeroLivro: numero }));
                          if (form.categoria && numero) {
                            atualizarLivroCompleto(form.categoria, numero);
                          }
                        }}
                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                        required
                      >
                        <option value="">Selecione o número</option>
                        {gerarNumerosLivros(form.categoria).map(livro => (
                          <option key={livro.valor} value={livro.valor}>
                            {livro.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {form.livro && (
                    <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                      <strong>Livro selecionado:</strong> {form.livro}
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold mb-1">Valor Total *</label>
                <input
                  type="number"
                  value={form.valor || ''}
                  onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                  placeholder="R$ 0,00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Forma de Pagamento *</label>
                <select
                  value={form.pagamento || ''}
                  onChange={e => setForm(f => ({ ...f, pagamento: e.target.value }))}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                  required
                >
                  <option value="">Selecione a forma</option>
                  <option value="PIX">PIX</option>
                  <option value="BOLETO">BOLETO</option>
                  <option value="CARTÃO">CARTÃO</option>
                  <option value="DINHEIRO">DINHEIRO</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Número de Parcelas</label>
                <select
                  value={form.parcelas || '1/1'}
                  onChange={e => setForm(f => ({ ...f, parcelas: e.target.value }))}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                >
                  {[1,2,3,4,5,6].map(num => (
                    <option key={num} value={`${num}/${num}`}>{num}x</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Vencimento da Primeira Parcela *</label>
                <input
                  type="date"
                  value={form.vencimento || ''}
                  onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button 
                  type="button" 
                  className="px-6 py-2 rounded-lg bg-slate-200 text-slate-700 font-medium hover:bg-slate-300 transition-colors" 
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 rounded-lg bg-[#005DE4] text-white font-bold hover:bg-[#004BB8] transition-colors" 
                  disabled={loading}
                >
                  {loading ? 'Criando...' : 'Criar Venda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <div className="space-y-4">
                  <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                    <strong>Atenção:</strong> Para alterar categoria/livro, será necessário recriar a venda com as novas informações.
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Livro Atual</label>
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
                    <small className="text-xs text-gray-500">* Apenas para correções menores</small>
                  </div>
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
                <label className="block text-sm font-semibold mb-1">Vencimento</label>
                <input
                  type="date"
                  value={formView.vencimento || ''}
                  onChange={e => setFormView(f => ({ ...f, vencimento: e.target.value }))}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button 
                  type="button" 
                  className="px-6 py-2 rounded-lg bg-slate-200 text-slate-700 font-medium hover:bg-slate-300 transition-colors" 
                  onClick={() => setShowViewModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 rounded-lg bg-[#005DE4] text-white font-bold hover:bg-[#004BB8] transition-colors" 
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Estoque */}
      {showEstoqueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg relative">
            <button className="absolute top-2 right-2 text-slate-400 hover:text-red-500" onClick={() => {
              setShowEstoqueModal(false);
              setEditingEstoque(null);
              setEstoqueForm({ livro: '', quantidade: '', estoqueMinimo: '5', precoCusto: '', precoVenda: '' });
            }}>&times;</button>
            <h3 className="text-xl font-bold mb-4">{editingEstoque ? 'Editar Item' : 'Adicionar ao Estoque'}</h3>
            <div className="space-y-4">
              {!editingEstoque ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Categoria *</label>
                    <select
                      value={estoqueForm.categoria || ''}
                      onChange={e => {
                        const categoria = e.target.value;
                        setEstoqueForm(f => ({ ...f, categoria, numeroLivro: '', livro: '' }));
                        if (categoria && estoqueForm.numeroLivro) {
                          atualizarLivroCompleto(categoria, estoqueForm.numeroLivro, true);
                        }
                      }}
                      className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                      required
                    >
                      <option value="">Selecione a categoria</option>
                      {categoriasLivros.map(categoria => (
                        <option key={categoria.valor} value={categoria.valor}>
                          {categoria.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {estoqueForm.categoria && (
                    <div>
                      <label className="block text-sm font-semibold mb-1">Livro *</label>
                      <select
                        value={estoqueForm.numeroLivro || ''}
                        onChange={e => {
                          const numero = e.target.value;
                          setEstoqueForm(f => ({ ...f, numeroLivro: numero }));
                          if (estoqueForm.categoria && numero) {
                            atualizarLivroCompleto(estoqueForm.categoria, numero, true);
                          }
                        }}
                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                        required
                      >
                        <option value="">Selecione o número</option>
                        {gerarNumerosLivros(estoqueForm.categoria).map(livro => (
                          <option key={livro.valor} value={livro.valor}>
                            {livro.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {estoqueForm.livro && (
                    <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                      <strong>Livro selecionado:</strong> {estoqueForm.livro}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold mb-1">Livro *</label>
                  <input
                    type="text"
                    value={estoqueForm.livro || ''}
                    className="w-full border rounded-lg px-4 py-2 bg-gray-100 text-gray-500"
                    disabled
                  />
                  <small className="text-xs text-gray-500">Não é possível alterar o livro ao editar</small>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold mb-1">Quantidade inicial *</label>
                <input
                  type="number"
                  value={estoqueForm.quantidade || ''}
                  onChange={e => setEstoqueForm(f => ({ ...f, quantidade: e.target.value }))}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                  placeholder="Ex: 50"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Estoque mínimo *</label>
                <input
                  type="number"
                  value={estoqueForm.estoqueMinimo || ''}
                  onChange={e => setEstoqueForm(f => ({ ...f, estoqueMinimo: e.target.value }))}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                  placeholder="Ex: 5"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Preço de custo *</label>
                <input
                  type="number"
                  value={estoqueForm.precoCusto || ''}
                  onChange={e => setEstoqueForm(f => ({ ...f, precoCusto: e.target.value }))}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                  placeholder="R$ 0,00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Preço de venda *</label>
                <input
                  type="number"
                  value={estoqueForm.precoVenda || ''}
                  onChange={e => setEstoqueForm(f => ({ ...f, precoVenda: e.target.value }))}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                  placeholder="R$ 0,00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button 
                  type="button" 
                  className="px-6 py-2 rounded-lg bg-slate-200 text-slate-700 font-medium hover:bg-slate-300 transition-colors" 
                  onClick={() => {
                    setShowEstoqueModal(false);
                    setEditingEstoque(null);
                    setEstoqueForm({ livro: '', quantidade: '', estoqueMinimo: '5', precoCusto: '', precoVenda: '' });
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="px-6 py-2 rounded-lg bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors" 
                  onClick={handleSalvarEstoque}
                >
                  {editingEstoque ? 'Salvar Alterações' : 'Adicionar ao Estoque'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Dar Baixa no Pagamento */}
      {showPagamentoModal && vendaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
            <button 
              className="absolute top-2 right-2 text-slate-400 hover:text-red-500 text-2xl" 
              onClick={() => setShowPagamentoModal(false)}
            >
              &times;
            </button>
            
            <h3 className="text-xl font-bold mb-4 text-center">💰 Registrar Pagamento</h3>
            
            <div className="space-y-4">
              {/* Informações da Venda */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Aluno:</strong></div>
                  <div>{vendaSelecionada.aluno}</div>
                  
                  <div><strong>Serviço:</strong></div>
                  <div>{vendaSelecionada.tipo}</div>
                  
                  <div><strong>Parcela:</strong></div>
                  <div>{vendaSelecionada.parcelas}</div>
                  
                  <div><strong>Valor Original:</strong></div>
                  <div className="font-bold text-blue-600">R$ {parseFloat(vendaSelecionada.valor).toFixed(2)}</div>
                </div>
              </div>
              
              {/* Input de Valor Pago */}
              <div>
                <label className="block text-sm font-semibold mb-2">Valor Pago *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorPago}
                  onChange={(e) => setValorPago(e.target.value)}
                  className="w-full border rounded-lg px-4 py-3 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0,00"
                  autoFocus
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-colors"
                  onClick={() => setShowPagamentoModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="px-4 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 transition-colors"
                  onClick={processarPagamentoParcela}
                >
                  💰 Confirmar Pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Venda */}
      {showDetalhesModal && vendaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg relative">
            <button 
              className="absolute top-2 right-2 text-slate-400 hover:text-red-500 text-2xl" 
              onClick={() => setShowDetalhesModal(false)}
            >
              &times;
            </button>
            
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              🔍 Detalhes da Venda
              <span className={`px-2 py-1 text-xs rounded-full ${ 
                vendaSelecionada.status === 'pago' ? 'bg-green-100 text-green-800' :
                vendaSelecionada.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {vendaSelecionada.status === 'pago' ? 'Pago' :
                 vendaSelecionada.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
              </span>
            </h3>
            
            <div className="space-y-4">
              {/* Informações do Cliente */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">👤 Informações do Cliente</h4>
                <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                  <p><strong>Nome:</strong> {vendaSelecionada.aluno}</p>
                  <p><strong>Tipo de Serviço:</strong> {vendaSelecionada.tipo}</p>
                  {vendaSelecionada.livro && (
                    <p><strong>Material Didático:</strong> {vendaSelecionada.livro}</p>
                  )}
                </div>
              </div>
              
              {/* Informações Financeiras */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">💰 Informações Financeiras</h4>
                <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                  <p><strong>Parcela:</strong> {vendaSelecionada.parcelas}</p>
                  <p><strong>Valor da Parcela:</strong> R$ {parseFloat(vendaSelecionada.valor).toFixed(2)}</p>
                  <p><strong>Valor Pago:</strong> {vendaSelecionada.valorPago ? `R$ ${parseFloat(vendaSelecionada.valorPago).toFixed(2)}` : 'Não pago'}</p>
                  <p><strong>Forma de Pagamento:</strong> {vendaSelecionada.pagamento}</p>
                </div>
              </div>
              
              {/* Informações de Data */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">📅 Informações de Data</h4>
                <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                  <p><strong>Vencimento:</strong> {new Date(vendaSelecionada.vencimento).toLocaleDateString('pt-BR')}</p>
                  {vendaSelecionada.dataPagamento && (
                    <p><strong>Data do Pagamento:</strong> {new Date(vendaSelecionada.dataPagamento).toLocaleDateString('pt-BR')}</p>
                  )}
                  {vendaSelecionada.dataCancelamento && (
                    <p><strong>Data do Cancelamento:</strong> {new Date(vendaSelecionada.dataCancelamento).toLocaleDateString('pt-BR')}</p>
                  )}
                  <p><strong>Criada em:</strong> {vendaSelecionada.createdAt ? new Date(vendaSelecionada.createdAt).toLocaleString('pt-BR') : 'N/A'}</p>
                </div>
              </div>
              
              {/* Ações Rápidas */}
              <div className="flex gap-2 mt-6">
                <button 
                  onClick={() => {
                    imprimirRecibo(vendaSelecionada);
                    setShowDetalhesModal(false);
                  }}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  🖨️ Imprimir Recibo
                </button>
                <button 
                  onClick={() => setShowDetalhesModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Removed Toast and Confirm components to fix import issues */}
    </div>
  );
}

export default Vendas;