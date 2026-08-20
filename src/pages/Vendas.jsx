import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CheckCircle, RotateCcw, FileDown, Eye, Edit2, XCircle, Trash2, BarChart3, Package, ShoppingBag, HelpCircle, PlusCircle, MinusCircle, AlertTriangle } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { livros, categoriasLivros, gerarNumerosLivros } from '../constants/vendas';
import { useUI } from '../context/UIContext';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import NovaVendaModal from '../components/vendas/NovaVendaModal';
import EditarVendaModal from '../components/vendas/EditarVendaModal';
import EstoqueModal from '../components/vendas/EstoqueModal';
import PagamentoModal from '../components/vendas/PagamentoModal';
import VendaDetalhesModal from '../components/vendas/VendaDetalhesModal';

function Vendas() {
  const [vendas, setVendas] = useState([]);
  const [estoque, setEstoque] = useState([]);

  const { toastMsg } = useUI();
  const { confirmState, requestConfirm, handleConfirm, handleCancel } = useConfirm();

  const showToast = (message) => toastMsg(message);

  const showConfirm = (options) => requestConfirm({
    title: options.title,
    message: options.message,
    variant: options.type === 'danger' ? 'danger' : options.type === 'warning' ? 'warning' : 'info',
    confirmLabel: options.confirmText ?? 'Confirmar',
    cancelLabel: options.cancelText ?? 'Cancelar',
  });

  const validateVendaForm = (form) => {
    const errors = [];
    if (!form.aluno?.trim()) errors.push('Nome do aluno é obrigatório');
    if (!form.tipo) errors.push('Tipo de compra é obrigatório');
    if (!form.valor || isNaN(parseFloat(form.valor)) || parseFloat(form.valor) <= 0) errors.push('Valor inválido');
    if (!form.pagamento) errors.push('Forma de pagamento é obrigatória');
    if (!form.vencimento) errors.push('Vencimento é obrigatório');
    return { isValid: errors.length === 0, errors };
  };

  const validateEstoqueForm = (form) => {
    const errors = [];
    if (!form.livro?.trim()) errors.push('Livro é obrigatório');
    if (!form.quantidade || isNaN(parseInt(form.quantidade)) || parseInt(form.quantidade) < 0) errors.push('Quantidade inválida');
    if (!form.precoCusto || isNaN(parseFloat(form.precoCusto)) || parseFloat(form.precoCusto) < 0) errors.push('Preço de custo inválido');
    if (!form.precoVenda || isNaN(parseFloat(form.precoVenda)) || parseFloat(form.precoVenda) < 0) errors.push('Preço de venda inválido');
    return { isValid: errors.length === 0, errors };
  };

  const handleError = (err, context) => {
    console.error(`Erro em ${context}:`, err);
    toastMsg(`Erro ao ${context}: ${err.message || 'Erro desconhecido'}`);
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
  const [abaAtiva, setAbaAtiva] = useState('vendas'); // 'vendas' | 'estoque'
  const [mostrarAjudaEstoque, setMostrarAjudaEstoque] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEstoqueModal, setShowEstoqueModal] = useState(false);
  const [cobrancaView, setCobrancaView] = useState(null);
  const [editingEstoque, setEditingEstoque] = useState(null);
  const [filterAluno, setFilterAluno] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMes, setFilterMes] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [filterAno, setFilterAno] = useState(String(new Date().getFullYear()));
  
  // Filtros para estoque
  const [filterCategoriaEstoque, setFilterCategoriaEstoque] = useState('');
  const [ordenacaoEstoque, setOrdenacaoEstoque] = useState('categoria'); // categoria, nome, quantidade

  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState(null);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  
  // Estados para controlar seções expandidas/recolhidas
  const [expandedSections, setExpandedSections] = useState({
    vendas: true,
    indicadores: true
  });

  // Funções para ações da tabela
  const abrirPagamentoParcela = (venda) => {
    setVendaSelecionada(venda);
    setShowPagamentoModal(true);
  };

  const processarPagamentoParcela = async (valorPago) => {
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
      showToast('Pagamento registrado com sucesso!', 'success');
    } catch (err) {
      handleError(err, 'registrar pagamento');
    }
  };

  const baixarReciboDoc = (venda) => {
    const valorPago = parseFloat(venda.valorPago || venda.valor || 0);
    const hojeStr = new Date().toLocaleDateString('pt-BR');
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Recibo ${venda.id}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #1e293b; margin: 40px; }
        h1 { color: #005DE4; text-align: center; }
        h2 { text-align: center; color: #334155; }
        .label { font-weight: bold; color: #475569; }
        .valor { font-size: 20pt; font-weight: bold; color: #005DE4; text-align: center; padding: 12px; background: #f0f6ff; border-radius: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        td { padding: 7px 4px; border-bottom: 1px solid #e2e8f0; font-size: 11pt; }
        .rodape { margin-top: 40px; text-align: center; font-size: 9pt; color: #94a3b8; }
        hr { border: none; border-top: 2px solid #005DE4; margin: 16px 0; }
        .empresa { text-align: center; font-size: 9pt; color: #64748b; }
      </style>
      </head>
      <body>
        <h1>SpeakUp English Language Academy</h1>
        <h2>Recibo de Pagamento</h2>
        <p class="empresa">
          CNPJ: 28.649.636/0001-88<br/>
          Praça Governador Valadares, 119 - Centro - Cataguases/MG
        </p>
        <hr/>
        <p class="valor">R$ ${valorPago.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
        <hr/>
        <table>
          <tr><td class="label">Aluno(a):</td><td>${venda.aluno || '-'}</td></tr>
          <tr><td class="label">Serviço:</td><td>${venda.tipo || '-'}</td></tr>
          ${venda.livro ? `<tr><td class="label">Material:</td><td>${venda.livro}</td></tr>` : ''}
          <tr><td class="label">Parcelas:</td><td>${venda.parcelas || '-'}</td></tr>
          <tr><td class="label">Vencimento:</td><td>${venda.vencimento ? new Date(venda.vencimento).toLocaleDateString('pt-BR') : '-'}</td></tr>
          <tr><td class="label">Forma de Pagamento:</td><td>${venda.pagamento || '-'}</td></tr>
          <tr><td class="label">Data do Pagamento:</td><td>${venda.dataPagamento ? new Date(venda.dataPagamento).toLocaleDateString('pt-BR') : 'Pendente'}</td></tr>
          <tr><td class="label">Status:</td><td>${venda.status === 'pago' ? 'PAGO' : 'PENDENTE'}</td></tr>
        </table>
        <div class="rodape">Recibo gerado em ${hojeStr} — SpeakUp English Language Academy</div>
      </body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Recibo-${venda.aluno || venda.id}.doc`;
    a.click();
    URL.revokeObjectURL(url);
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
      await restaurarEstoqueDaVenda(venda);
    } catch (err) {
      handleError(err, 'cancelar cobrança');
    }
  };

  const excluirVenda = async (venda) => {
    const confirmou = await showConfirm({
      title: 'Excluir Venda Definitivamente',
      message: `Tem certeza que deseja EXCLUIR permanentemente a venda de ${venda.aluno}?\n\nEsta ação é IRREVERSÍVEL e a venda será removida do sistema!`,
      type: 'danger',
      confirmText: 'Excluir Permanentemente',
      cancelText: 'Cancelar'
    });
    
    if (!confirmou) return;

    try {
      // Verificar se o documento ainda existe
      const documentoExiste = await verificarDocumentoExiste('vendas', venda.id);
      
      if (!documentoExiste) {
        showToast('Esta venda não existe mais no sistema. Recarregando dados...', 'error');
        // Recarregar dados para sincronizar
        const vendasRef = collection(db, 'vendas');
        const vendasSnap = await getDocs(vendasRef);
        const vendasData = vendasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setVendas(vendasData);
        return;
      }

      // Deletar do Firebase
      await deleteDoc(doc(db, 'vendas', venda.id));

      // Remover do estado local
      setVendas(prev => prev.filter(v => v.id !== venda.id));

      showToast('Venda excluída com sucesso!', 'success');
      await restaurarEstoqueDaVenda(venda);
    } catch (err) {
      handleError(err, 'excluir venda');
    }
  };

  const reverterPagamento = async (venda) => {
    const confirmou = await showConfirm({
      title: 'Reverter Pagamento',
      message: `Tem certeza que deseja reverter o pagamento de ${venda.aluno}?\nA venda voltará para o status PENDENTE.`,
      type: 'warning',
      confirmText: 'Reverter para Pendente',
      cancelText: 'Cancelar'
    });
    
    if (!confirmou) return;

    try {
      // Verificar se o documento ainda existe
      const documentoExiste = await verificarDocumentoExiste('vendas', venda.id);
      
      if (!documentoExiste) {
        showToast('Esta venda não existe mais no sistema. Recarregando dados...', 'error');
        // Recarregar dados para sincronizar
        const vendasRef = collection(db, 'vendas');
        const vendasSnap = await getDocs(vendasRef);
        const vendasData = vendasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setVendas(vendasData);
        return;
      }

      await updateDoc(doc(db, 'vendas', venda.id), {
        status: 'pendente',
        valorPago: null,
        dataPagamento: null
      });
      
      setVendas(prev => 
        prev.map(v => 
          v.id === venda.id 
            ? { ...v, status: 'pendente', valorPago: null, dataPagamento: null }
            : v
        )
      );
      
      showToast('Pagamento revertido com sucesso! Venda está pendente novamente.', 'success');
    } catch (err) {
      handleError(err, 'reverter pagamento');
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
    setShowViewModal(true);
  };

  const handleSalvarEdicao = async (form) => {
    if (!cobrancaView?.id) return;

    const validation = validateVendaForm(form);
    if (!validation.isValid) {
      showToast(`Erro: ${validation.errors.join(', ')}`, 'error');
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'vendas', cobrancaView.id), {
        aluno: form.aluno.trim(),
        tipo: form.tipo,
        livro: form.livro || '',
        valor: form.valor.toString(),
        pagamento: form.pagamento,
        vencimento: form.vencimento,
        updatedAt: new Date().toISOString()
      });

      // Atualizar estado local
      setVendas(prev =>
        prev.map(v =>
          v.id === cobrancaView.id
            ? { ...v, ...form, valor: form.valor.toString() }
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
      // Filtro por mês e ano (baseado na data de VENCIMENTO para contabilizar parcelas corretamente)
      let filtroData = true;
      if ((filterMes && filterAno) || filterMes || filterAno) {
        // Usar vencimento como prioridade para que parcelas apareçam no mês correto
        const dataReferencia = venda.vencimento || venda.createdAt || '';
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

  const estoqueBaixoCount = useMemo(
    () => estoque.filter(item => parseInt(item.quantidade) <= (item.estoqueMinimo || 5)).length,
    [estoque]
  );

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
  const handleSalvarEstoque = async (form) => {
    const validation = validateEstoqueForm(form);
    if (!validation.isValid) {
      showToast(`Erro: ${validation.errors.join(', ')}`, 'error');
      return;
    }

    const quantidade = parseInt(form.quantidade);
    const estoqueMinimo = parseInt(form.estoqueMinimo);
    const precoCusto = parseFloat(form.precoCusto);
    const precoVenda = parseFloat(form.precoVenda);

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
        const itemExistente = estoque.find(item => item.livro === form.livro);
        if (itemExistente) {
          showToast('Este livro já está cadastrado no estoque!', 'warning');
          return;
        }

        const novoItem = {
          livro: form.livro,
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
    } catch (err) {
      handleError(err, 'salvar item do estoque');
    } finally {
      setLoading(false);
    }
  };

  const editarEstoque = (item) => {
    setEditingEstoque(item);
    setShowEstoqueModal(true);
  };

  const handleCriarVenda = async (form) => {
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
    // Item do estoque correspondente ao livro vendido (Material Didático baixa 1 unidade na venda).
    const itemEstoque = form.tipo === 'Material Didático' && form.livro
      ? estoque.find(item => item.livro === form.livro)
      : null;

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
          createdAt: new Date().toISOString(),
          // Só a 1ª parcela "carrega" a baixa de estoque — parcelas seguintes são
          // só cobrança, o livro já foi entregue na criação da venda.
          ...(i === 1 && itemEstoque ? { estoqueBaixado: true, estoqueItemId: itemEstoque.id } : {})
        });
      }

      // Baixa de estoque: desconta 1 unidade do livro vendido (avisa se ficar negativo, mas não bloqueia a venda).
      if (itemEstoque) {
        const novaQuantidade = parseInt(itemEstoque.quantidade) - 1;
        await updateDoc(doc(db, 'estoque', itemEstoque.id), { quantidade: novaQuantidade });
        setEstoque(prev => prev.map(item => item.id === itemEstoque.id ? { ...item, quantidade: novaQuantidade } : item));
        if (novaQuantidade < 0) {
          showToast(`Atenção: estoque de "${form.livro}" ficou negativo (${novaQuantidade}). Reponha o quanto antes!`, 'warning');
        }
      } else if (form.tipo === 'Material Didático' && form.livro) {
        showToast(`"${form.livro}" não está cadastrado no estoque — venda registrada sem baixa de estoque.`, 'warning');
      }

      setShowModal(false);
      showToast(`Venda criada com ${totalParcelas} parcela(s)!`, 'success');
      const vendasRef = collection(db, 'vendas');
      const vendasSnap = await getDocs(vendasRef);
      const vendasData = vendasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVendas(vendasData);
    } catch (err) {
      handleError(err, 'criar venda');
    } finally {
      setLoading(false);
    }
  };

  // Devolve 1 unidade ao estoque quando uma venda que baixou estoque é cancelada/excluída.
  const restaurarEstoqueDaVenda = async (venda) => {
    if (!venda?.estoqueBaixado || !venda?.estoqueItemId) return;
    try {
      const item = estoque.find(i => i.id === venda.estoqueItemId);
      if (!item) return;
      const novaQuantidade = parseInt(item.quantidade) + 1;
      await updateDoc(doc(db, 'estoque', item.id), { quantidade: novaQuantidade });
      setEstoque(prev => prev.map(i => i.id === item.id ? { ...i, quantidade: novaQuantidade } : i));
      showToast(`Estoque de "${item.livro}" devolvido (+1) após cancelamento.`, 'success');
    } catch (err) {
      handleError(err, 'restaurar estoque');
    }
  };

  const deletarEstoque = async (itemId, livro) => {
    const confirmacao = await showConfirm({
      title: 'Remover do estoque',
      message: `Tem certeza que deseja deletar "${livro}" do estoque?`,
      type: 'danger',
      confirmText: 'Deletar',
      cancelText: 'Cancelar',
    });
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
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Sistema de Vendas</h1>

        {/* Abas */}
        <div className="flex gap-2 mb-6 bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 w-fit">
          <button
            onClick={() => setAbaAtiva('vendas')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
              abaAtiva === 'vendas' ? 'bg-[#005DE4] text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <ShoppingBag size={16} /> Vendas
          </button>
          <button
            onClick={() => setAbaAtiva('estoque')}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
              abaAtiva === 'estoque' ? 'bg-[#005DE4] text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Package size={16} /> Estoque
            {estoqueBaixoCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {estoqueBaixoCount}
              </span>
            )}
          </button>
        </div>

        {abaAtiva === 'vendas' && (
        <>
        {/* Seção de Indicadores Rápidos */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => expandirSecao('indicadores')} 
              className="flex items-center gap-2 text-xl font-semibold text-gray-700"
            >
              <BarChart3 size={20} className="text-gray-500" />
              Indicadores rápidos
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
                
                // Aplicar filtro de aluno nas vendas individuais para cálculos de valor
                const vendasComFiltroAluno = vendasFiltradasParaIndicadores.filter(venda => {
                  return !filterAluno || venda.aluno.toLowerCase().includes(filterAluno.toLowerCase());
                });
                
                // Excluir vendas canceladas dos cálculos
                const vendasNaoCanceladas = vendasComFiltroAluno.filter(v => v.status !== 'cancelado');
                
                // Para "Vendas Geradas", contar o total de cobranças (parcelas) no período
                // Cada parcela que vence no período filtrado é uma cobrança independente
                const totalVendasGeradas = vendasNaoCanceladas.length;
                
                const totalPrevisto = vendasNaoCanceladas.reduce((acc, v) => acc + parseFloat(v.valor || 0), 0);
                const valorPago = vendasNaoCanceladas.filter(v => v.status === 'pago').reduce((acc, v) => acc + parseFloat(v.valor || 0), 0);
                const valorPendente = vendasNaoCanceladas.filter(v => v.status === 'pendente').reduce((acc, v) => acc + parseFloat(v.valor || 0), 0);
                const cobrancasAtrasadas = vendasNaoCanceladas.filter(v => v.status === 'pendente' && v.vencimento < hoje).length;
                const vendasCanceladas = vendasComFiltroAluno.filter(v => v.status === 'cancelado').length;
                const valorCancelado = vendasComFiltroAluno.filter(v => v.status === 'cancelado').reduce((acc, v) => acc + parseFloat(v.valor || 0), 0);

                // Calcular percentuais para as barras de progresso
                const totalGeralVendas = vendasNaoCanceladas.length;
                const percentVendas = totalGeralVendas > 0 ? (totalVendasGeradas / totalGeralVendas) * 100 : 0;
                const percentPago = totalPrevisto > 0 ? (valorPago / totalPrevisto) * 100 : 0;
                const percentPendente = totalPrevisto > 0 ? (valorPendente / totalPrevisto) * 100 : 0;
                const percentAtrasadas = totalGeralVendas > 0 ? (cobrancasAtrasadas / totalGeralVendas) * 100 : 0;

                return [
                  { 
                    titulo: 'Cobranças', 
                    valor: totalVendasGeradas,
                    quantidade: totalVendasGeradas,
                    percentual: percentVendas,
                    cor: {
                      bg: 'bg-blue-50',
                      border: 'border-blue-200',
                      text: 'text-blue-700',
                      value: 'text-blue-600',
                      bar: 'bg-blue-500'
                    },
                    formato: 'number'
                  },
                  { 
                    titulo: 'Total Previsto', 
                    valor: totalPrevisto,
                    quantidade: vendasNaoCanceladas.length,
                    percentual: 100,
                    cor: {
                      bg: 'bg-purple-50',
                      border: 'border-purple-200',
                      text: 'text-purple-700',
                      value: 'text-purple-600',
                      bar: 'bg-purple-500'
                    },
                    formato: 'currency'
                  },
                  { 
                    titulo: 'Valor Pago', 
                    valor: valorPago,
                    quantidade: vendasNaoCanceladas.filter(v => v.status === 'pago').length,
                    percentual: percentPago,
                    cor: {
                      bg: 'bg-emerald-50',
                      border: 'border-emerald-200',
                      text: 'text-emerald-700',
                      value: 'text-emerald-600',
                      bar: 'bg-emerald-500'
                    },
                    formato: 'currency'
                  },
                  { 
                    titulo: 'Pendente', 
                    valor: valorPendente,
                    quantidade: vendasNaoCanceladas.filter(v => v.status === 'pendente').length,
                    percentual: percentPendente,
                    cor: {
                      bg: 'bg-orange-50',
                      border: 'border-orange-200',
                      text: 'text-orange-700',
                      value: 'text-orange-600',
                      bar: 'bg-orange-500'
                    },
                    formato: 'currency'
                  },
                  { 
                    titulo: 'Vencidas', 
                    valor: cobrancasAtrasadas,
                    quantidade: cobrancasAtrasadas,
                    percentual: percentAtrasadas,
                    cor: {
                      bg: 'bg-red-50',
                      border: 'border-red-200',
                      text: 'text-red-700',
                      value: 'text-red-600',
                      bar: 'bg-red-500'
                    },
                    formato: 'number'
                  }
                ].map((indicador, idx) => (
                  <div key={idx} className={`${indicador.cor.bg} border ${indicador.cor.border} rounded-xl p-5 transition-all hover:shadow-md`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`text-sm font-semibold ${indicador.cor.text}`}>{indicador.titulo}</h3>
                      <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16v-4m0-4h.01"/>
                      </svg>
                    </div>
                    
                    <div className="mb-2">
                      <div className={`text-2xl font-bold ${indicador.cor.value}`}>
                        {indicador.formato === 'currency' 
                          ? `R$ ${indicador.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
                          : indicador.valor}
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div 
                        className={`${indicador.cor.bar} h-2 rounded-full transition-all`} 
                        style={{ width: `${Math.min(indicador.percentual, 100)}%` }}
                      ></div>
                    </div>

                    {/* Info de Quantidade */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-gray-600">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <span>{indicador.quantidade} cobrança{indicador.quantidade !== 1 ? 's' : ''}</span>
                      </div>
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                      </svg>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
        </>
        )}

        {abaAtiva === 'estoque' && (
        <>
        {/* Controle de Estoque */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-700">
              <Package size={20} className="text-gray-500" />
              Controle de estoque
              <button
                onClick={() => setMostrarAjudaEstoque(v => !v)}
                className={`p-1 rounded-full transition-colors ${mostrarAjudaEstoque ? 'bg-blue-100 text-[#005DE4]' : 'text-gray-400 hover:text-[#005DE4] hover:bg-blue-50'}`}
                title="Como usar essa página"
              >
                <HelpCircle size={20} />
              </button>
            </h2>
            <button
              className="bg-[#005DE4] text-white px-4 py-2 rounded-lg hover:bg-[#0041a8] transition-colors font-medium"
              onClick={() => setShowEstoqueModal(true)}
            >
              + Adicionar ao estoque
            </button>
          </div>

          {mostrarAjudaEstoque && (
            <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700 space-y-3">
              <p className="font-semibold text-[#005DE4]">Como usar o controle de estoque</p>

              <div className="flex gap-2">
                <PlusCircle size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <p><strong>Chegaram livros novos?</strong> Clique em "+ Adicionar ao estoque" (se o livro já existe, abra "Editar" nele) e aumente a Quantidade.</p>
              </div>

              <div className="flex gap-2">
                <MinusCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p><strong>Vendeu um livro?</strong> Basta registrar a venda normalmente na aba "Vendas" — a Quantidade aqui já desconta 1 unidade sozinha. Se cancelar ou excluir essa venda depois, a unidade volta pro estoque automaticamente.</p>
              </div>

              <div className="flex gap-2">
                <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p><strong>Linha vermelha com "BAIXO"?</strong> A quantidade chegou no (ou abaixo do) "Estoque Mínimo" cadastrado — é a hora de pedir reposição desse livro.</p>
              </div>

              <p className="text-xs text-gray-500 pt-1 border-t border-blue-200">
                Use os filtros "Categoria" e "Organizar por" só pra achar um livro mais rápido na lista — eles não alteram o estoque.
              </p>
            </div>
          )}

          {/* Filtros do Estoque */}
          <div className="flex flex-wrap gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
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

          {(() => {
            // Se não há itens no estoque, mostrar mensagem inicial
            if (estoque.length === 0) {
              return (
                <div className="text-center py-8 text-gray-500">
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
              <div className="text-center py-8 text-gray-500">
                <div className="text-6xl mb-4">📚</div>
                <p>Nenhum item encontrado.</p>
                <p className="text-sm">Tente ajustar os filtros para ver os itens.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Livro</th>
                      <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd</th>
                      <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Mín</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Custo</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Venda</th>
                      <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {estoqueFiltrado.map(item => {
                      const isEstoqueBaixo = item.quantidade <= (item.estoqueMinimo || 5);
                      return (
                        <tr key={item.id} className={isEstoqueBaixo ? 'bg-red-50' : 'hover:bg-gray-50'}>
                          <td className="px-3 py-2.5 font-medium text-gray-800">{item.livro}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`font-bold ${isEstoqueBaixo ? 'text-red-600' : 'text-gray-700'}`}>
                              {item.quantidade}
                            </span>
                            {isEstoqueBaixo && (
                              <span className="ml-1.5 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold align-middle">
                                BAIXO
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center text-gray-500">{item.estoqueMinimo || 5}</td>
                          <td className="px-3 py-2.5 text-right text-gray-600">R$ {item.precoCusto || '0.00'}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-green-600">R$ {item.precoVenda || '0.00'}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-center gap-3">
                              <button
                                onClick={() => editarEstoque(item)}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => deletarEstoque(item.id, item.livro)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
        </>
        )}

        {abaAtiva === 'vendas' && (
        <>
        {/* Seção de Vendas */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => expandirSecao('vendas')} 
                className="flex items-center gap-2 text-xl font-semibold text-gray-700"
              >
                <ShoppingBag size={20} className="text-gray-500" />
                Vendas realizadas
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
                      <span className="text-blue-600 font-semibold">Resultados:</span>
                      <span className="text-blue-800 font-bold">{vendasFiltradas.length} venda(s) encontrada(s)</span>
                    </div>
                    <div className="text-sm text-blue-600">
                      {(() => {
                        const vendasNaoCanceladas = vendasFiltradas.filter(v => v.status !== 'cancelado');
                        const totalValor = vendasNaoCanceladas.reduce((sum, venda) => sum + parseFloat(venda.valor), 0);
                        const totalPago = vendasNaoCanceladas.reduce((sum, venda) => sum + parseFloat(venda.valorPago || 0), 0);
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
                                      className="p-2 rounded-lg hover:bg-green-50 text-green-600 hover:text-green-800 transition-colors"
                                      title="Dar Baixa"
                                    >
                                      <CheckCircle size={16} />
                                    </button>
                                  )}
                                  
                                  {/* Reverter Pagamento */}
                                  {venda.status === 'pago' && (
                                    <button
                                      onClick={() => reverterPagamento(venda)}
                                      className="p-2 rounded-lg hover:bg-orange-50 text-orange-600 hover:text-orange-800 transition-colors"
                                      title="Reverter Pagamento"
                                    >
                                      <RotateCcw size={16} />
                                    </button>
                                  )}
                                  
                                  {/* Baixar Recibo .doc */}
                                  <button
                                    onClick={() => baixarReciboDoc(venda)}
                                    className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 hover:text-emerald-800 transition-colors"
                                    title="Baixar Recibo (.doc)"
                                  >
                                    <FileDown size={16} />
                                  </button>
                                  
                                  {/* Ver Detalhes (Lupa) */}
                                  <button
                                    onClick={() => abrirDetalhesVenda(venda)}
                                    className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800 transition-colors"
                                    title="Ver Detalhes"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  
                                  {/* Editar */}
                                  {venda.status !== 'cancelado' && (
                                    <button
                                      onClick={() => abrirEdicaoCobranca(venda)}
                                      className="p-2 rounded-lg hover:bg-yellow-50 text-yellow-600 hover:text-yellow-800 transition-colors"
                                      title="Editar"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                  )}
                                  
                                  {/* Cancelar Cobrança */}
                                  {venda.status === 'pendente' && (
                                    <button
                                      onClick={() => cancelarCobranca(venda)}
                                      className="p-2 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                                      title="Cancelar Cobrança"
                                    >
                                      <XCircle size={16} />
                                    </button>
                                  )}
                                  
                                  {/* Excluir Venda Cancelada */}
                                  {venda.status === 'cancelado' && (
                                    <button
                                      onClick={() => excluirVenda(venda)}
                                      className="p-2 rounded-lg hover:bg-red-100 text-red-700 hover:text-red-900 transition-colors"
                                      title="Excluir Venda Permanentemente"
                                    >
                                      <Trash2 size={16} />
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
                                  <CheckCircle size={13} /> Baixa
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
                            {venda.status === 'pago' && (
                              <button
                                onClick={() => reverterPagamento(venda)}
                                className="bg-orange-500 text-white px-3 py-2 rounded-lg text-xs hover:bg-orange-600 transition-colors flex items-center gap-1"
                                title="Reverter Pagamento"
                              >
                                <RotateCcw size={13} /> Reverter
                              </button>
                            )}
                            <button
                              onClick={() => baixarReciboDoc(venda)}
                              className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs hover:bg-emerald-700 transition-colors flex items-center gap-1"
                            >
                              <FileDown size={13} /> Recibo
                            </button>
                            <button
                              onClick={() => abrirDetalhesVenda(venda)}
                              className="bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs hover:bg-indigo-600 transition-colors flex items-center gap-1"
                            >
                              <Eye size={13} /> Ver
                            </button>
                            {venda.status !== 'cancelado' && (
                              <button
                                onClick={() => abrirEdicaoCobranca(venda)}
                                className="bg-yellow-500 text-white px-3 py-2 rounded-lg text-xs hover:bg-yellow-600 transition-colors flex items-center gap-1"
                              >
                                <Edit2 size={13} /> Editar
                              </button>
                            )}
                            {venda.status === 'cancelado' && (
                              <button
                                onClick={() => excluirVenda(venda)}
                                className="bg-red-600 text-white px-3 py-2 rounded-lg text-xs hover:bg-red-700 transition-colors flex items-center gap-1"
                              >
                                <Trash2 size={13} /> Excluir
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
        </>
        )}
      </div>

      {showModal && (
        <NovaVendaModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCriarVenda}
          loading={loading}
          categoriasLivros={categoriasLivros}
          gerarNumerosLivros={gerarNumerosLivros}
        />
      )}

      {showViewModal && cobrancaView && (
        <EditarVendaModal
          venda={cobrancaView}
          onClose={() => setShowViewModal(false)}
          onSave={handleSalvarEdicao}
          loading={loading}
          livros={livros}
        />
      )}

      {showEstoqueModal && (
        <EstoqueModal
          editingItem={editingEstoque}
          onClose={() => {
            setShowEstoqueModal(false);
            setEditingEstoque(null);
          }}
          onSave={handleSalvarEstoque}
          loading={loading}
          categoriasLivros={categoriasLivros}
          gerarNumerosLivros={gerarNumerosLivros}
        />
      )}

      {showPagamentoModal && vendaSelecionada && (
        <PagamentoModal
          venda={vendaSelecionada}
          onClose={() => setShowPagamentoModal(false)}
          onConfirm={processarPagamentoParcela}
        />
      )}

      {showDetalhesModal && vendaSelecionada && (
        <VendaDetalhesModal
          venda={vendaSelecionada}
          onClose={() => setShowDetalhesModal(false)}
          onDownloadRecibo={baixarReciboDoc}
        />
      )}
      
      <ConfirmDialog {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </div>
  );
}

export default Vendas;