import React, { useState } from "react";
import { Card, Table } from "../components";
import { Users, Plus, Edit, Trash2, School, Search, X, ChevronDown, ChevronUp } from "lucide-react";

export default function Turmas({ students = [] }) {
  const [turmas, setTurmas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTurma, setEditingTurma] = useState(null);
  const [searchAluno, setSearchAluno] = useState('');
  const [selectedAlunos, setSelectedAlunos] = useState([]);
  const [expandedTurmas, setExpandedTurmas] = useState(new Set());
  const [filtros, setFiltros] = useState({
    professor: 'all',
    dia: 'all',
    nivel: 'all'
  });
  const [form, setForm] = useState({
    nome: '',
    nivel: '',
    professor: '',
    horario: '',
    dias: ''
  });

  // Lista de professores
  const professores = [
    'Ruan Machado',
    'Bárbara Dias', 
    'Fernando Machado',
    'Vera Machado',
    'Bruna Amorim'
  ];

  // Lista de níveis
  const niveis = ['A1', 'A2', 'A2+', 'B1', 'B2', 'B2+', 'C1'];

  // Lista de dias únicos (extraídos das turmas)
  const diasDisponiveis = [
    'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
  ];

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
  const salvarTurma = () => {
    if (!form.nome || !form.nivel || !form.professor || !form.horario) {
      alert('Preencha todos os campos obrigatórios!');
      return;
    }

    if (editingTurma) {
      // Editar turma existente
      const turmasAtualizadas = turmas.map(turma => 
        turma.id === editingTurma.id 
          ? {
              ...turma,
              nome: form.nome,
              professor: form.professor,
              nivel: form.nivel,
              horario: form.horario,
              dias: form.dias,
              alunos: selectedAlunos.length,
              alunosIds: selectedAlunos.map(a => a.id)
            }
          : turma
      );
      setTurmas(turmasAtualizadas);
      alert('Turma editada com sucesso!');
    } else {
      // Criar nova turma
      const novaTurma = {
        id: Date.now(),
        nome: form.nome,
        professor: form.professor,
        nivel: form.nivel,
        horario: form.horario,
        dias: form.dias,
        alunos: selectedAlunos.length,
        maxAlunos: 15,
        alunosIds: selectedAlunos.map(a => a.id)
      };
      setTurmas([...turmas, novaTurma]);
      alert('Turma criada com sucesso!');
    }

    // Resetar formulário
    setForm({ nome: '', nivel: '', professor: '', horario: '', dias: '' });
    setSelectedAlunos([]);
    setEditingTurma(null);
    setShowModal(false);
  };

  // Abrir modal para editar turma
  const handleEditTurma = (turma) => {
    setEditingTurma(turma);
    setForm({
      nome: turma.nome,
      nivel: turma.nivel,
      professor: turma.professor,
      horario: turma.horario,
      dias: turma.dias
    });
    // Se a turma tem alunos, carregá-los (por enquanto simulado)
    setSelectedAlunos([]);
    setShowModal(true);
  };

  // Excluir turma
  const handleDeleteTurma = (turma) => {
    if (confirm(`Tem certeza que deseja excluir a turma "${turma.nome}"?`)) {
      setTurmas(turmas.filter(t => t.id !== turma.id));
      alert('Turma excluída com sucesso!');
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

  // Simular alunos para cada turma (temporário até integração com Firebase)
  const getAlunosDaTurma = (turmaId) => {
    // Simulação - em produção seria baseado nos alunosIds da turma
    switch(turmaId) {
      case 1:
        return [
          { id: 'sim_1001', name: 'Ana Silva', course: 'Kids A1' },
          { id: 'sim_1002', name: 'João Santos', course: 'Kids A1' },
          { id: 'sim_1003', name: 'Maria Oliveira', course: 'Kids A1' },
          { id: 'sim_1004', name: 'Pedro Costa', course: 'Kids A1' }
        ];
      case 2:
        return [
          { id: 'sim_1005', name: 'Lucas Ferreira', course: 'Teens B1' },
          { id: 'sim_1006', name: 'Beatriz Lima', course: 'Teens B1' },
          { id: 'sim_1007', name: 'Gabriel Rocha', course: 'Teens B1' }
        ];
      case 3:
        return [
          { id: 'sim_1008', name: 'Carlos Mendes', course: 'Adults C1' },
          { id: 'sim_1009', name: 'Sandra Almeida', course: 'Adults C1' }
        ];
      default:
        // Para turmas criadas dinamicamente, usar os alunos selecionados
        const turma = turmas.find(t => t.id === turmaId);
        if (turma && turma.alunosIds) {
          return students.filter(s => turma.alunosIds.includes(s.id));
        }
        return [];
    }
  };

  // Dados de demonstração + turmas criadas
  const todasTurmasSemFiltro = [
    { 
      id: 1, 
      nome: "Kids A1", 
      professor: "Bárbara Dias", 
      nivel: "A1",
      horario: "08:00 - 09:00",
      dias: "Segunda, Quarta, Sexta",
      alunos: 12,
      maxAlunos: 15
    },
    { 
      id: 2, 
      nome: "Teens B1", 
      professor: "Fernando Machado", 
      nivel: "B1",
      horario: "14:00 - 15:30",
      dias: "Terça, Quinta",
      alunos: 8,
      maxAlunos: 12
    },
    { 
      id: 3, 
      nome: "Adults Business C1", 
      professor: "Ruan Machado", 
      nivel: "C1",
      horario: "19:00 - 20:30",
      dias: "Segunda, Quarta",
      alunos: 6,
      maxAlunos: 10
    },
    ...turmas
  ];

  // Aplicar filtros
  const todasTurmas = todasTurmasSemFiltro.filter(turma => {
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

  // Abrir modal para nova turma
  const abrirNovoModal = () => {
    setEditingTurma(null);
    setForm({ nome: '', nivel: '', professor: '', horario: '', dias: '' });
    setSelectedAlunos([]);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <School className="text-[#005DE4]" size={32} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Gestão de Turmas</h2>
            <p className="text-slate-600">Organize e gerencie as turmas da SpeakUp</p>
          </div>
          <button
            onClick={abrirNovoModal}
            className="bg-[#005DE4] text-white px-4 py-2 rounded-full font-bold flex gap-2 items-center hover:bg-[#0048b3] transition-colors"
          >
            <Plus size={20} />
            Nova Turma
          </button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{todasTurmas.length}</div>
            <div className="text-sm text-blue-600">Total de Turmas</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{todasTurmas.reduce((acc, t) => acc + t.alunos, 0)}</div>
            <div className="text-sm text-green-600">Total de Alunos</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{new Set(todasTurmas.map(t => t.professor)).size}</div>
            <div className="text-sm text-orange-600">Professores Ativos</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round((todasTurmas.reduce((acc, t) => acc + t.alunos, 0) / todasTurmas.reduce((acc, t) => acc + t.maxAlunos, 0)) * 100)}%
            </div>
            <div className="text-sm text-purple-600">Taxa de Ocupação</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Search size={16} className="text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">Filtros</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro por Professor */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Professor</label>
              <select
                value={filtros.professor}
                onChange={(e) => setFiltros({...filtros, professor: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4] focus:border-transparent"
              >
                <option value="all">Todos os professores</option>
                {professores.map(prof => (
                  <option key={prof} value={prof}>{prof}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Dia */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dia da Semana</label>
              <select
                value={filtros.dia}
                onChange={(e) => setFiltros({...filtros, dia: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4] focus:border-transparent"
              >
                <option value="all">Todos os dias</option>
                {diasDisponiveis.map(dia => (
                  <option key={dia} value={dia}>{dia}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Nível */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nível</label>
              <select
                value={filtros.nivel}
                onChange={(e) => setFiltros({...filtros, nivel: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DE4] focus:border-transparent"
              >
                <option value="all">Todos os níveis</option>
                {niveis.map(nivel => (
                  <option key={nivel} value={nivel}>Nível {nivel}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Botão Limpar Filtros */}
          {(filtros.professor !== 'all' || filtros.dia !== 'all' || filtros.nivel !== 'all') && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setFiltros({ professor: 'all', dia: 'all', nivel: 'all' })}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Limpar todos os filtros
              </button>
            </div>
          )}
        </div>

        {/* Indicadores de Filtros Ativos */}
        {(filtros.professor !== 'all' || filtros.dia !== 'all' || filtros.nivel !== 'all') && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 bg-[#005DE4] rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              <span className="text-sm font-medium text-blue-800">
                {todasTurmas.length} turma(s) encontrada(s)
              </span>
            </div>
            <div className="text-xs text-blue-600">
              {filtros.professor !== 'all' && `Professor: ${filtros.professor}`}
              {filtros.professor !== 'all' && (filtros.dia !== 'all' || filtros.nivel !== 'all') && ' • '}
              {filtros.dia !== 'all' && `Dia: ${filtros.dia}`}
              {filtros.dia !== 'all' && filtros.nivel !== 'all' && ' • '}
              {filtros.nivel !== 'all' && `Nível: ${filtros.nivel}`}
            </div>
          </div>
        )}

        {/* Lista de Turmas */}
        {todasTurmas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <School size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhuma turma encontrada</h3>
            <p className="text-sm text-gray-500 mb-4">
              {(filtros.professor !== 'all' || filtros.dia !== 'all' || filtros.nivel !== 'all') 
                ? 'Tente ajustar os filtros para ver mais resultados'
                : 'Ainda não há turmas cadastradas no sistema'
              }
            </p>
            {(filtros.professor !== 'all' || filtros.dia !== 'all' || filtros.nivel !== 'all') && (
              <button
                onClick={() => setFiltros({ professor: 'all', dia: 'all', nivel: 'all' })}
                className="text-sm text-[#005DE4] hover:text-[#0048b3] font-medium underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {todasTurmas.map(turma => {
            const alunosDaTurma = getAlunosDaTurma(turma.id);
            const isExpanded = expandedTurmas.has(turma.id);
            
            return (
              <div key={turma.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                {/* Header da Turma */}
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Informações Principais */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <School size={20} className="text-[#005DE4]" />
                          <h3 className="text-lg font-bold text-gray-900">{turma.nome}</h3>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          turma.nivel === 'A1' || turma.nivel === 'A2' ? 'bg-green-100 text-green-700' :
                          turma.nivel === 'A2+' || turma.nivel === 'B1' ? 'bg-yellow-100 text-yellow-700' :
                          turma.nivel === 'B2' || turma.nivel === 'B2+' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          Nível {turma.nivel}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {/* Professor */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            👨‍🏫
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Professor</p>
                            <p className="text-sm font-medium text-gray-900">{turma.professor}</p>
                          </div>
                        </div>
                        
                        {/* Horário */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            🕐
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Horário</p>
                            <p className="text-sm font-medium text-gray-900">{turma.horario}</p>
                            <p className="text-xs text-gray-600">{turma.dias}</p>
                          </div>
                        </div>
                        
                        {/* Alunos */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <Users size={16} className="text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Alunos</p>
                            <p className={`text-sm font-bold ${
                              alunosDaTurma.length >= turma.maxAlunos * 0.8 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {alunosDaTurma.length} de {turma.maxAlunos}
                            </p>
                            <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                              <div 
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  alunosDaTurma.length >= turma.maxAlunos * 0.8 ? 'bg-red-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${(alunosDaTurma.length / turma.maxAlunos) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Botões de Ação */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEditTurma(turma)}
                        className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar turma"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteTurma(turma)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir turma"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => toggleTurmaExpansion(turma.id)}
                        className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                        title={isExpanded ? 'Recolher alunos' : 'Ver alunos'}
                      >
                        <span className="text-sm font-medium">
                          {isExpanded ? 'Ocultar' : 'Ver'} Alunos
                        </span>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Lista de Alunos (Expansível) */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-6">
                    {alunosDaTurma.length > 0 ? (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Users size={16} className="text-gray-600" />
                          <h4 className="font-semibold text-gray-700">
                            Alunos Matriculados ({alunosDaTurma.length})
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {alunosDaTurma.map((aluno, index) => (
                            <div key={`${turma.id}-aluno-${aluno.id || index}`} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                              <div className="w-10 h-10 bg-gradient-to-br from-[#005DE4] to-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                                {aluno.name ? aluno.name.charAt(0).toUpperCase() : 'A'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {aluno.name || 'Nome não informado'}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {aluno.course || 'Sem curso definido'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                          <Users size={24} className="text-gray-400" />
                        </div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Nenhum aluno matriculado</h4>
                        <p className="text-xs text-gray-500">
                          Esta turma ainda não possui alunos cadastrados
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
      </Card>

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
                <label className="block text-sm font-semibold mb-2">Nome da Turma *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({...form, nome: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Ex: Kids Avançado"
                />
              </div>

              {/* Nível */}
              <div>
                <label className="block text-sm font-semibold mb-2">Nível *</label>
                <select
                  value={form.nivel}
                  onChange={(e) => setForm({...form, nivel: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Selecione o nível</option>
                  {niveis.map(nivel => (
                    <option key={nivel} value={nivel}>{nivel}</option>
                  ))}
                </select>
              </div>

              {/* Professor */}
              <div>
                <label className="block text-sm font-semibold mb-2">Professor *</label>
                <select
                  value={form.professor}
                  onChange={(e) => setForm({...form, professor: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Selecione o professor</option>
                  {professores.map(prof => (
                    <option key={prof} value={prof}>{prof}</option>
                  ))}
                </select>
              </div>

              {/* Horário */}
              <div>
                <label className="block text-sm font-semibold mb-2">Horário *</label>
                <input
                  type="text"
                  value={form.horario}
                  onChange={(e) => setForm({...form, horario: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Ex: 14:00 - 15:30"
                />
              </div>
            </div>

            {/* Dias da Semana */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Dias da Semana</label>
              <input
                type="text"
                value={form.dias}
                onChange={(e) => setForm({...form, dias: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Ex: Segunda, Quarta, Sexta"
              />
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
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                  placeholder="Buscar alunos para adicionar..."
                />
                
                {/* Lista de sugestões */}
                {searchAluno && alunosFiltrados.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-t-0 rounded-b-lg max-h-40 overflow-y-auto z-10">
                    {alunosFiltrados.slice(0, 5).map(aluno => (
                      <button
                        key={aluno.id}
                        onClick={() => adicionarAluno(aluno)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 flex justify-between items-center"
                      >
                        <span>{aluno.name}</span>
                        <span className="text-xs text-gray-500">{aluno.course || 'Sem curso'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Alunos Selecionados */}
            {selectedAlunos.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Alunos da Turma ({selectedAlunos.length})</label>
                <div className="flex flex-wrap gap-2">
                  {selectedAlunos.map(aluno => (
                    <div key={aluno.id} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2">
                      <span className="text-sm">{aluno.name}</span>
                      <button
                        onClick={() => removerAluno(aluno.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarTurma}
                className="bg-[#005DE4] text-white px-4 py-2 rounded-lg hover:bg-[#0048b3]"
              >
                {editingTurma ? 'Salvar Alterações' : 'Criar Turma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
