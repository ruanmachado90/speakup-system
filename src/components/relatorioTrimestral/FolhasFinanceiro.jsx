// Folhas 1–4 do relatório trimestral: sumário executivo, receita e
// cobrança, despesas/resultado/caixa e inadimplência.
import { Folha, Secao, Kpi, Grade, Tabela, Alertas, LinhaValor, Nota } from './Estrutura';
import { Colunas, BarrasH, Progresso } from './Graficos';
import { brl, brlCurto, pct, num, horas, dataBR } from './formatos';

const NIVEL_SAUDE = { bom: 'Saudável', atencao: 'Atenção', critico: 'Crítico' };

export function FolhaSumario({ M, ctx, numero }) {
  const { atual: a, indiceSaude: saude } = M.R;
  const v = M.variacoes;
  const g = M.ped.geral;
  return (
    <Folha {...ctx} numero={numero}>
      <div className="rt-bloco">
        <p className="text-[10px] font-semibold uppercase tracking-caps text-accent">Relatório trimestral</p>
        <h1 className="font-display font-extrabold text-[28px] leading-tight text-content-strong">{M.intervalo.rotulo}</h1>
        <p className="text-[11.5px] text-content-muted">
          {M.intervalo.faixa} · {dataBR(M.intervalo.inicio)} a {dataBR(M.intervalo.fim)}
          {M.situacao.tipo === 'parcial' && (
            <span className="ml-2 px-2 py-px rounded-pill border border-warning bg-warning-bg text-warning-fg text-[9.5px] font-bold uppercase tracking-caps">
              Parcial · dados até {dataBR(M.situacao.ate)}
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-[150px_1fr] gap-4 rt-bloco">
        <div className="rounded-su-md border border-accent bg-blues-50 p-3 text-center flex flex-col justify-center">
          <p className="text-[9px] font-semibold uppercase tracking-caps text-content-muted">Índice de saúde</p>
          <p className="font-display font-extrabold text-[40px] leading-none text-content-strong tabular-nums mt-1">{saude.disponivel ? Math.round(saude.valor) : '—'}</p>
          <p className="text-[10px] text-content-muted">de 100 · {NIVEL_SAUDE[saude.nivel] || 'sem dados'}</p>
        </div>
        <div>
          <p className="text-[10px] text-content-muted mb-1.5">Quatro fatores de 25 pontos, medidos contra as metas dos Parâmetros. {saude.motivo}.</p>
          <div className="flex flex-col gap-1">
            {saude.fatores.map((f) => (
              <div key={f.nome} className="grid grid-cols-[130px_1fr_110px] gap-2 items-center text-[10px]">
                <span className="font-semibold text-content-strong">{f.nome}</span>
                <Progresso valor={(f.pts / 25) * 100} meta={80} />
                <span className="text-right text-content-muted tabular-nums">{pct(f.valor)} · meta {pct(f.meta, 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Secao
        titulo="Números do trimestre"
        sub={M.situacao.tipo === 'parcial'
          ? 'Trimestre em andamento: setas só em alunos ativos, MRR, mensalidade e carteira (comparar meio trimestre com um inteiro engana)'
          : 'Setas: comparação com o trimestre anterior e com o mesmo trimestre do ano passado'}
      >
        <Grade colunas={4}>
          <Kpi rotulo="Receita total" valor={brl(a.receitaTotal)} sub="mensalidades + material" variacao={v.receitaTotal} destaque />
          <Kpi rotulo="Resultado" valor={brl(a.resultado)} sub="recebido − despesas" variacao={v.resultado} alerta={a.resultado < 0} />
          <Kpi rotulo="Margem operacional" valor={pct(a.margemOperacional)} variacao={v.margemOperacional} />
          <Kpi rotulo="MRR (fim do período)" valor={brl(a.mrr)} sub="soma das mensalidades ativas" variacao={v.mrr} />
          <Kpi rotulo="Alunos ativos" valor={num(a.alunosAtivos)} variacao={v.alunosAtivos} destaque />
          <Kpi rotulo="Novas matrículas" valor={num(a.novasMatriculas)} variacao={v.novasMatriculas} />
          <Kpi rotulo="Cancelamentos" valor={num(a.cancelamentos)} variacao={v.cancelamentos} inverter />
          <Kpi rotulo="Churn do trimestre" valor={pct(a.churnPct)} sub={`meta ${pct(M.params.metaChurnPct, 0)}`} variacao={v.churnPct} inverter alerta={a.churnPct.valor > M.params.metaChurnPct} />
          <Kpi rotulo="Inadimplência do trimestre" valor={pct(a.inadimplenciaMes.pct)} sub={`${brl(a.inadimplenciaMes.valor)} · meta ${pct(M.params.metaInadimplenciaPct, 0)}`} variacao={v.inadimplenciaMes} inverter alerta={a.inadimplenciaMes.pct > M.params.metaInadimplenciaPct} />
          <Kpi rotulo="Ticket médio" valor={brl(a.ticketMedio)} sub="receita ÷ alunos ativos" variacao={v.ticketMedio} />
          <Kpi rotulo="Aulas dadas" valor={num(g.dadas)} sub={`${pct(g.registroPct, 0)} registradas · ${horas(g.minutosDados)} de aula`} alerta={g.registroPct != null && g.registroPct < 90} />
          <Kpi rotulo="Frequência média" valor={pct(g.frequencia, 0)} sub={`${M.ped.emRisco.length} aluno(s) abaixo de 75%`} alerta={g.frequencia != null && g.frequencia < 75} />
        </Grade>
      </Secao>

      <Secao titulo="Alertas" sub="Gerados por regra a partir das metas — o detalhe está nas folhas seguintes">
        <Alertas itens={M.alertas.slice(0, 9)} />
        {M.alertas.length > 9 && <Nota>+ {M.alertas.length - 9} alerta(s) — ver plano de ação na última folha.</Nota>}
      </Secao>
    </Folha>
  );
}

export function FolhaReceita({ M, ctx, numero }) {
  const { atual: a } = M.R;
  const v = M.variacoes;
  const c = a.cobrancas;
  const linhasMes = a.meses.map((m) => ({
    chave: m.periodo.rotulo, mes: m.periodo.rotulo, previsto: m.receitaPrevista, recebido: m.receitaRecebida,
    material: m.receitaNaoRecorrente.valor || 0, despesa: m.despesaTotal, resultado: m.receitaRecebida + (m.receitaNaoRecorrente.valor || 0) - m.despesaTotal,
  }));
  return (
    <Folha {...ctx} numero={numero}>
      <Secao titulo="Receita e cobrança">
        <Grade colunas={4}>
          <Kpi rotulo="Previsto (mensalidades)" valor={brl(a.receitaPrevista)} sub="parcelas com vencimento no trimestre" />
          <Kpi rotulo="Recebido (mensalidades)" valor={brl(a.receitaRecebida)} sub={`${pct(a.receitaPrevista ? (a.receitaRecebida / a.receitaPrevista) * 100 : null, 0)} do previsto`} variacao={v.receitaRecebida} destaque />
          <Kpi rotulo="Material e avulsos" valor={brl(a.receitaNaoRecorrente)} sub="vendas (receita não recorrente)" />
          <Kpi rotulo="Mensalidade média" valor={brl(a.mensalidadeMedia)} sub="MRR ÷ alunos ativos" variacao={v.mensalidadeMedia} />
          <Kpi rotulo="LTV" valor={brl(a.ltv)} sub="ticket ÷ churn (valor de vida)" variacao={v.ltv} />
          <Kpi rotulo="Custo por aluno" valor={brl(a.custoPorAluno)} sub="despesa ÷ alunos ativos" variacao={v.custoPorAluno} inverter />
          <Kpi rotulo="Caixa no fim" valor={brl(a.saldoCaixa)} sub={a.saldoCaixa.disponivel ? `início ${brl(a.saldoCaixa.saldoInicial)}` : 'saldo bancário não registrado'} variacao={v.saldoCaixa} />
          <Kpi rotulo="Receita / aluno / mês" valor={brl(a.alunosAtivos ? a.receitaTotal / 3 / a.alunosAtivos : null)} sub="receita total ÷ 3 ÷ ativos" />
        </Grade>
      </Secao>

      <Secao titulo="Mês a mês">
        <Tabela
          colunas={[
            { titulo: 'Mês', valor: (l) => l.mes },
            { titulo: 'Previsto', alinhar: 'dir', valor: (l) => brl(l.previsto) },
            { titulo: 'Recebido', alinhar: 'dir', valor: (l) => brl(l.recebido) },
            { titulo: '% receb.', alinhar: 'dir', valor: (l) => pct(l.previsto ? (l.recebido / l.previsto) * 100 : null, 0) },
            { titulo: 'Material', alinhar: 'dir', valor: (l) => brl(l.material) },
            { titulo: 'Despesas', alinhar: 'dir', valor: (l) => brl(l.despesa) },
            { titulo: 'Resultado', alinhar: 'dir', valor: (l) => brl(l.resultado) },
          ]}
          linhas={linhasMes}
          total={{
            Previsto: brl(a.receitaPrevista), Recebido: brl(a.receitaRecebida),
            '% receb.': pct(a.receitaPrevista ? (a.receitaRecebida / a.receitaPrevista) * 100 : null, 0),
            Material: brl(a.receitaNaoRecorrente), Despesas: brl(a.despesaTotal), Resultado: brl(a.receitaTotal - a.despesaTotal),
          }}
        />
      </Secao>

      <Secao titulo="Receita × despesa, últimos 12 meses" sub="receita = mensalidades recebidas + material">
        <Colunas
          dados={M.serie.map((s) => ({ rotulo: s.curto, valores: [s.receita, s.despesa] }))}
          series={[{ nome: 'Receita' }, { nome: 'Despesa' }]}
          formato={brlCurto}
          altura={165}
        />
      </Secao>

      <div className="grid grid-cols-2 gap-5">
        <Secao titulo="Cobranças do trimestre">
          <LinhaValor rotulo="Parcelas emitidas" valor={`${num(c.emitidas)} · ${brl(c.previsto)}`} />
          <LinhaValor rotulo="Pagas" valor={`${num(c.pagasCount)} · ${brl(c.recebido)}`} />
          <LinhaValor rotulo="Pendentes (a vencer)" valor={num(c.pendentesCount)} />
          <LinhaValor rotulo="Atrasadas" valor={`${num(c.atrasadasCount)} · ${brl(c.atrasadasValor)}`} />
          <LinhaValor rotulo="Alunos ativos sem cobrança emitida" valor={num(c.naoEmitidasCount)} forte={c.naoEmitidasCount > 0} />
        </Secao>
        <Secao titulo="Mensalidade por curso" sub="alunos ativos no fim">
          <Tabela
            colunas={[
              { titulo: 'Curso', valor: (l) => l.curso },
              { titulo: 'Alunos', alinhar: 'dir', valor: (l) => num(l.alunos) },
              { titulo: 'Média', alinhar: 'dir', valor: (l) => brl(l.mensalidadeMedia) },
              { titulo: 'MRR', alinhar: 'dir', valor: (l) => brl(l.mrr) },
            ]}
            linhas={a.mensalidadePorCurso.map((l) => ({ ...l, chave: l.curso }))}
            limite={9}
          />
        </Secao>
      </div>
    </Folha>
  );
}

export function FolhaDespesas({ M, ctx, numero }) {
  const { atual: a, despesasPorCategoria } = M.R;
  const v = M.variacoes;
  const t = a.despesasPorTipo;
  const proj = M.projecao;
  return (
    <Folha {...ctx} numero={numero}>
      <div className="grid grid-cols-2 gap-5">
        <Secao titulo="Resultado (DRE simplificado)" sub="regime de caixa">
          <LinhaValor rotulo="Mensalidades recebidas" valor={brl(a.receitaRecebida)} />
          <LinhaValor rotulo="Material e avulsos" valor={brl(a.receitaNaoRecorrente)} />
          <LinhaValor rotulo="Receita total" valor={brl(a.receitaTotal)} forte />
          <LinhaValor rotulo="(−) Despesas operacionais" valor={brl(-t.operacional)} recuo />
          <LinhaValor rotulo="(−) Impostos" valor={brl(-t.imposto)} recuo />
          <LinhaValor rotulo="Lucro operacional" valor={brl(a.lucroOperacional)} forte />
          <LinhaValor rotulo="Margem operacional" valor={pct(a.margemOperacional)} recuo />
          <LinhaValor rotulo="(−) Retirada de sócios" valor={brl(-t.retiradaSocio)} recuo />
          <LinhaValor rotulo="(−) Investimentos" valor={brl(-t.investimento)} recuo />
          <LinhaValor rotulo="Resultado do trimestre" valor={brl(a.resultado)} forte />
        </Secao>
        <Secao titulo="Despesas por categoria">
          <BarrasH
            dados={despesasPorCategoria.slice(0, 11).map((d) => ({ rotulo: d.categoria, valor: d.valor, sub: pct(a.despesaTotal ? (d.valor / a.despesaTotal) * 100 : null, 0) }))}
            formato={brl}
            largRotulo={120}
            cor="var(--su-orange-600)"
          />
        </Secao>
      </div>

      <Secao titulo="Estrutura de custo">
        <Grade colunas={4}>
          <Kpi rotulo="Despesa total" valor={brl(a.despesaTotal)} variacao={v.despesaTotal} inverter />
          <Kpi rotulo="Custo fixo" valor={brl(a.custoFixo)} sub="despesas recorrentes do trimestre" />
          <Kpi rotulo="Ponto de equilíbrio" valor={a.pontoEquilibrio.disponivel ? `${num(a.pontoEquilibrio.valor)} alunos` : '—'} sub="custo fixo mensal ÷ mensalidade média" />
          <Kpi rotulo="Folga sobre o equilíbrio" valor={a.pontoEquilibrio.disponivel ? num(a.alunosAtivos - a.pontoEquilibrio.valor) : '—'} sub="alunos ativos acima do mínimo" alerta={a.pontoEquilibrio.disponivel && a.alunosAtivos < a.pontoEquilibrio.valor} />
          <Kpi rotulo="Custo de professores (estim.)" valor={brl(M.ped.geral.custoEstimado)} sub={`${horas(M.ped.geral.minutosDados)} dadas × hora-aula c/ encargos`} />
          <Kpi rotulo="Professores ÷ receita" valor={pct(a.receitaTotal ? (M.ped.geral.custoEstimado / a.receitaTotal) * 100 : null, 0)} sub="peso da folha de aula" />
          <Kpi rotulo="Caixa: variação" valor={a.saldoCaixa.disponivel ? brl(a.saldoCaixa.variacao) : '—'} sub={a.saldoCaixa.disponivel ? `${brl(a.saldoCaixa.saldoInicial)} → ${brl(a.saldoCaixa.saldoFinal)}` : 'preencha os saldos em Despesas'} />
          <Kpi rotulo="Retirada de sócios" valor={brl(a.retiradaSocio)} sub={pct(a.despesaTotal ? (a.retiradaSocio / a.despesaTotal) * 100 : null, 0) + ' das saídas'} />
        </Grade>
      </Secao>

      <Secao titulo="Projeção dos próximos 3 meses" sub={proj.disponivel ? 'tendência dos últimos 6 meses, sem sazonalidade' : proj.motivo}>
        {proj.disponivel && (
          <Tabela
            colunas={[
              { titulo: 'Mês', valor: (l) => l.rotulo },
              { titulo: 'Receita conservadora', alinhar: 'dir', valor: (l) => brl(l.receita.conservador) },
              { titulo: 'Receita base', alinhar: 'dir', valor: (l) => brl(l.receita.base) },
              { titulo: 'Receita otimista', alinhar: 'dir', valor: (l) => brl(l.receita.otimista) },
              { titulo: 'Despesa', alinhar: 'dir', valor: (l) => brl(l.despesa) },
              { titulo: 'Resultado base', alinhar: 'dir', valor: (l) => brl(l.resultado.base) },
            ]}
            linhas={proj.meses.map((m) => ({ ...m, chave: m.rotulo }))}
          />
        )}
        <Nota>{proj.disponivel ? proj.nota : ''}</Nota>
      </Secao>

      <Secao titulo="Observações sobre despesas">
        <ul className="list-disc pl-4 text-[10.5px] leading-snug flex flex-col gap-1">
          {M.pontosDespesas.map((p) => <li key={p}>{p}</li>)}
        </ul>
      </Secao>
    </Folha>
  );
}

export function FolhaInadimplencia({ M, ctx, numero }) {
  const { atual: a, parcelasInadimplentes } = M.R;
  const v = M.variacoes;
  const faixas = Object.entries(a.aging).map(([faixa, valor]) => ({ rotulo: `${faixa} dias`, valor }));
  const porAluno = new Map();
  parcelasInadimplentes.forEach((p) => {
    const atual = porAluno.get(p.studentName) || { chave: p.studentName, aluno: p.studentName, parcelas: 0, saldo: 0, maisAntiga: p.dueDate, dias: 0 };
    atual.parcelas += 1;
    atual.saldo += p.saldo;
    if (p.diasAtraso > atual.dias) { atual.dias = p.diasAtraso; atual.maisAntiga = p.dueDate; }
    porAluno.set(p.studentName, atual);
  });
  const devedores = [...porAluno.values()].sort((x, y) => y.saldo - x.saldo);
  return (
    <Folha {...ctx} numero={numero}>
      <Secao titulo="Inadimplência">
        <Grade colunas={4}>
          <Kpi rotulo="Carteira vencida (total)" valor={brl(a.inadimplenciaCarteira)} sub="tudo em atraso no fim do período" variacao={v.inadimplenciaCarteira} inverter alerta={a.inadimplenciaCarteira > 0} />
          <Kpi rotulo="Atraso do trimestre" valor={brl(a.inadimplenciaMes.valor)} sub={`${pct(a.inadimplenciaMes.pct)} do previsto no trimestre`} variacao={v.inadimplenciaMes} inverter />
          <Kpi rotulo="Taxa de recuperação" valor={pct(a.taxaRecuperacao)} sub={a.taxaRecuperacao.recuperado != null ? `${brl(a.taxaRecuperacao.recuperado)} recuperados` : a.taxaRecuperacao.motivo} variacao={v.taxaRecuperacao} />
          <Kpi rotulo="Devedores" valor={num(devedores.length)} sub={`${num(parcelasInadimplentes.length)} parcela(s) em atraso`} />
        </Grade>
      </Secao>
      <Secao titulo="Idade da dívida (aging)" sub="saldo em atraso por tempo de atraso">
        <BarrasH dados={faixas} formato={brl} largRotulo={80} cor="var(--su-orange-600)" />
        <Nota>Quanto mais à direita na idade, menor a chance de receber: priorize cobrança pelos 31–90 dias antes que virem 90+.</Nota>
      </Secao>
      <Secao titulo="Maiores devedores" sub="ordenado pelo saldo em atraso">
        <Tabela
          colunas={[
            { titulo: 'Aluno', valor: (l) => l.aluno },
            { titulo: 'Parcelas', alinhar: 'dir', valor: (l) => num(l.parcelas) },
            { titulo: 'Mais antiga', alinhar: 'dir', valor: (l) => dataBR(l.maisAntiga) },
            { titulo: 'Dias', alinhar: 'dir', valor: (l) => num(l.dias) },
            { titulo: 'Saldo', alinhar: 'dir', valor: (l) => brl(l.saldo, { centavos: true }) },
          ]}
          linhas={devedores}
          limite={26}
          vazio="Ninguém em atraso no fim do período."
        />
      </Secao>
    </Folha>
  );
}
