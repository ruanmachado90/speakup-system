import React from 'react';
import {
  ChevronDown, UserCheck, School, GraduationCap, Clock, Copy, Check,
} from 'lucide-react';
import { buildProfessorSlug } from '../../utils/turmas';

/**
 * Seção colapsável de relatório de professores.
 * Extraído de Turmas.jsx para isolar a lógica de exibição de stats.
 */
export default function ProfessorReport({
  professorStats,
  expandedProfessores,
  copiedLink,
  onToggleProfessor,
  onCopyLink,
}) {
  const [showReport, setShowReport] = React.useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header clicável */}
      <button
        onClick={() => setShowReport((v) => !v)}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
        aria-expanded={showReport}
        aria-controls="professor-report-body"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
            <UserCheck size={20} className="text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-900">Relatório de Professores</h3>
            <p className="text-sm text-gray-500">Horas trabalhadas, turmas e alunos por professor</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold">
            {professorStats.length} {professorStats.length === 1 ? 'professor' : 'professores'}
          </span>
          <ChevronDown
            size={20}
            className={`text-gray-400 transition-transform duration-200 ${showReport ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Corpo colapsável */}
      {showReport && (
        <div id="professor-report-body" className="border-t border-gray-200 bg-gray-50">
          {professorStats.length === 0 ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                <UserCheck size={20} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Nenhum professor com turmas ativas</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {professorStats.map((prof) => {
                const isExpanded = expandedProfessores.has(prof.nome);
                return (
                  <div
                    key={prof.nome}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200"
                  >
                    {/* Header do Professor */}
                    <button
                      onClick={() => onToggleProfessor(prof.nome)}
                      className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-lg">
                            {prof.nome.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="text-left">
                          <h4 className="font-bold text-gray-900 text-lg">{prof.nome}</h4>
                          <p className="text-sm text-gray-500">
                            {prof.totalTurmas} {prof.totalTurmas === 1 ? 'turma' : 'turmas'} ·{' '}
                            {prof.totalAlunos} {prof.totalAlunos === 1 ? 'aluno' : 'alunos'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-purple-600">
                            {prof.horasPorSemana.toFixed(1)}h
                          </div>
                          <div className="text-xs text-gray-500 font-medium">por semana</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {prof.horasPorMes.toFixed(0)}h
                          </div>
                          <div className="text-xs text-gray-500 font-medium">por mês</div>
                        </div>

                        {/* Copiar link — fora do button pai */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const slug = buildProfessorSlug(prof.nome);
                              const url = `${window.location.origin}/professor/${slug}`;
                              navigator.clipboard.writeText(url).then(() => onCopyLink(prof.nome));
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              copiedLink === prof.nome
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                : 'bg-white border border-gray-300 text-gray-600 hover:border-[#005DE4] hover:text-[#005DE4]'
                            }`}
                            title="Copiar link do painel do professor"
                          >
                            {copiedLink === prof.nome ? <Check size={13} /> : <Copy size={13} />}
                            {copiedLink === prof.nome ? 'Copiado!' : 'Copiar link'}
                          </button>
                        </div>

                        <ChevronDown
                          size={20}
                          className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </button>

                    {/* Detalhes */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-5 bg-gray-50/50 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <StatCard color="blue" icon={<School size={16} className="text-blue-600" />} label="Turmas" value={prof.totalTurmas} sub="turmas ativas" />
                          <StatCard color="green" icon={<GraduationCap size={16} className="text-green-600" />} label="Alunos" value={prof.totalAlunos} sub={prof.totalTurmas > 0 ? `${(prof.totalAlunos / prof.totalTurmas).toFixed(1)} por turma` : '-'} />
                          <StatCard color="purple" icon={<Clock size={16} className="text-purple-600" />} label="Semanal" value={`${prof.horasPorSemana.toFixed(1)}h`} sub="horas por semana" />
                          <StatCard color="orange" icon={<Clock size={16} className="text-orange-600" />} label="Mensal" value={`${prof.horasPorMes.toFixed(0)}h`} sub="horas por mês" />
                        </div>

                        {/* Lista de Turmas */}
                        <div>
                          <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <School size={16} className="text-gray-600" />
                            Turmas ({prof.turmas.length})
                          </h5>
                          <div className="space-y-2">
                            {prof.turmas.map((turma, idx) => (
                              <div
                                key={`${prof.nome}-turma-${idx}`}
                                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h6 className="font-bold text-gray-900">{turma.nome}</h6>
                                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                                        {turma.nivel}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                      <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-gray-400" />
                                        <span className="text-gray-700">{turma.horario}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-500 text-xs">📅</span>
                                        <span className="text-gray-700">{turma.dias}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <GraduationCap size={14} className="text-gray-400" />
                                        <span className="text-gray-700">
                                          {turma.alunos.length}/{turma.maxAlunos} alunos
                                        </span>
                                      </div>
                                      <span className="text-purple-600 font-semibold">
                                        {turma.horasSemanais.toFixed(1)}h/semana
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {turma.alunos.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                                    {turma.alunos.slice(0, 5).map((a, i) => (
                                      <span
                                        key={`${turma.id}-pa-${i}`}
                                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                                      >
                                        {a.name}
                                      </span>
                                    ))}
                                    {turma.alunos.length > 5 && (
                                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                        +{turma.alunos.length - 5} mais
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Estimativa */}
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
                                  <span className="ml-2 font-bold text-purple-700">
                                    {prof.horasPorSemana.toFixed(1)}h
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Horas/Mês:</span>
                                  <span className="ml-2 font-bold text-purple-700">
                                    {prof.horasPorMes.toFixed(0)}h
                                  </span>
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

              {/* Resumo geral */}
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-6 text-white mt-6">
                <h5 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <span>📊</span> Resumo Geral
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SummaryItem label="Total de Professores" value={professorStats.length} />
                  <SummaryItem label="Total de Turmas" value={professorStats.reduce((a, p) => a + p.totalTurmas, 0)} />
                  <SummaryItem label="Total de Alunos" value={professorStats.reduce((a, p) => a + p.totalAlunos, 0)} />
                  <SummaryItem label="Horas Semanais" value={`${professorStats.reduce((a, p) => a + p.horasPorSemana, 0).toFixed(1)}h`} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ color, icon, label, value, sub }) {
  const borderMap = { blue: 'border-blue-200', green: 'border-green-200', purple: 'border-purple-200', orange: 'border-orange-200' };
  const textMap = { blue: 'text-blue-600 text-xs font-semibold uppercase', green: 'text-green-600 text-xs font-semibold uppercase', purple: 'text-purple-600 text-xs font-semibold uppercase', orange: 'text-orange-600 text-xs font-semibold uppercase' };
  const valueMap = { blue: 'text-blue-700', green: 'text-green-700', purple: 'text-purple-700', orange: 'text-orange-700' };
  return (
    <div className={`bg-white border ${borderMap[color]} rounded-lg p-4`}>
      <div className={`flex items-center gap-2 mb-2`}>
        {icon}
        <span className={textMap[color]}>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${valueMap[color]}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{sub}</div>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div>
      <div className="text-white/80 text-sm mb-1">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
