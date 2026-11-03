// Folhas 5–11 do relatório trimestral: alunos, comercial, pedagógico,
// notas, turmas, equipe e plano de ação + como ler.
import { Folha, Secao, Kpi, Grade, Tabela, LinhaValor, Nota } from './Estrutura';
import { Colunas, BarrasH, Progresso } from './Graficos';
import { brl, pct, num, horas } from './formatos';
import { TIPOS_EVENTO } from '../../utils/agendaProfessor';

export function FolhaAlunos({ M, ctx, numero }) {
  const { atual: a, coorte } = M.R;
  const v = M.variacoes;
  const al = M.alunos;
  return (
    <Folha {...ctx} numero={numero}>
      <Secao titulo="Alunos: base e retenção">
        <Grade colunas={4}>
          <Kpi rotulo="Ativos no fim" valor={num(a.alunosAtivos)} variacao={v.alunosAtivos} destaque />
          <Kpi rotulo="Entraram" valor={num(a.novasMatriculas)} variacao={v.novasMatriculas} />
          <Kpi rotulo="Saíram" valor={num(a.cancelamentos)} variacao={v.cancelamentos} inverter />
          <Kpi rotulo="Saldo de alunos" valor={`${a.novasMatriculas - a.cancelamentos >= 0 ? '+' : ''}${num(a.novasMatriculas - a.cancelamentos)}`} sub="entradas − saídas" alerta={a.novasMatriculas < a.cancelamentos} />
          <Kpi rotulo="Churn" valor={pct(a.churnPct)} sub={a.churnPct.disponivel ? `${a.churnPct.cancelados} de ${a.churnPct.base} no início` : a.churnPct.motivo} variacao={v.churnPct} inverter />
          <Kpi rotulo="Contratos assinados" valor={pct(al.contratos.pct, 0)} sub={`${al.contratos.assinados} de ${al.contratos.total} ativos`} alerta={al.contratos.pct != null && al.contratos.pct < 80} />
          <Kpi rotulo="Ativos sem turma" valor={num(al.turmaSit.semTurma)} sub="pagam e não estão em turma" alerta={al.turmaSit.semTurma > 0} />
          <Kpi rotulo="Em 2+ turmas" valor={num(al.turmaSit.emVarias)} sub="conferir se é de propósito" />
        </Grade>
      </Secao>

      <Secao titulo="Entradas × saídas, últimos 12 meses">
        <Colunas
          dados={M.serie.map((s) => ({ rotulo: s.curto, valores: [s.novas, s.cancelamentos] }))}
          series={[{ nome: 'Matrículas' }, { nome: 'Cancelamentos' }]}
          formato={(n) => num(n)}
          altura={135}
          rotularTodas
        />
      </Secao>
      <Secao titulo="Alunos ativos, últimos 12 meses">
        <Colunas dados={M.serie.map((s) => ({ rotulo: s.curto, valores: [s.ativos] }))} series={[{ nome: 'Alunos ativos' }]} formato={(n) => num(n)} altura={115} rotularTodas />
      </Secao>

      <div className="grid grid-cols-2 gap-5">
        <Secao titulo="Por que saíram" sub="motivo registrado no cancelamento">
          <BarrasH dados={al.motivos.map((m) => ({ rotulo: m.motivo, valor: m.qtd }))} formato={(n) => num(n)} largRotulo={130} cor="var(--su-orange-600)" />
        </Secao>
        <Secao titulo="Retenção por safra" sub="dos que entraram em cada mês, quantos seguem">
          <Tabela
            colunas={[
              { titulo: 'Entrada', valor: (l) => l.safra },
              { titulo: 'Entraram', alinhar: 'dir', valor: (l) => num(l.entraram) },
              { titulo: 'Seguem', alinhar: 'dir', valor: (l) => num(l.ativos) },
              { titulo: 'Retenção', alinhar: 'dir', largura: 90, valor: (l) => <Progresso valor={l.retencaoPct} meta={80} /> },
            ]}
            linhas={coorte.map((c) => ({ ...c, chave: c.safra }))}
          />
        </Secao>
      </div>
    </Folha>
  );
}

export function FolhaComercial({ M, ctx, numero }) {
  const { atual: a } = M.R;
  const v = M.variacoes;
  const f = M.comercial.funil;
  const comp = M.ped.geral.compromissos;
  return (
    <Folha {...ctx} numero={numero}>
      <Secao titulo="Comercial">
        <Grade colunas={4}>
          <Kpi rotulo="Leads captados" valor={num(a.leadsCaptados)} variacao={v.leadsCaptados} destaque />
          <Kpi rotulo="Conversão" valor={pct(a.taxaConversao)} sub={a.taxaConversao.disponivel ? 'aproximada (lead → matriculado)' : a.taxaConversao.motivo} variacao={v.taxaConversao} />
          <Kpi rotulo="CAC" valor={brl(a.cac)} sub={a.cac.disponivel ? 'marketing ÷ novas matrículas' : a.cac.motivo} variacao={v.cac} inverter />
          <Kpi rotulo="LTV ÷ CAC" valor={a.ltvCac.disponivel ? `${num(a.ltvCac.valor, 1)}x` : '—'} sub="saudável a partir de 3x" variacao={v.ltvCac} alerta={a.ltvCac.disponivel && a.ltvCac.valor < 3} />
          <Kpi rotulo="Aulas experimentais" valor={num(comp.experimental || 0)} sub="agendadas na agenda dos professores" />
          <Kpi rotulo="Testes de nível" valor={num(comp.nivelamento || 0)} sub="agendados" />
          <Kpi rotulo="Matrículas por lead" valor={pct(a.leadsCaptados ? (a.novasMatriculas / a.leadsCaptados) * 100 : null, 0)} sub="novas matrículas ÷ leads (todas as origens)" />
          <Kpi rotulo="Material vendido" valor={brl(a.receitaNaoRecorrente)} sub="vendas no trimestre" />
        </Grade>
      </Secao>

      <div className="grid grid-cols-2 gap-5">
        <Secao titulo="Funil dos leads do trimestre" sub={`${num(f.total)} lead(s) criados no período, situação de hoje`}>
          <BarrasH
            dados={[
              { rotulo: 'Novo', valor: f.novo },
              { rotulo: 'Em contato', valor: f.contato },
              { rotulo: 'Matriculado', valor: f.matriculado },
              { rotulo: 'Perdido', valor: f.perdido },
              ...(f.outros ? [{ rotulo: 'Outros', valor: f.outros }] : []),
            ]}
            formato={(n) => `${num(n)}${f.total ? ` · ${pct((n / f.total) * 100, 0)}` : ''}`}
            largRotulo={90}
          />
        </Secao>
        <Secao titulo="Agenda comercial" sub="compromissos marcados pela secretaria">
          {Object.keys(comp).length === 0
            ? <p className="text-[10.5px] text-content-faint">Nenhum compromisso agendado no período.</p>
            : Object.entries(comp).map(([tipo, n]) => <LinhaValor key={tipo} rotulo={TIPOS_EVENTO[tipo] || tipo} valor={num(n)} />)}
        </Secao>
      </div>

      <Secao titulo="Alunos por curso e book" sub="base ativa no fim do período">
        <div className="columns-2 gap-6">
          <BarrasH dados={M.alunos.cursos.slice(0, 24).map((c) => ({ rotulo: c.grupo, valor: c.qtd }))} formato={(n) => num(n)} largRotulo={120} />
        </div>
      </Secao>
      <Nota>Leads não registram a origem (Instagram, indicação…): CAC por canal fica indisponível até esse campo existir no cadastro de lead.</Nota>
    </Folha>
  );
}

export function FolhaPedagogico({ M, ctx, numero }) {
  const g = M.ped.geral;
  return (
    <Folha {...ctx} numero={numero}>
      <Secao titulo="Pedagógico: aulas e frequência" sub={M.situacao.tipo === 'parcial' ? 'aulas previstas = as que já deveriam ter acontecido até hoje' : null}>
        <Grade colunas={4}>
          <Kpi rotulo="Aulas previstas" valor={num(g.previstas)} sub="pela grade, sem feriado/recesso" />
          <Kpi rotulo="Aulas dadas" valor={num(g.dadas)} sub={`${horas(g.minutosDados)} de aula com avulsas`} destaque />
          <Kpi rotulo="Registro" valor={pct(g.registroPct, 0)} sub={`${num(g.naoRegistradas)} aula(s) sem registro`} alerta={g.registroPct != null && g.registroPct < 90} />
          <Kpi rotulo="Sem aula" valor={num(g.semAula)} sub="feriado, recesso ou cancelada" />
          <Kpi rotulo="Frequência média" valor={pct(g.frequencia, 0)} sub={`${num(g.chamadas)} presenças/faltas lançadas`} alerta={g.frequencia != null && g.frequencia < 75} />
          <Kpi rotulo="Reposições" valor={num(g.reposicoes)} sub="aulas avulsas" />
          <Kpi rotulo="Aulas extras" valor={num(g.extras)} sub="aulas avulsas" />
          <Kpi rotulo="Aulas sem conteúdo" valor={num(g.semConteudo)} sub={`${num(g.semChamada)} sem chamada`} alerta={g.semConteudo > 0} />
        </Grade>
      </Secao>
      <Secao titulo="Alunos com frequência abaixo de 75%" sub="mínimo de 3 aulas com chamada no trimestre">
        <Tabela
          colunas={[
            { titulo: 'Aluno', valor: (l) => l.nome },
            { titulo: 'Turma', valor: (l) => l.turma },
            { titulo: 'Presenças', alinhar: 'dir', valor: (l) => `${l.presentes}/${l.total}` },
            { titulo: 'Frequência', alinhar: 'dir', largura: 110, valor: (l) => <Progresso valor={l.pct} meta={75} /> },
          ]}
          linhas={M.ped.emRisco.map((r) => ({ ...r, chave: r.alunoId }))}
          limite={30}
          vazio="Nenhum aluno abaixo de 75% no período."
        />
      </Secao>
    </Folha>
  );
}

export function FolhaNotas({ M, ctx, numero }) {
  const n = M.notas;
  const conceitos = Object.entries(n.conceitos).map(([c, q]) => ({ rotulo: c, valor: q }));
  return (
    <Folha {...ctx} numero={numero}>
      <Secao titulo="Notas do semestre" sub={`semestre ${M.intervalo.semestre.replace('-', ' / ')} · total de 100 pontos (escrita 50, áudio 30, oral 20)`}>
        <Grade colunas={4}>
          <Kpi rotulo="Média geral" valor={n.media == null ? '—' : num(n.media, 1)} sub="alunos com as 3 partes lançadas" destaque />
          <Kpi rotulo="Alunos com nota completa" valor={num(n.alunosComTotal)} sub={`${num(n.alunosComNota)} com alguma nota`} />
          <Kpi rotulo="Abaixo de 60" valor={num(n.abaixoDe60)} sub="conceito D ou F" alerta={n.abaixoDe60 > 0} />
          <Kpi rotulo="Turmas com prova" valor={num(n.turmasComProva)} sub={`de ${num(M.turmasDetalhe.length)} turmas`} />
        </Grade>
      </Secao>
      <div className="grid grid-cols-2 gap-5">
        <Secao titulo="Distribuição de conceitos">
          <BarrasH dados={conceitos} formato={(q) => num(q)} largRotulo={36} />
        </Secao>
        <Secao titulo="Média por turma">
          <Tabela
            colunas={[
              { titulo: 'Turma', valor: (l) => l.nome },
              { titulo: 'Alunos', alinhar: 'dir', valor: (l) => num(l.alunos) },
              { titulo: 'Média', alinhar: 'dir', largura: 100, valor: (l) => <Progresso valor={l.media} meta={70} /> },
            ]}
            linhas={n.porTurma}
            limite={30}
            vazio="Nenhuma turma com as 3 partes lançadas ainda."
          />
        </Secao>
      </div>
    </Folha>
  );
}

export function FolhaTurmas({ M, ctx, numero }) {
  const meta = M.params.metaOcupacaoPct;
  const t = M.turmasDetalhe;
  const soma = (f) => t.reduce((s, x) => s + (f(x) || 0), 0);
  return (
    <Folha {...ctx} numero={numero}>
      <Secao titulo="Turmas" sub={`receita = mensalidades dos alunos ativos (mês) · custo = hora-aula com encargos · ocupação: meta ${meta}%`}>
        <Tabela
          colunas={[
            { titulo: 'Turma', valor: (l) => <span className="font-semibold text-content-strong">{l.nome}</span> },
            { titulo: 'Professor', valor: (l) => l.professor },
            { titulo: 'Alunos', alinhar: 'dir', valor: (l) => `${l.matriculados}/${l.capacidade || '?'}` },
            { titulo: 'Ocupação', largura: 96, valor: (l) => <Progresso valor={l.ocupacaoPct} meta={meta} /> },
            { titulo: 'Receita/mês', alinhar: 'dir', valor: (l) => brl(l.receita) },
            { titulo: 'Custo/mês', alinhar: 'dir', valor: (l) => brl(l.custoProfessor) },
            { titulo: 'Margem', alinhar: 'dir', valor: (l) => brl(l.margemContribuicao) },
            { titulo: 'Registro', largura: 96, valor: (l) => <Progresso valor={l.ped?.registroPct} meta={90} /> },
            { titulo: 'Freq.', alinhar: 'dir', valor: (l) => pct(l.ped?.frequencia, 0) },
          ]}
          linhas={t}
          limite={34}
          total={{
            Alunos: `${soma((x) => x.matriculados)}/${soma((x) => x.capacidade)}`,
            'Receita/mês': brl(soma((x) => x.receita)), 'Custo/mês': brl(soma((x) => x.custoProfessor)), Margem: brl(soma((x) => x.margemContribuicao)),
          }}
        />
      </Secao>
    </Folha>
  );
}

export function FolhaEquipe({ M, ctx, numero }) {
  const e = M.equipe;
  return (
    <Folha {...ctx} numero={numero}>
      <Secao titulo="Equipe" sub="aulas do trimestre; receita = mensalidades dos alunos do professor (mês)">
        <Tabela
          colunas={[
            { titulo: 'Professor', valor: (l) => <span className="font-semibold text-content-strong">{l.nome}</span> },
            { titulo: 'Turmas', alinhar: 'dir', valor: (l) => num(l.turmas) },
            { titulo: 'Alunos', alinhar: 'dir', valor: (l) => num(l.alunos) },
            { titulo: 'h/sem', alinhar: 'dir', valor: (l) => num(l.horasSemana, 1) },
            { titulo: 'Previstas', alinhar: 'dir', valor: (l) => num(l.previstas) },
            { titulo: 'Dadas', alinhar: 'dir', valor: (l) => num(l.dadas) },
            { titulo: 'Registro', largura: 96, valor: (l) => <Progresso valor={l.registroPct} meta={90} /> },
            { titulo: 'Avulsas', alinhar: 'dir', valor: (l) => num(l.reposicoes + l.extras) },
            { titulo: 'Horas dadas', alinhar: 'dir', valor: (l) => horas(l.minutosDados) },
            { titulo: 'Freq.', alinhar: 'dir', valor: (l) => pct(l.frequencia, 0) },
            { titulo: 'Custo (est.)', alinhar: 'dir', valor: (l) => brl(l.custoEstimado) },
            { titulo: 'Receita/mês', alinhar: 'dir', valor: (l) => brl(l.receitaMensal) },
          ]}
          linhas={e}
          vazio="Nenhum professor com turma no período."
        />
      </Secao>
      <Secao titulo="Horas de aula dadas por professor" sub="grade + reposições e aulas extras">
        <BarrasH dados={e.map((p) => ({ rotulo: p.nome, valor: p.minutosDados }))} formato={horas} largRotulo={130} />
      </Secao>
      <Secao titulo="Aulas registradas × previstas por professor">
        <BarrasH dados={e.map((p) => ({ rotulo: p.nome, valor: p.registroPct, sub: `${p.dadas} de ${p.previstas}` }))} formato={(n) => pct(n, 0)} largRotulo={130} />
      </Secao>
      <Nota>Custo estimado = horas dadas × hora-aula ({brl(M.params.valorHoraAula)}) × (1 + {num(M.params.encargosProfessorPct)}% de encargos), dos Parâmetros. Não substitui a folha de pagamento.</Nota>
    </Folha>
  );
}

const COMO_LER = [
  ['Receita recebida', 'parcelas pagas no período (data de pagamento); material/avulsos à parte.'],
  ['MRR', 'soma das mensalidades dos alunos ativos no fim do período.'],
  ['Churn', 'cancelamentos do trimestre ÷ alunos ativos no início do trimestre.'],
  ['Inadimplência', 'sempre em R$: saldo em atraso das parcelas do trimestre ÷ previsto do trimestre.'],
  ['Carteira vencida', 'todo saldo em atraso no fim do período, de qualquer mês.'],
  ['Ticket médio', 'receita total do período ÷ alunos ativos no fim.'],
  ['LTV', 'ticket médio ÷ churn — quanto um aluno deixa, em média, enquanto fica.'],
  ['CAC', 'despesas de marketing ÷ novas matrículas.'],
  ['Ponto de equilíbrio', 'custo fixo mensal ÷ mensalidade média = alunos necessários para pagar a estrutura.'],
  ['Aulas previstas', 'ocorrências da grade de cada turma no período, menos feriados e recessos do calendário letivo.'],
  ['Registro', 'aulas dadas ÷ aulas previstas que já passaram (registro feito no gestão ou pelo LMS).'],
  ['Frequência', 'presenças ÷ chamadas lançadas, só em aulas realizadas.'],
  ['Índice de saúde', 'inadimplência, churn, margem e ocupação, 25 pontos cada, contra as metas dos Parâmetros.'],
];

export function FolhaPlano({ M, ctx, numero }) {
  const p = M.params;
  return (
    <Folha {...ctx} numero={numero}>
      <Secao titulo="Plano de ação" sub="prioridade 1 = fazer primeiro">
        <Tabela
          colunas={[
            { titulo: 'P', largura: 18, valor: (l) => <span className="font-bold text-accent">{l.prioridade}</span> },
            { titulo: 'Área', largura: 80, valor: (l) => <span className="font-semibold text-content-strong">{l.area}</span> },
            { titulo: 'Ação', valor: (l) => l.acao },
            { titulo: 'Por quê', largura: 170, valor: (l) => <span className="text-content-muted">{l.porque}</span> },
          ]}
          linhas={M.plano}
        />
      </Secao>
      {M.alertas.length > 9 && (
        <Secao titulo="Demais alertas">
          <ul className="list-disc pl-4 text-[10px] leading-snug flex flex-col gap-0.5">
            {M.alertas.slice(9).map((a, i) => <li key={i}><strong>{a.titulo}.</strong> {a.detalhe}</li>)}
          </ul>
        </Secao>
      )}
      <div className="grid grid-cols-2 gap-5">
        <Secao titulo="Metas usadas" sub="Parâmetros do gestão">
          <LinhaValor rotulo="Churn máximo" valor={pct(p.metaChurnPct, 0)} />
          <LinhaValor rotulo="Inadimplência máxima" valor={pct(p.metaInadimplenciaPct, 0)} />
          <LinhaValor rotulo="Ocupação mínima das turmas" valor={pct(p.metaOcupacaoPct, 0)} />
          <LinhaValor rotulo="Hora-aula do professor" valor={brl(p.valorHoraAula, { centavos: true })} />
          <LinhaValor rotulo="Encargos sobre a hora-aula" valor={pct(p.encargosProfessorPct, 0)} />
          <LinhaValor rotulo="Registro de aulas (referência)" valor="90%" />
          <LinhaValor rotulo="Frequência mínima do aluno" valor="75%" />
        </Secao>
        <Secao titulo="Como ler">
          <dl className="text-[9.5px] leading-snug flex flex-col gap-1">
            {COMO_LER.map(([t, d]) => (
              <div key={t}><dt className="inline font-semibold text-content-strong">{t}: </dt><dd className="inline text-content-muted">{d}</dd></div>
            ))}
          </dl>
        </Secao>
      </div>
    </Folha>
  );
}
