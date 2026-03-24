import React, { useState, useEffect, useMemo } from "react";
import { Card, Table } from "../components";
import { Users, Plus, Edit, Trash2, School, Search, X, ChevronDown, ChevronUp, AlertTriangle, Loader2, FileText, Printer, GraduationCap, UserCheck, Clock } from "lucide-react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function Turmas({ students = [] }) {
  // Estados principais
  const [turmas, setTurmas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTurma, setEditingTurma] = useState(null);
  const [searchAluno, setSearchAluno] = useState('');
  const [selectedAlunos, setSelectedAlunos] = useState([]);
  const [expandedTurmas, setExpandedTurmas] = useState(new Set());
  const [showProfessorReport, setShowProfessorReport] = useState(false);
  const [expandedProfessores, setExpandedProfessores] = useState(new Set());
  
  // Estados de UI e loading
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  
  // Estados de filtros
  const [filtros, setFiltros] = useState({
    professor: 'all',
    dia: 'all',
    nivel: 'all'
  });
  
  // Estados do formulário
  const [form, setForm] = useState({
    nome: '',
    nivel: '',
    professor: '',
    horario: '',
    dias: '',
    maxAlunos: 15
  });
  const [formErrors, setFormErrors] = useState({});
  
  // Sistema de Toast
  const showToast = (message, type = 'info') => {
    // Implementação simples de toast
    const toastTypes = {
      success: { bg: 'bg-green-500', icon: '\u2713' },
      error: { bg: 'bg-red-500', icon: '\u2717' },
      warning: { bg: 'bg-yellow-500', icon: '\u26A0' },
      info: { bg: 'bg-blue-500', icon: '\u2139' }
    };
    
    const toast = document.createElement('div');
    const config = toastTypes[type];
    toast.className = `fixed top-4 right-4 ${config.bg} text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2`;
    toast.innerHTML = `<span>${config.icon}</span><span>${message}</span>`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };
  
  const showConfirm = (message) => {
    return confirm(message);
  };

  // Configurações do sistema
  const professores = [
    'Ruan Machado',
    'Bárbara Dias', 
    'Fernando Machado',
    'Vera Machado',
    'Bruna Amorim'
  ];

  const niveis = ['A1', 'A2', 'A2+', 'B1', 'B2', 'B2+', 'C1'];

  const diasDisponiveis = [
    'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
  ];

  // Validação do formulário
  const validateForm = () => {
    const errors = {};
    
    if (!form.nome?.trim()) {
      errors.nome = 'Nome da turma é obrigatório';
    } else if (form.nome.length < 3) {
      errors.nome = 'Nome deve ter pelo menos 3 caracteres';
    } else if (form.nome.length > 50) {
      errors.nome = 'Nome muito longo (máx. 50 caracteres)';
    }
    
    if (!form.nivel) {
      errors.nivel = 'Selecione um nível';
    }
    
    if (!form.professor) {
      errors.professor = 'Selecione um professor';
    }
    
    if (!form.horario?.trim()) {
      errors.horario = 'Horário é obrigatório';
    } else if (!/^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(form.horario.trim())) {
      errors.horario = 'Formato inválido (ex: 14:00 - 15:30)';
    }
    
    if (!form.dias?.trim()) {
      errors.dias = 'Dias da semana são obrigatórios';
    }
    
    if (form.maxAlunos < 1 || form.maxAlunos > 30) {
      errors.maxAlunos = 'Máximo de alunos deve ser entre 1 e 30';
    }
    
    return errors;
  };

  // Obter alunos da turma baseado nos IDs salvos
  const getAlunosDaTurma = (turma) => {
    if (!turma.alunosIds || !Array.isArray(turma.alunosIds)) {
      return [];
    }
    
    return students.filter(student => turma.alunosIds.includes(student.id));
  };

  // Carregar turmas do Firebase
  useEffect(() => {
    const loadTurmas = async () => {
      try {
        setLoading(true);
        const turmasRef = collection(db, 'turmas');
        const snapshot = await getDocs(turmasRef);
        const turmasData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTurmas(turmasData);
      } catch (error) {
        console.error('Erro ao carregar turmas:', error);
        showToast('Erro ao carregar turmas', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadTurmas();
  }, []);

  // Filtrar turmas com dados reais do Firebase
  const todasTurmasSemFiltro = useMemo(() => {
    return turmas.map(turma => ({
      ...turma,
      alunos: turma.alunosCount || 0 // Compatibilidade
    }));
  }, [turmas]);

  // Turmas filtradas com otimização - DEVE VIR ANTES de getProfessorStats
  const turmasFiltradas = useMemo(() => {
    return todasTurmasSemFiltro.filter(turma => {
      // Filtro por professor
      if (filtros.professor !== 'all' && turma.professor !== filtros.professor) {
        return false;
      }
      
      // Filtro por dia
      if (filtros.dia !== 'all' && !turma.dias.includes(filtros.dia)) {
        return false;
      }
      
      // Filtro por nível
      if (filtros.nivel !== 'all' && turma.nivel !== filtros.nivel) {
        return false;
      }
      
      return true;
    });
  }, [todasTurmasSemFiltro, filtros]);

  // Função para calcular horas de uma aula baseado no horário (ex: "14:00 - 15:30" = 1.5)
  const calcularHorasAula = (horario) => {
    try {
      const [inicio, fim] = horario.split('-').map(h => h.trim());
      const [horaInicio, minInicio] = inicio.split(':').map(Number);
      const [horaFim, minFim] = fim.split(':').map(Number);
      
      const minutosInicio = horaInicio * 60 + minInicio;
      const minutosFim = horaFim * 60 + minFim;
      
      return (minutosFim - minutosInicio) / 60;
    } catch (error) {
      return 0;
    }
  };

  // Função para contar dias de aula na semana
  const contarDiasAula = (dias) => {
    if (!dias) return 0;
    return dias.split(',').map(d => d.trim()).filter(d => d).length;
  };

  // Calcular estatísticas por professor
  const getProfessorStats = useMemo(() => {
    const stats = {};
    
    turmasFiltradas.forEach(turma => {
      if (!stats[turma.professor]) {
        stats[turma.professor] = {
          nome: turma.professor,
          turmas: [],
          totalTurmas: 0,
          totalAlunos: 0,
          horasPorSemana: 0,
          horasPorMes: 0
        };
      }
      
      const horasAula = calcularHorasAula(turma.horario);
      const diasSemana = contarDiasAula(turma.dias);
      const horasSemanais = horasAula * diasSemana;
      const alunosDaTurma = getAlunosDaTurma(turma);
      
      stats[turma.professor].turmas.push({
        ...turma,
        horasAula,
        diasSemana,
        horasSemanais,
        alunos: alunosDaTurma
      });
      
      stats[turma.professor].totalTurmas += 1;
      stats[turma.professor].totalAlunos += alunosDaTurma.length;
      stats[turma.professor].horasPorSemana += horasSemanais;
      stats[turma.professor].horasPorMes = stats[turma.professor].horasPorSemana * 4; // Aproximação: 4 semanas por mês
    });
    
    return Object.values(stats).sort((a, b) => b.horasPorSemana - a.horasPorSemana);
  }, [turmasFiltradas, students]);

  // Toggle expansão do relatório de professor
  const toggleProfessorExpansion = (professorNome) => {
    const newExpanded = new Set(expandedProfessores);
    if (newExpanded.has(professorNome)) {
      newExpanded.delete(professorNome);
    } else {
      newExpanded.add(professorNome);
    }
    setExpandedProfessores(newExpanded);
  };

  // Filtrar alunos ativos para pesquisa
  const alunosAtivos = students.filter(aluno => 
    aluno.status !== 'cancelado'
  );

  // Filtrar alunos baseado na pesquisa
  const alunosFiltrados = alunosAtivos.filter(aluno => 
    aluno.name?.toLowerCase().includes(searchAluno.toLowerCase())
  );

  // Adicionar aluno à turma
  const adicionarAluno = (aluno) => {
    if (!selectedAlunos.find(a => a.id === aluno.id)) {
      setSelectedAlunos([...selectedAlunos, aluno]);
    }
    setSearchAluno('');
  };

  // Remover aluno da turma
  const removerAluno = (alunoId) => {
    setSelectedAlunos(selectedAlunos.filter(a => a.id !== alunoId));
  };

  // Salvar nova turma ou editar existente
  const salvarTurma = async () => {
    const errors = validateForm();
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('Corrija os erros no formulário', 'error');
      return;
    }

    try {
      setSaving(true);
      setFormErrors({});
      
      const turmaData = {
        nome: form.nome.trim(),
        professor: form.professor,
        nivel: form.nivel,
        horario: form.horario.trim(),
        dias: form.dias.trim(),
        maxAlunos: parseInt(form.maxAlunos),
        alunosIds: selectedAlunos.map(a => a.id),
        alunosCount: selectedAlunos.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingTurma) {
        // Editar turma existente
        const turmaRef = doc(db, 'turmas', editingTurma.id);
        await updateDoc(turmaRef, {
          ...turmaData,
          createdAt: editingTurma.createdAt // Preservar data de criação
        });
        
        // Atualizar estado local
        setTurmas(prev => prev.map(turma => 
          turma.id === editingTurma.id 
            ? { ...turma, ...turmaData }
            : turma
        ));
        
        showToast('Turma editada com sucesso!', 'success');
      } else {
        // Criar nova turma
        const docRef = await addDoc(collection(db, 'turmas'), turmaData);
        
        // Atualizar estado local
        const novaTurma = {
          id: docRef.id,
          ...turmaData
        };
        setTurmas(prev => [...prev, novaTurma]);
        
        showToast('Turma criada com sucesso!', 'success');
      }

      // Resetar formulário
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar turma:', error);
      showToast('Erro ao salvar turma', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Reset do formulário
  const resetForm = () => {
    setForm({ 
      nome: '', 
      nivel: '', 
      professor: '', 
      horario: '', 
      dias: '',
      maxAlunos: 15 
    });
    setSelectedAlunos([]);
    setEditingTurma(null);
    setShowModal(false);
    setFormErrors({});
  };

  // Abrir modal para editar turma
  const handleEditTurma = (turma) => {
    setEditingTurma(turma);
    setForm({
      nome: turma.nome,
      nivel: turma.nivel,
      professor: turma.professor,
      horario: turma.horario,
      dias: turma.dias,
      maxAlunos: turma.maxAlunos || 15
    });
    
    // Carregar alunos da turma
    if (turma.alunosIds && turma.alunosIds.length > 0) {
      const alunosDaTurma = students.filter(s => turma.alunosIds.includes(s.id));
      setSelectedAlunos(alunosDaTurma);
    } else {
      setSelectedAlunos([]);
    }
    
    setFormErrors({});
    setShowModal(true);
  };

  // Excluir turma
  const handleDeleteTurma = async (turma) => {
    if (!showConfirm(`Tem certeza que deseja excluir a turma "${turma.nome}"?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      setDeleting(turma.id);
      
      // Excluir do Firebase
      const turmaRef = doc(db, 'turmas', turma.id);
      await deleteDoc(turmaRef);
      
      // Atualizar estado local
      setTurmas(prev => prev.filter(t => t.id !== turma.id));
      
      showToast('Turma excluída com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao excluir turma:', error);
      showToast('Erro ao excluir turma', 'error');
    } finally {
      setDeleting(null);
    }
  };

  // Toggle expansão da turma
  const toggleTurmaExpansion = (turmaId) => {
    const newExpanded = new Set(expandedTurmas);
    if (newExpanded.has(turmaId)) {
      newExpanded.delete(turmaId);
    } else {
      newExpanded.add(turmaId);
    }
    setExpandedTurmas(newExpanded);
  };

  // Função auxiliar para normalizar string (remover acentos)
  const normalizarString = (str) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  };

  // Gerar dias de aula do mês baseado nos dias da semana da turma
  const gerarDiasAulaMes = (turma, mes = new Date().getMonth(), ano = new Date().getFullYear()) => {
    // Mapeamento robusto: aceita com e sem acento, completo ou abreviado
    const diasSemana = {
      'domingo': 0, 
      'segunda': 1, 'segunda-feira': 1, 'seg': 1,
      'terca': 2, 'terça': 2, 'terca-feira': 2, 'terça-feira': 2, 'ter': 2,
      'quarta': 3, 'quarta-feira': 3, 'qua': 3,
      'quinta': 4, 'quinta-feira': 4, 'qui': 4,
      'sexta': 5, 'sexta-feira': 5, 'sex': 5,
      'sabado': 6, 'sábado': 6, 'sabado-feira': 6, 'sábado-feira': 6, 'sab': 6
    };
    
    if (!turma.dias || typeof turma.dias !== 'string') {
      console.error('Turma sem dias definidos:', turma);
      return [];
    }
    
    const diasTurma = turma.dias.split(',').map(d => normalizarString(d));
    const numerosDias = diasTurma
      .map(dia => diasSemana[dia])
      .filter(n => n !== undefined);
    
    // Debug: se não encontrou dias, mostrar o problema
    if (numerosDias.length === 0) {
      console.error('Nenhum dia válido encontrado para turma:', {
        turma: turma.nome,
        diasOriginal: turma.dias,
        diasNormalizados: diasTurma
      });
    }
    
    const diasAula = [];
    const ultimoDiaMes = new Date(ano, mes + 1, 0).getDate();
    
    for (let dia = 1; dia <= ultimoDiaMes; dia++) {
      const data = new Date(ano, mes, dia);
      if (numerosDias.includes(data.getDay())) {
        diasAula.push(dia);
      }
    }
    
    return diasAula;
  };

  // Função para gerar e imprimir a chamada
  const gerarChamada = (turma) => {
    const alunosDaTurma = getAlunosDaTurma(turma);
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
    const nomesMeses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    const diasAula = gerarDiasAulaMes(turma, mesAtual, anoAtual);
    
    const chamadaHTML = `
      <html>
        <head>
          <title>Lista de Presença - ${turma.nome}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #005DE4; padding-bottom: 15px; }
            .logo { color: #005DE4; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .logo img { max-width: 150px; height: auto; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
            .info-item { padding: 8px; border: 1px solid #ccc; }
            .info-label { font-weight: bold; width: 80px; display: inline-block; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: center; height: 0.3in; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .aluno-col { text-align: left; width: 300px; font-size: 12px; }
            .dia-col { width: 30px; height: 0.3in; }
            .footer { margin-top: 30px; }
            .footer-table { width: 100%; border-collapse: collapse; }
            .footer-table th, .footer-table td { border: 1px solid #000; padding: 8px; text-align: left; }
            .footer-table th { background-color: #f5f5f5; font-weight: bold; }
            .data-col { width: 100px; }
            .content-cell { height: 0.3in; vertical-align: top; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">
              <img src="https://www.speakupcataguases.com/wp-content/uploads/2026/02/logo-speakup-azul.png" alt="SpeakUp Logo" />
            </div>
            <p>Praça Governador Valadares 119, Centro - Cataguases MG</p>
            <p>CNPJ: 28.649.636-000/88</p>
          </div>
          
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Turma:</span> ${turma.nome}
            </div>
            <div class="info-item">
              <span class="info-label">Mês:</span> ${nomesMeses[mesAtual]}/${anoAtual}
            </div>
            <div class="info-item">
              <span class="info-label">Nível:</span> ${turma.nivel}
            </div>
            <div class="info-item">
              <span class="info-label">Dia:</span> ${turma.dias}
            </div>
            <div class="info-item">
              <span class="info-label">Professor:</span> ${turma.professor}
            </div>
            <div class="info-item">
              <span class="info-label">Horário:</span> ${turma.horario}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="aluno-col">Aluno</th>
                ${diasAula.map(dia => `<th class="dia-col">${dia}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${(() => {
                const linhas = [];
                // Garantir sempre 10 linhas na tabela de alunos
                for (let i = 0; i < 10; i++) {
                  const aluno = alunosDaTurma[i];
                  const nomeAluno = aluno ? (aluno.name || 'Nome não informado') : '';
                  linhas.push(`
                    <tr>
                      <td class="aluno-col">${nomeAluno}</td>
                      ${diasAula.map(() => '<td class="dia-col"></td>').join('')}
                    </tr>
                  `);
                }
                return linhas.join('');
              })()}
            </tbody>
          </table>

          <table class="footer-table">
            <tr>
              <th class="data-col">Data</th>
              <th>Conteúdo Lecionado</th>
            </tr>
            <tr>
              <td class="content-cell data-col"></td>
              <td class="content-cell"></td>
            </tr>
            <tr>
              <td class="content-cell data-col"></td>
              <td class="content-cell"></td>
            </tr>
            <tr>
              <td class="content-cell data-col"></td>
              <td class="content-cell"></td>
            </tr>
            <tr>
              <td class="content-cell data-col"></td>
              <td class="content-cell"></td>
            </tr>
            <tr>
              <td class="content-cell data-col"></td>
              <td class="content-cell"></td>
            </tr>
            <tr>
              <td class="content-cell data-col"></td>
              <td class="content-cell"></td>
            </tr>
            <tr>
              <td class="content-cell data-col"></td>
              <td class="content-cell"></td>
            </tr>
          </table>
        </body>
      </html>
    `;
    
    // Abrir em nova janela para impressão
    const janelaImpressao = window.open('', '_blank');
    janelaImpressao.document.write(chamadaHTML);
    janelaImpressao.document.close();
    janelaImpressao.print();
    
    showToast('Lista de presença gerada com sucesso!', 'success');
  };

  // Abrir modal para nova turma
  const abrirNovoModal = () => {
    setEditingTurma(null);
    setForm({ 
      nome: '', 
      nivel: '', 
      professor: '', 
      horario: '', 
      dias: '',
      maxAlunos: 15 
    });
    setSelectedAlunos([]);
    setFormErrors({});
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start lg:items-center justify-between mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Users className="text-[#005DE4]" size={32} />
              Gestão de Turmas
            </h1>
            <p className="text-gray-600 font-medium">
              Gerencie suas turmas, horários e alunos matriculados
            </p>
          </div>
          <button
            onClick={abrirNovoModal}
            disabled={loading}
            className="bg-[#005DE4] text-white px-6 py-3 rounded-xl font-semibold flex gap-2 items-center hover:bg-[#0048b3] hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
            Nova Turma
          </button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {loading ? (
            // Loading skeleton para estatísticas
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-xl animate-pulse">
                <div className="h-8 bg-gray-300 rounded mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              </div>
            ))
          ) : (
            <>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/50 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-500 rounded-lg">
                    <School size={20} className="text-white" />
                  </div>
                  <span className="text-2xl font-bold text-blue-700">{turmasFiltradas.length}</span>
                </div>
                <p className="text-sm font-semibold text-blue-600">Total de Turmas</p>
                <p className="text-xs text-blue-500 mt-1">Turmas ativas</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200/50 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-green-500 rounded-lg">
                    <GraduationCap size={20} className="text-white" />
                  </div>
                  <span className="text-2xl font-bold text-green-700">{turmasFiltradas.reduce((acc, t) => acc + (t.alunosIds?.length || 0), 0)}</span>
                </div>
                <p className="text-sm font-semibold text-green-600">Total de Alunos</p>
                <p className="text-xs text-green-500 mt-1">Estudantes matriculados</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200/50 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-500 rounded-lg">
                    <UserCheck size={20} className="text-white" />
                  </div>
                  <span className="text-2xl font-bold text-purple-700">{new Set(turmasFiltradas.map(t => t.professor)).size}</span>
                </div>
                <p className="text-sm font-semibold text-purple-600">Professores</p>
                <p className="text-xs text-purple-500 mt-1">Docentes ativos</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200/50 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-orange-500 rounded-lg">
                    <Clock size={20} className="text-white" />
                  </div>
                  <span className="text-2xl font-bold text-orange-700">
                    {turmasFiltradas.length > 0 
                      ? Math.round((turmasFiltradas.reduce((acc, t) => acc + (t.alunosIds?.length || 0), 0) / turmasFiltradas.reduce((acc, t) => acc + (t.maxAlunos || 15), 0)) * 100)
                      : 0}%
                  </span>
                </div>
                <p className="text-sm font-semibold text-orange-600">Taxa de Ocupação</p>
                <p className="text-xs text-orange-500 mt-1">Capacidade utilizada</p>
              </div>
            </>
          )}
        </div>
      </div>
      {/* Filtros */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Search size={16} className="text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
              <p className="text-sm text-gray-500">Refine sua busca por turmas</p>
            </div>
          </div>
          {(filtros.professor !== 'all' || filtros.dia !== 'all' || filtros.nivel !== 'all') && (
            <button
              onClick={() => setFiltros({ professor: 'all', dia: 'all', nivel: 'all' })}
              className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors"
            >
              <X size={14} />
              Limpar filtros
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Filtro por Professor */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Professor</label>
            <select
              value={filtros.professor}
              onChange={(e) => setFiltros({...filtros, professor: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4] focus:border-[#005DE4] transition-all duration-200 bg-white hover:border-gray-400"
            >
              <option value="all">Todos os professores</option>
              {professores.map((prof, index) => (
                <option key={`professor-${index}`} value={prof}>{prof}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Dia */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Dia da Semana</label>
            <select
              value={filtros.dia}
              onChange={(e) => setFiltros({...filtros, dia: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4] focus:border-[#005DE4] transition-all duration-200 bg-white hover:border-gray-400"
            >
              <option value="all">Todos os dias</option>
              {diasDisponiveis.map((dia, index) => (
                <option key={`dia-${index}`} value={dia}>{dia}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Nível */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Nível</label>
            <select
              value={filtros.nivel}
              onChange={(e) => setFiltros({...filtros, nivel: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4] focus:border-[#005DE4] transition-all duration-200 bg-white hover:border-gray-400"
            >
              <option value="all">Todos os níveis</option>
              {niveis.map((nivel, index) => (
                <option key={`nivel-${index}`} value={nivel}>Nível {nivel}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Resultados */}
        {(filtros.professor !== 'all' || filtros.dia !== 'all' || filtros.nivel !== 'all') && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">
                    {turmasFiltradas.length}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {turmasFiltradas.length} turma{turmasFiltradas.length !== 1 ? 's' : ''} encontrada{turmasFiltradas.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {filtros.professor !== 'all' && (
                  <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium">
                    Professor: {filtros.professor}
                  </span>
                )}
                {filtros.dia !== 'all' && (
                  <span className="px-3 py-1 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-medium">
                    Dia: {filtros.dia}
                  </span>
                )}
                {filtros.nivel !== 'all' && (
                  <span className="px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-xs font-medium">
                    Nível: {filtros.nivel}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Relatório de Professores */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header do Relatório - Clicável */}
        <button
          onClick={() => setShowProfessorReport(!showProfessorReport)}
          className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <UserCheck size={20} className="text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-gray-900">Relatório de Professores</h3>
              <p className="text-sm text-gray-500">
                Horas trabalhadas, turmas e alunos por professor
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold">
              {getProfessorStats.length} {getProfessorStats.length === 1 ? 'professor' : 'professores'}
            </span>
            <ChevronDown 
              size={20} 
              className={`text-gray-400 transform transition-transform duration-200 ${
                showProfessorReport ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {/* Conteúdo do Relatório - Colapsável */}
        {showProfessorReport && (
          <div className="border-t border-gray-200 bg-gray-50">
            {getProfessorStats.length === 0 ? (
              <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                  <UserCheck size={20} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">Nenhum professor com turmas ativas</p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {/* Cards de Professores */}
                {getProfessorStats.map((prof, index) => {
                  const isExpanded = expandedProfessores.has(prof.nome);
                  
                  return (
                    <div 
                      key={`professor-${index}`}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200"
                    >
                      {/* Header do Professor - Clicável */}
                      <button
                        onClick={() => toggleProfessorExpansion(prof.nome)}
                        className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {/* Avatar e Nome */}
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {prof.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="text-left">
                            <h4 className="font-bold text-gray-900 text-lg">{prof.nome}</h4>
                            <p className="text-sm text-gray-500">
                              {prof.totalTurmas} {prof.totalTurmas === 1 ? 'turma' : 'turmas'} • {prof.totalAlunos} {prof.totalAlunos === 1 ? 'aluno' : 'alunos'}
                            </p>
                          </div>
                        </div>

                        {/* Estatísticas Rápidas */}
                        <div className="flex items-center gap-4">
                          {/* Horas Semanais */}
                          <div className="text-right">
                            <div className="text-2xl font-bold text-purple-600">
                              {prof.horasPorSemana.toFixed(1)}h
                            </div>
                            <div className="text-xs text-gray-500 font-medium">por semana</div>
                          </div>

                          {/* Horas Mensais */}
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">
                              {prof.horasPorMes.toFixed(0)}h
                            </div>
                            <div className="text-xs text-gray-500 font-medium">por mês</div>
                          </div>

                          {/* Ícone de Expansão */}
                          <ChevronDown 
                            size={20} 
                            className={`text-gray-400 transform transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </button>

                      {/* Detalhes Expandidos */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 p-5 bg-gray-50/50 space-y-4">
                          {/* Grid de Estatísticas */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Total de Turmas */}
                            <div className="bg-white border border-blue-200 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <School size={16} className="text-blue-600" />
                                <span className="text-xs font-semibold text-blue-600 uppercase">Turmas</span>
                              </div>
                              <div className="text-2xl font-bold text-blue-700">{prof.totalTurmas}</div>
                              <div className="text-xs text-gray-500 mt-1">turmas ativas</div>
                            </div>

                            {/* Total de Alunos */}
                            <div className="bg-white border border-green-200 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <GraduationCap size={16} className="text-green-600" />
                                <span className="text-xs font-semibold text-green-600 uppercase">Alunos</span>
                              </div>
                              <div className="text-2xl font-bold text-green-700">{prof.totalAlunos}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {prof.totalTurmas > 0 ? `${(prof.totalAlunos / prof.totalTurmas).toFixed(1)} por turma` : '-'}
                              </div>
                            </div>

                            {/* Horas Semanais */}
                            <div className="bg-white border border-purple-200 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock size={16} className="text-purple-600" />
                                <span className="text-xs font-semibold text-purple-600 uppercase">Semanal</span>
                              </div>
                              <div className="text-2xl font-bold text-purple-700">{prof.horasPorSemana.toFixed(1)}h</div>
                              <div className="text-xs text-gray-500 mt-1">horas por semana</div>
                            </div>

                            {/* Horas Mensais */}
                            <div className="bg-white border border-orange-200 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock size={16} className="text-orange-600" />
                                <span className="text-xs font-semibold text-orange-600 uppercase">Mensal</span>
                              </div>
                              <div className="text-2xl font-bold text-orange-700">{prof.horasPorMes.toFixed(0)}h</div>
                              <div className="text-xs text-gray-500 mt-1">horas por mês</div>
                            </div>
                          </div>

                          {/* Lista de Turmas do Professor */}
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <School size={16} className="text-gray-600" />
                              Turmas ({prof.turmas.length})
                            </h5>
                            <div className="space-y-2">
                              {prof.turmas.map((turma, idx) => (
                                <div 
                                  key={`prof-turma-${idx}`}
                                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                                >
                                  <div className="flex items-start justify-between">
                                    {/* Info da Turma */}
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <h6 className="font-bold text-gray-900">{turma.nome}</h6>
                                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                                          {turma.nivel}
                                        </span>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                        {/* Horário */}
                                        <div className="flex items-center gap-2">
                                          <Clock size={14} className="text-gray-400" />
                                          <span className="text-gray-700">{turma.horario}</span>
                                        </div>

                                        {/* Dias */}
                                        <div className="flex items-center gap-2">
                                          <span className="text-gray-500 text-xs">📅</span>
                                          <span className="text-gray-700">{turma.dias}</span>
                                        </div>

                                        {/* Alunos */}
                                        <div className="flex items-center gap-2">
                                          <GraduationCap size={14} className="text-gray-400" />
                                          <span className="text-gray-700">
                                            {turma.alunos.length}/{turma.maxAlunos} alunos
                                          </span>
                                        </div>

                                        {/* Horas Semanais */}
                                        <div className="flex items-center gap-2">
                                          <span className="text-purple-600 font-semibold">
                                            {turma.horasSemanais.toFixed(1)}h/semana
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Lista de Alunos da Turma (se houver) */}
                                  {turma.alunos.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                      <div className="flex flex-wrap gap-2">
                                        {turma.alunos.slice(0, 5).map((aluno, alunoIdx) => (
                                          <span 
                                            key={`turma-aluno-${alunoIdx}`}
                                            className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                                          >
                                            {aluno.name}
                                          </span>
                                        ))}
                                        {turma.alunos.length > 5 && (
                                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                            +{turma.alunos.length - 5} mais
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Cálculo de Salário Sugerido (exemplo) */}
                          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h6 className="font-semibold text-gray-900 mb-1">💰 Estimativa de Trabalho</h6>
                                <p className="text-sm text-gray-600 mb-3">
                                  Baseado em {prof.horasPorSemana.toFixed(1)} horas semanais
                                </p>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Horas/Semana:</span>
                                    <span className="ml-2 font-bold text-purple-700">{prof.horasPorSemana.toFixed(1)}h</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Horas/Mês:</span>
                                    <span className="ml-2 font-bold text-purple-700">{prof.horasPorMes.toFixed(0)}h</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-500 mb-1">Carga Horária</div>
                                <div className="text-3xl font-bold text-purple-600">
                                  {prof.horasPorSemana.toFixed(1)}h
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Resumo Geral */}
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-6 text-white mt-6">
                  <h5 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <span>📊</span>
                    Resumo Geral
                  </h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-white/80 text-sm mb-1">Total de Professores</div>
                      <div className="text-3xl font-bold">{getProfessorStats.length}</div>
                    </div>
                    <div>
                      <div className="text-white/80 text-sm mb-1">Total de Turmas</div>
                      <div className="text-3xl font-bold">
                        {getProfessorStats.reduce((acc, p) => acc + p.totalTurmas, 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/80 text-sm mb-1">Total de Alunos</div>
                      <div className="text-3xl font-bold">
                        {getProfessorStats.reduce((acc, p) => acc + p.totalAlunos, 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/80 text-sm mb-1">Horas Semanais</div>
                      <div className="text-3xl font-bold">
                        {getProfessorStats.reduce((acc, p) => acc + p.horasPorSemana, 0).toFixed(1)}h
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Lista de Turmas */}
        {loading ? (
          // Loading skeleton para turmas
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 animate-pulse">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="h-6 bg-gray-300 rounded w-1/3 mb-3"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                        <div>
                          <div className="h-3 bg-gray-300 rounded w-16 mb-1"></div>
                          <div className="h-4 bg-gray-300 rounded w-24"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                        <div>
                          <div className="h-3 bg-gray-300 rounded w-16 mb-1"></div>
                          <div className="h-4 bg-gray-300 rounded w-20"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                        <div>
                          <div className="h-3 bg-gray-300 rounded w-16 mb-1"></div>
                          <div className="h-4 bg-gray-300 rounded w-12"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
                    <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
                    <div className="w-20 h-10 bg-gray-300 rounded-lg"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : turmasFiltradas.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-xl mb-4">
              <School size={28} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma turma encontrada</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {(filtros.professor !== 'all' || filtros.dia !== 'all' || filtros.nivel !== 'all') 
                ? 'Tente ajustar os filtros para ver mais resultados ou criar uma nova turma.'
                : 'Ainda não há turmas cadastradas no sistema. Comece criando sua primeira turma!'
              }
            </p>
            {(filtros.professor !== 'all' || filtros.dia !== 'all' || filtros.nivel !== 'all') ? (
              <button
                onClick={() => setFiltros({ professor: 'all', dia: 'all', nivel: 'all' })}
                className="text-sm text-[#005DE4] hover:text-[#0048b3] font-semibold bg-blue-50 px-4 py-2 rounded-lg transition-colors"
              >
                Limpar filtros
              </button>
            ) : (
              <button
                onClick={abrirNovoModal}
                className="bg-[#005DE4] text-white px-6 py-3 rounded-xl font-semibold flex gap-2 items-center hover:bg-[#0048b3] transition-all duration-200 mx-auto"
              >
                <Plus size={20} />
                Criar primeira turma
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {turmasFiltradas.map(turma => {
            const alunosDaTurma = getAlunosDaTurma(turma);
            const isExpanded = expandedTurmas.has(turma.id);
            
            return (
              <div key={turma.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg hover:border-[#005DE4]/30 transition-all duration-300 overflow-hidden">
                {/* Header da Turma */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    {/* Título, Badge e Info Básica */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-gradient-to-br from-[#005DE4] to-[#0048b3] rounded-full"></div>
                        <h3 className="text-xl font-bold text-gray-900">{turma.nome}</h3>
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                          turma.nivel === 'A1' || turma.nivel === 'A2' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                          turma.nivel === 'A2+' || turma.nivel === 'B1' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          turma.nivel === 'B2' || turma.nivel === 'B2+' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                          'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          Nível {turma.nivel}
                        </span>
                      </div>
                    </div>
                    
                    {/* Botões de Ação */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => gerarChamada(turma)}
                        className="p-2.5 text-gray-500 hover:text-[#005DE4] hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title="Gerar lista de chamada"
                      >
                        <FileText size={18} />
                      </button>
                      <button
                        onClick={() => toggleTurmaExpansion(turma.id)}
                        className="p-2.5 text-gray-500 hover:text-[#005DE4] hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title={isExpanded ? "Recolher detalhes" : "Ver detalhes"}
                      >
                        <ChevronDown size={18} className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleEditTurma(turma)}
                        disabled={saving}
                        className="p-2.5 text-gray-500 hover:text-[#005DE4] hover:bg-blue-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                        title="Editar turma"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteTurma(turma)}
                        disabled={deleting === turma.id}
                        className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                        title="Excluir turma"
                      >
                        {deleting === turma.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Informações Principais - Resumo Limpo */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Professor */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                        <UserCheck size={18} className="text-gray-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Professor</p>
                        <p className="text-sm font-bold text-gray-900 truncate">{turma.professor}</p>
                      </div>
                    </div>
                    
                    {/* Horário */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center border border-green-200">
                        <Clock size={18} className="text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Horário</p>
                        <p className="text-sm font-bold text-gray-900">{turma.horario}</p>
                        <p className="text-xs text-gray-600 font-medium truncate">{turma.dias}</p>
                      </div>
                    </div>
                    
                    {/* Alunos */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center border border-blue-200">
                        <GraduationCap size={18} className="text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Alunos</p>
                        <p className="text-sm font-bold text-gray-900">
                          {alunosDaTurma.length}/{turma.maxAlunos || 15}
                        </p>
                        <p className="text-xs text-gray-600 font-medium">
                          {Math.round((alunosDaTurma.length / (turma.maxAlunos || 15)) * 100)}% ocupado
                        </p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                        alunosDaTurma.length === (turma.maxAlunos || 15) 
                          ? 'bg-red-100 border-red-200' 
                          : alunosDaTurma.length > (turma.maxAlunos || 15) * 0.8 
                            ? 'bg-amber-100 border-amber-200' 
                            : 'bg-green-100 border-green-200'
                      }`}>
                        <span className={`text-sm ${
                          alunosDaTurma.length === (turma.maxAlunos || 15) 
                            ? 'text-red-600' 
                            : alunosDaTurma.length > (turma.maxAlunos || 15) * 0.8 
                              ? 'text-amber-600' 
                              : 'text-green-600'
                        }`}>
                          {alunosDaTurma.length === (turma.maxAlunos || 15) ? '🔴' : 
                           alunosDaTurma.length > (turma.maxAlunos || 15) * 0.8 ? '🟡' : '🟢'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Status</p>
                        <p className={`text-sm font-bold ${
                          alunosDaTurma.length === (turma.maxAlunos || 15) 
                            ? 'text-red-600' 
                            : alunosDaTurma.length > (turma.maxAlunos || 15) * 0.8 
                              ? 'text-amber-600' 
                              : 'text-green-600'
                        }`}>
                          {alunosDaTurma.length === (turma.maxAlunos || 15) ? 'Lotada' : 
                           alunosDaTurma.length > (turma.maxAlunos || 15) * 0.8 ? 'Quase cheia' : 'Disponível'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Seção Expandida de Alunos - Melhorada */}
                {isExpanded && (
                  <div className="border-t bg-gray-50/50 p-5">
                    {alunosDaTurma.length > 0 ? (
                      <div className="space-y-4">
                        {/* Header da Seção de Alunos */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#005DE4] rounded-full flex items-center justify-center">
                              <Users size={16} className="text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">Alunos Matriculados</h4>
                              <p className="text-sm text-gray-500">{alunosDaTurma.length} de {turma.maxAlunos} vagas preenchidas</p>
                            </div>
                          </div>
                          
                          {/* Botão Gerar Chamada - Melhorado */}
                          <button
                            onClick={() => gerarChamada(turma)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#005DE4] text-white rounded-lg hover:bg-[#0048b3] transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                            title="Gerar lista de presença para impressão"
                          >
                            <Printer size={16} />
                            <span>Gerar Lista</span>
                          </button>
                        </div>
                        
                        {/* Lista de Alunos - Grid Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {alunosDaTurma.map((aluno, index) => (
                            <div 
                              key={`${turma.id}-aluno-${aluno.id || index}`} 
                              className="bg-white border border-gray-200 rounded-lg p-3 hover:border-[#005DE4]/30 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 text-sm">👤</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {aluno.name || 'Nome não informado'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {aluno.course || 'Sem curso definido'}
                                  </p>
                                </div>
                                <div className="w-2 h-2 bg-green-500 rounded-full" title="Ativo" />
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Resumo da Turma - Cards Horizontais */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-gray-200">
                          <div className="bg-white border border-blue-200 rounded-lg p-3 text-center">
                            <div className="text-xl font-bold text-blue-600">{alunosDaTurma.length}</div>
                            <div className="text-xs text-blue-600 font-medium">Matriculados</div>
                          </div>
                          <div className="bg-white border border-green-200 rounded-lg p-3 text-center">
                            <div className="text-xl font-bold text-green-600">{turma.maxAlunos - alunosDaTurma.length}</div>
                            <div className="text-xs text-green-600 font-medium">Vagas Livres</div>
                          </div>
                          <div className="bg-white border border-purple-200 rounded-lg p-3 text-center">
                            <div className="text-xl font-bold text-purple-600">
                              {Math.round((alunosDaTurma.length / turma.maxAlunos) * 100)}%
                            </div>
                            <div className="text-xs text-purple-600 font-medium">Ocupação</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                          <Users size={20} className="text-gray-400" />
                        </div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Turma Vazia</h4>
                        <p className="text-xs text-gray-500">
                          Nenhum aluno matriculado nesta turma
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}

      {/* Modal funcional para Nova Turma */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editingTurma ? 'Editar Turma' : 'Nova Turma'}</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Nome da Turma */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nome da Turma *
                  {formErrors.nome && (
                    <span className="text-red-500 text-xs ml-2 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {formErrors.nome}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => {
                    setForm({...form, nome: e.target.value});
                    if (formErrors.nome) {
                      setFormErrors({...formErrors, nome: ''});
                    }
                  }}
                  className={`w-full border rounded-lg px-3 py-2 transition-colors ${
                    formErrors.nome 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-300 focus:border-[#005DE4] focus:ring-blue-200'
                  } focus:outline-none focus:ring-2`}
                  placeholder="Ex: Kids Avançado"
                  disabled={saving}
                />
              </div>

              {/* Nível */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nível *
                  {formErrors.nivel && (
                    <span className="text-red-500 text-xs ml-2 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {formErrors.nivel}
                    </span>
                  )}
                </label>
                <select
                  value={form.nivel}
                  onChange={(e) => {
                    setForm({...form, nivel: e.target.value});
                    if (formErrors.nivel) {
                      setFormErrors({...formErrors, nivel: ''});
                    }
                  }}
                  className={`w-full border rounded-lg px-3 py-2 transition-colors ${
                    formErrors.nivel 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-300 focus:border-[#005DE4] focus:ring-blue-200'
                  } focus:outline-none focus:ring-2`}
                  disabled={saving}
                >
                  <option value="">Selecione o nível</option>
                  {niveis.map((nivel, index) => (
                    <option key={`form-nivel-${index}`} value={nivel}>{nivel}</option>
                  ))}
                </select>
              </div>

              {/* Professor */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Professor *
                  {formErrors.professor && (
                    <span className="text-red-500 text-xs ml-2 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {formErrors.professor}
                    </span>
                  )}
                </label>
                <select
                  value={form.professor}
                  onChange={(e) => {
                    setForm({...form, professor: e.target.value});
                    if (formErrors.professor) {
                      setFormErrors({...formErrors, professor: ''});
                    }
                  }}
                  className={`w-full border rounded-lg px-3 py-2 transition-colors ${
                    formErrors.professor 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-300 focus:border-[#005DE4] focus:ring-blue-200'
                  } focus:outline-none focus:ring-2`}
                  disabled={saving}
                >
                  <option value="">Selecione o professor</option>
                  {professores.map((prof, index) => (
                    <option key={`form-professor-${index}`} value={prof}>{prof}</option>
                  ))}
                </select>
              </div>

              {/* Horário */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Horário *
                  {formErrors.horario && (
                    <span className="text-red-500 text-xs ml-2 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {formErrors.horario}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={form.horario}
                  onChange={(e) => {
                    setForm({...form, horario: e.target.value});
                    if (formErrors.horario) {
                      setFormErrors({...formErrors, horario: ''});
                    }
                  }}
                  className={`w-full border rounded-lg px-3 py-2 transition-colors ${
                    formErrors.horario 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-300 focus:border-[#005DE4] focus:ring-blue-200'
                  } focus:outline-none focus:ring-2`}
                  placeholder="Ex: 14:00 - 15:30"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Dias da Semana e Máx Alunos */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Dias da Semana *
                  {formErrors.dias && (
                    <span className="text-red-500 text-xs ml-2 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {formErrors.dias}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={form.dias}
                  onChange={(e) => {
                    setForm({...form, dias: e.target.value});
                    if (formErrors.dias) {
                      setFormErrors({...formErrors, dias: ''});
                    }
                  }}
                  className={`w-full border rounded-lg px-3 py-2 transition-colors ${
                    formErrors.dias 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-300 focus:border-[#005DE4] focus:ring-blue-200'
                  } focus:outline-none focus:ring-2`}
                  placeholder="Ex: Segunda, Quarta, Sexta"
                  disabled={saving}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Máximo de Alunos *
                  {formErrors.maxAlunos && (
                    <span className="text-red-500 text-xs ml-2 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {formErrors.maxAlunos}
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  value={form.maxAlunos}
                  onChange={(e) => {
                    setForm({...form, maxAlunos: parseInt(e.target.value) || 15});
                    if (formErrors.maxAlunos) {
                      setFormErrors({...formErrors, maxAlunos: ''});
                    }
                  }}
                  className={`w-full border rounded-lg px-3 py-2 transition-colors ${
                    formErrors.maxAlunos 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-300 focus:border-[#005DE4] focus:ring-blue-200'
                  } focus:outline-none focus:ring-2`}
                  min="1"
                  max="30"
                  placeholder="15"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Busca de Alunos */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Adicionar Alunos</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchAluno}
                  onChange={(e) => setSearchAluno(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005DE4] focus:border-transparent transition-colors"
                  placeholder="Buscar alunos para adicionar..."
                  disabled={saving}
                />
                
                {/* Lista de sugestões */}
                {searchAluno && alunosFiltrados.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-t-0 rounded-b-lg max-h-40 overflow-y-auto z-10 shadow-lg">
                    {alunosFiltrados.slice(0, 5).map((aluno, index) => (
                      <button
                        key={`aluno-suggestion-${aluno.id || index}`}
                        onClick={() => adicionarAluno(aluno)}
                        disabled={saving || selectedAlunos.find(a => a.id === aluno.id)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 flex justify-between items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <span className="font-medium">{aluno.name}</span>
                        <span className="text-xs text-gray-500">{aluno.course || 'Sem curso'}</span>
                      </button>
                    ))}
                    {alunosFiltrados.length === 0 && (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        Nenhum aluno encontrado
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Alunos Selecionados */}
            {selectedAlunos.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">
                  Alunos da Turma ({selectedAlunos.length}/{form.maxAlunos})
                  {selectedAlunos.length >= form.maxAlunos && (
                    <span className="text-orange-600 text-xs ml-2">Turma lotada</span>
                  )}
                </label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 bg-gray-50 rounded-lg border">
                  {selectedAlunos.map((aluno, index) => (
                    <div key={`selected-aluno-${aluno.id || index}`} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2 text-sm">
                      <span>{aluno.name}</span>
                      <button
                        onClick={() => removerAluno(aluno.id)}
                        disabled={saving}
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
                        title="Remover aluno"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {selectedAlunos.length >= form.maxAlunos && (
                  <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Limite de alunos atingido. Aumente o máximo ou remova alguns alunos.
                  </p>
                )}
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarTurma}
                disabled={saving}
                className="bg-[#005DE4] text-white px-4 py-2 rounded-lg hover:bg-[#0048b3] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editingTurma ? 'Salvar Alterações' : 'Criar Turma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
