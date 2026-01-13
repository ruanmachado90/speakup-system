import { Table } from '../components';
import { useState, useMemo, Fragment } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Leads = ({ setModal, leads = [] }) => {
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' ou 'all'

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getMonthYear = (date) => {
    return `${date.getMonth()}-${date.getFullYear()}`;
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    
    return leads.filter(lead => {
      const leadDate = lead.createdAt?.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt);
      const leadMonthYear = getMonthYear(leadDate);
      const currentMonthYear = getMonthYear(currentMonth);
      
      const matchesMonth = viewMode === 'all' || leadMonthYear === currentMonthYear;
      const matchesCourse = selectedCourse === 'all' || lead.interest?.toLowerCase().includes(selectedCourse.toLowerCase());
      const matchesLevel = selectedLevel === 'all' || lead.level === selectedLevel;

      return matchesMonth && matchesCourse && matchesLevel;
    });
  }, [leads, currentMonth, selectedCourse, selectedLevel, viewMode]);

  const conversionRate = useMemo(() => {
    if (!filteredLeads || filteredLeads.length === 0) return 0;
    const matriculados = filteredLeads.filter(lead => lead.status === 'matriculado').length;
    return ((matriculados / filteredLeads.length) * 100).toFixed(1);
  }, [filteredLeads]);

  const uniqueCourses = useMemo(() => {
    if (!leads) return [];
    const courses = leads
      .map(lead => lead.interest)
      .filter(Boolean)
      .map(course => course.trim());
    return [...new Set(courses)];
  }, [leads]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-black text-[#00234b]">Leads</h2>
        <button
          onClick={() => setModal({ open: true, type: 'lead', data: null })}
          className="px-6 py-3 rounded-full bg-[#005DE4] text-white font-bold hover:bg-[#004BB8]"
        >
          + Novo Lead
        </button>
      </div>

      {/* Card de Taxa de Conversão */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90 mb-1">Taxa de Conversão</p>
            <p className="text-4xl font-bold">{conversionRate}%</p>
            <p className="text-xs opacity-80 mt-2">
              {filteredLeads.filter(l => l.status === 'matriculado').length} matriculados de {filteredLeads.length} leads
            </p>
          </div>
          <div className="text-5xl opacity-20">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <polyline points="16 11 18 13 22 9"></polyline>
            </svg>
          </div>
        </div>
      </div>

      {/* Filtros e Navegação de Mês */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Toggle de Visualização */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'month' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'all' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
          </div>

          {/* Navegação de Mês */}
          {viewMode === 'month' && (
            <div className="flex items-center gap-2">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="font-medium text-sm min-w-[140px] text-center capitalize">
                {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Próximo mês"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* Filtro por Curso */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Curso:</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              {uniqueCourses.map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Nível */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Nível:</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="Iniciante">Iniciante</option>
              <option value="Básico">Básico</option>
              <option value="Intermediário">Intermediário</option>
              <option value="Avançado">Avançado</option>
            </select>
          </div>

          {/* Total de Leads Filtrados */}
          <div className="ml-auto text-sm text-slate-600">
            <span className="font-medium">{filteredLeads.length}</span> leads encontrados
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6">
        {leads.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            Nenhum lead cadastrado
          </div>
        ) : (
          <Table
            header={[
              <span key="nome">Nome</span>,
              <span key="contato">Contato</span>,
              <span key="interesse">Curso de Interesse</span>,
              <span key="nivel">Nível</span>,
              <span key="status">Status</span>,
              <span key="data">Data de Cadastro</span>,
              <span key="obs">Observações</span>,
              <span key="acoes">Ações</span>
            ]}
            data={filteredLeads}
            render={(lead, index) => {
              const getStatusColor = (status) => {
                const colors = {
                  novo: 'bg-blue-100 text-blue-700',
                  contato: 'bg-yellow-100 text-yellow-700',
                  matriculado: 'bg-green-100 text-green-700',
                  perdido: 'bg-red-100 text-red-700'
                };
                return colors[status] || 'bg-slate-100 text-slate-700';
              };

              const getStatusLabel = (status) => {
                const labels = {
                  novo: 'Novo',
                  contato: 'Em Contato',
                  matriculado: 'Matriculado',
                  perdido: 'Perdido'
                };
                return labels[status] || status;
              };

              return (
                <Fragment key={lead.id || index}>
                  <td className="px-6 py-3 font-medium text-xs">{lead.name}</td>
                  <td className="px-6 py-3 text-xs">{lead.contact || '-'}</td>
                  <td className="px-6 py-3 text-xs">{lead.interest || '-'}</td>
                  <td className="px-6 py-3 text-xs">{lead.level || '-'}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap ${getStatusColor(lead.status)}`}>
                      {getStatusLabel(lead.status)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs">{formatDate(lead.createdAt)}</td>
                  <td className="px-6 py-3 text-xs text-slate-600 max-w-xs truncate">
                    {lead.notes || '-'}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => setModal({ open: true, type: 'lead', data: lead })}
                      className="text-slate-400 hover:text-blue-600"
                      aria-label="Editar lead"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                  </td>
                </Fragment>
              );
            }}
          />
        )}
      </div>
    </div>
  );
};
