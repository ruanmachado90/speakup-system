import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { doc, getDoc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { CheckCircle2, Download, Loader2 } from 'lucide-react';
import { db, AMBIENTE } from '../firebase';
import { APP_ID } from '../utils/constants';
import {
  situacaoDoLink, deveMarcarAberto, opcoesDoConvite, vencimentosDaEscolha, validarEscolha,
  montarResposta, montarContratoRenovacao, idContratoDoAno, carimboDeAssinatura,
  paginaDaFamilia, condicoesDoDesconto, comparativoAntecipada, whatsappDaSecretaria,
} from '../utils/renovacaoFamilia';
import { PREAMBULO, CLAUSULAS, quadroDaRenovacao, gerarContratoPDF, htmlDoContratoRenovacao } from '../utils/contrato';
import { enviarContratoPorEmail } from '../utils/email';
import { Pagina, Titulo, Marca, Fatos, Secao, Passos, Aviso } from '../components/renovacao/PaginaFamilia';

// No emulador o e-mail não sai (utils/email.js) e o Google não valida
// localhost: o captcha só atrapalharia o teste.
const RECAPTCHA_SITE_KEY = AMBIENTE?.emulador ? null : import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const ref = (colecao, id) => doc(db, 'artifacts', APP_ID, 'public', 'data', colecao, id);

const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const diaMes = (iso) => (iso ? iso.slice(5).split('-').reverse().join('/') : '');
const pct = (n) => `${String(n).replace('.', ',')}%`;
const mascaraCpf = (v) => v.replace(/\D/g, '').slice(0, 11)
  .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');

const labelCls = 'mb-1.5 block font-display text-su-sm font-bold text-content-strong';
const inputCls = 'h-12 w-full rounded-su-sm border border-strong bg-surface-card px-3.5 text-su-base text-content-strong placeholder:text-content-faint focus:border-accent focus:outline-none focus-visible:shadow-ring-accent';
const opcaoCls = (ativo) => `h-11 min-w-[4.5rem] rounded-su-sm border px-4 font-display text-su-sm font-bold transition-colors focus:outline-none focus-visible:shadow-ring-accent ${
  ativo ? 'border-accent bg-accent text-white' : 'border-strong bg-surface-card text-content-strong hover:border-accent'
}`;

/** Linha "rótulo ........ valor" com linha fina embaixo (como a lista de livros do site). */
const Linha = ({ rotulo, children, forte }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-subtle py-3.5 first:border-t">
    <dt className="text-su-base text-content-muted">{rotulo}</dt>
    <dd className={`text-right font-display ${forte ? 'text-[1.375rem] font-extrabold tracking-[-0.02em] text-content-strong' : 'text-su-lg font-bold text-content-body'}`}>{children}</dd>
  </div>
);

function Mensagem({ campanha, titulo, children }) {
  return (
    <Pagina textos={paginaDaFamilia(campanha)} whatsapp={whatsappDaSecretaria(campanha)}>
      <Titulo lead={children}>{titulo}</Titulo>
    </Pagina>
  );
}

/** Texto integral do contrato, com o quadro resumo do plano escolhido. */
function TextoContrato({ quadro }) {
  return (
    <div className="max-h-80 overflow-y-auto rounded-su-md border border-subtle bg-surface-card p-4 text-su-sm leading-relaxed text-content-body" tabIndex={0} aria-label="Texto do contrato">
      <p className="font-display font-extrabold text-content-strong">Contrato de prestação de serviços educacionais</p>
      <dl className="my-3 grid grid-cols-1 gap-x-4 gap-y-1 rounded-su-sm bg-surface-sunken p-3 sm:grid-cols-2">
        {quadro.flat().filter(([r]) => r).map(([rotulo, valor]) => (
          <div key={rotulo}><dt className="inline font-semibold text-content-strong">{rotulo}: </dt><dd className="inline">{valor}</dd></div>
        ))}
      </dl>
      <p className="mb-2">{PREAMBULO}</p>
      {CLAUSULAS.map((c) => (
        <div key={c.titulo} className="mb-2">
          <p className="font-semibold text-content-strong">{c.titulo}</p>
          {c.itens.map((i) => <p key={i}>{i}</p>)}
        </div>
      ))}
    </div>
  );
}

const baixarPDF = (contrato) => gerarContratoPDF(
  { name: contrato.alunoNome, responsibleName: contrato.nome, responsibleCpf: contrato.cpf },
  { renovacao: contrato, assinatura: { nome: contrato.nome, cpf: contrato.cpf, timestamp: contrato.timestamp, ip: contrato.ip } },
);

/** Comprovante: depois de responder (na hora ou voltando ao link). */
function Comprovante({ convite, campanha, contrato, agora }) {
  const [erroPdf, setErroPdf] = useState('');
  const cond = contrato?.desconto?.condicao || {};
  return (
    <Pagina textos={paginaDaFamilia(campanha)} whatsapp={whatsappDaSecretaria(campanha, convite.alunoNome)}>
      <div className="space-y-5">
        <CheckCircle2 size={40} className="text-success" aria-hidden="true" />
        <Titulo lead={`${agora ? 'Obrigado!' : 'Esta renovação já foi respondida.'} A secretaria confere e confirma a matrícula de ${convite.anoLetivo}. As mensalidades começam em janeiro.`}>
          Recebemos a sua <Marca>renovação</Marca>.
        </Titulo>
      </div>
      {contrato && (
        <dl>
          <Linha rotulo="Plano">{contrato.planoRotulo}</Linha>
          <Linha rotulo="Pagamento" forte>
            {contrato.pagamentos > 1 ? `${contrato.pagamentos}x de ${brl(contrato.valorPagamentoCentavos)}` : brl(contrato.valorPagamentoCentavos)}
          </Linha>
          <Linha rotulo="Vencimento">Dia {contrato.diaVencimento}</Linha>
          <Linha rotulo="Forma">{contrato.formaPagamento}</Linha>
        </dl>
      )}
      {contrato?.desconto?.id === 'renovacao_no_prazo' && (
        <Aviso>
          Para manter o desconto de renovação, pague a 1ª mensalidade até <strong>{dataBR(cond.primeiraParcelaPagaAte) || '10/01'}</strong>
          {cond.emDia ? ` e esteja em dia com as mensalidades de ${convite.anoLetivo - 1}` : ''}.
        </Aviso>
      )}
      {contrato && (
        <button type="button" onClick={() => baixarPDF(contrato).catch(() => setErroPdf('Não foi possível gerar o PDF. Peça uma cópia à secretaria.'))}
          className="flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-su-sm bg-accent font-display text-su-base font-bold text-white transition-transform hover:bg-accent-hover active:scale-[.97] focus:outline-none focus-visible:shadow-ring-accent">
          <Download size={18} aria-hidden="true" /> Baixar o contrato (PDF)
        </button>
      )}
      {erroPdf && <p role="alert" className="text-su-sm text-danger">{erroPdf}</p>}
    </Pagina>
  );
}

/**
 * Página da família para renovar a matrícula pelo link (etapa 4 do
 * docs/rematricula/PLANO.md): escolhe plano, forma e dia, assina o contrato
 * do ano. Grava a resposta do convite e o contrato juntos; as regras do
 * Firestore só deixam gravar isso. Visual no padrão do site (PaginaFamilia).
 */
export default function RenovarMatricula() {
  const { codigo } = useParams();
  const [estado, setEstado] = useState({ carregando: true, convite: null, campanha: null, contrato: null, erro: false });
  const [escolha, setEscolha] = useState({ planoId: '', formaPagamento: '', diaVencimento: '' });
  const [assinatura, setAssinatura] = useState({ nome: '', cpf: '', email: '', aceite: false });
  const [erros, setErros] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(null); // contrato gravado agora
  const [ip, setIp] = useState('');
  const [recaptcha, setRecaptcha] = useState('');
  const recaptchaRef = useRef(null);
  const agoraRef = useRef(Date.now());

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const snap = await getDoc(ref('renovacoes', codigo));
        if (!snap.exists()) { if (vivo) setEstado({ carregando: false, convite: null, campanha: null, contrato: null, erro: false }); return; }
        const convite = { ...snap.data(), codigo: snap.id };
        const [campSnap, contrSnap] = await Promise.all([
          getDoc(ref('renovacao-campanhas', String(convite.anoLetivo))),
          getDoc(ref('contratos', idContratoDoAno(convite.studentId, convite.anoLetivo))),
        ]);
        const campanha = campSnap.exists() ? campSnap.data() : null;
        if (!vivo) return;
        setEstado({ carregando: false, convite, campanha, contrato: contrSnap.exists() ? contrSnap.data() : null, erro: false });
        if (situacaoDoLink({ convite, campanha }) === 'aberto' && deveMarcarAberto(convite)) {
          updateDoc(snap.ref, { status: 'aberta', abertaEm: serverTimestamp() }).catch(() => { /* só registro; não impede responder */ });
        }
      } catch (e) {
        console.error('[renovar] carregar:', e);
        if (vivo) setEstado((s) => ({ ...s, carregando: false, erro: true }));
      }
    })();
    return () => { vivo = false; };
  }, [codigo]);

  useEffect(() => {
    fetch('https://api.ipify.org?format=json').then((r) => r.json()).then((d) => setIp(d.ip)).catch(() => setIp(''));
  }, []);

  const { convite, campanha } = estado;
  const calculo = useMemo(
    () => (convite && campanha ? opcoesDoConvite({ convite, campanha, respondidaEm: agoraRef.current }) : null),
    [convite, campanha]
  );
  const opcao = calculo?.opcoes.find((o) => o.planoId === escolha.planoId) || null;
  const vencimentos = useMemo(
    () => (campanha ? vencimentosDaEscolha({ campanha, planoId: escolha.planoId, dia: Number(escolha.diaVencimento) }) : []),
    [campanha, escolha.planoId, escolha.diaVencimento]
  );
  const previa = useMemo(() => {
    if (!convite || !campanha || !opcao) return null;
    return montarContratoRenovacao({
      convite, campanha, escolha, opcao, vencimentos,
      assinatura: { nome: assinatura.nome || '—', cpf: assinatura.cpf, timestamp: '' },
    });
  }, [convite, campanha, escolha, opcao, vencimentos, assinatura.nome, assinatura.cpf]);

  if (estado.carregando) {
    return <div className="flex min-h-screen items-center justify-center bg-surface-page text-content-muted"><Loader2 className="animate-spin" aria-label="Carregando" /></div>;
  }
  if (estado.erro) return <Mensagem campanha={campanha} titulo="Não foi possível abrir a renovação.">Verifique a internet e tente de novo. Se continuar, fale com a secretaria.</Mensagem>;
  if (concluido) return <Comprovante convite={convite} campanha={campanha} contrato={concluido} agora />;

  const situacao = situacaoDoLink({ convite, campanha });
  if (situacao === 'invalido') return <Mensagem campanha={campanha} titulo="Este link não é válido.">Confira se o link foi copiado inteiro ou peça um novo à secretaria.</Mensagem>;
  if (situacao === 'respondido') return <Comprovante convite={convite} campanha={campanha} contrato={estado.contrato} />;
  if (situacao === 'indisponivel') return <Mensagem campanha={campanha} titulo="Este link não está mais disponível.">Fale com a secretaria da SpeakUp para renovar a matrícula.</Mensagem>;
  if (situacao === 'fechada') {
    return <Mensagem campanha={campanha} titulo="A renovação pelo link não está aberta.">{campanha.status === 'rascunho' ? 'A campanha ainda não começou.' : 'O prazo da campanha terminou.'} Fale com a secretaria da SpeakUp.</Mensagem>;
  }

  const descontoNoPrazo = opcao?.desconto?.id === 'renovacao_no_prazo';
  const limitePagamento = campanha.descontoRenovacaoNoPrazo?.primeiraParcelaPagaAte;
  const setE = (patch) => { setEscolha((e) => ({ ...e, ...patch })); setErros([]); };
  const setA = (patch) => { setAssinatura((a) => ({ ...a, ...patch })); setErros([]); };

  const enviar = async (e) => {
    e.preventDefault();
    const encontrados = validarEscolha({ ...escolha, ...assinatura }, campanha);
    const querEmail = Boolean(assinatura.email.trim());
    if (querEmail && RECAPTCHA_SITE_KEY && !recaptcha) encontrados.push('Confirme que você não é um robô para receber o e-mail.');
    setErros(encontrados);
    if (encontrados.length) return;
    setEnviando(true);
    try {
      const contrato = montarContratoRenovacao({
        convite, campanha, escolha, opcao, vencimentos,
        assinatura: { ...assinatura, timestamp: carimboDeAssinatura(), ip },
      });
      const lote = writeBatch(db);
      lote.update(ref('renovacoes', convite.codigo), { status: 'respondida', resposta: { ...montarResposta(escolha), respondidaEm: serverTimestamp() } });
      lote.set(ref('contratos', idContratoDoAno(convite.studentId, convite.anoLetivo)), contrato);
      await lote.commit();
      setConcluido(contrato);
      window.scrollTo(0, 0);
      baixarPDF(contrato).catch((err) => console.error('[renovar] PDF:', err));
      if (querEmail) {
        enviarContratoPorEmail({
          aluno_nome: convite.alunoNome, responsavel_nome: contrato.nome, contrato_html: htmlDoContratoRenovacao(contrato),
          destinatario: assinatura.email.trim(), recaptchaToken: recaptcha,
        }).catch((err) => console.error('[renovar] e-mail:', err));
      }
    } catch (err) {
      console.error('[renovar] enviar:', err);
      setErros([err.code === 'permission-denied'
        ? 'Não foi possível registrar: a renovação pode já ter sido respondida ou a campanha foi encerrada. Atualize a página.'
        : 'Não foi possível registrar agora. Verifique a internet e tente de novo.']);
      recaptchaRef.current?.reset();
      setRecaptcha('');
    } finally {
      setEnviando(false);
    }
  };

  const textos = paginaDaFamilia(campanha);
  const condicoes = condicoesDoDesconto(campanha);
  const comparativo = comparativoAntecipada(calculo, campanha);
  const prazoDesconto = campanha.descontoRenovacaoNoPrazo?.respostaAte || campanha.encerramento;
  const whatsapp = whatsappDaSecretaria(campanha, convite.alunoNome);
  const exigeEmDia = campanha.descontoRenovacaoNoPrazo?.exigeEmDia !== false;
  const fatos = [
    campanha.encerramento && [diaMes(campanha.encerramento), 'prazo para renovar'],
    limitePagamento && [diaMes(limitePagamento), '1ª mensalidade'],
  ].filter(Boolean);

  return (
    <Pagina textos={textos} whatsapp={whatsapp}>
      <div className="space-y-7">
        <Titulo saudacao={`Renovação de matrícula ${convite.anoLetivo}`} lead={textos.apresentacao}>
          Garanta sua vaga em {convite.anoLetivo} com <Marca>condições especiais</Marca>.
        </Titulo>
        {fatos.length > 0 && <Fatos itens={fatos} />}
      </div>

      <Secao titulo={`A mensalidade em ${convite.anoLetivo}`}>
        <dl>
          <Linha rotulo="Aluno">{convite.alunoNome}</Linha>
          {(convite.turmasAtuais?.length > 0 || convite.cursoAtual) && (
            <Linha rotulo="Turma atual">{convite.turmasAtuais?.length ? convite.turmasAtuais.join(' · ') : convite.cursoAtual}</Linha>
          )}
          <Linha rotulo={`Mensalidade ${convite.anoLetivo - 1}`}>{brl(convite.mensalidadeAtualCentavos ?? convite.mensalidadeBaseCentavos)}</Linha>
          <Linha rotulo={`Mensalidade ${convite.anoLetivo}`} forte>{brl(calculo.mensalidade)}</Linha>
        </dl>
        <p className="text-su-sm text-content-muted">Valor com o reajuste anual de {pct(campanha.reajustePct)}, previsto em contrato. Os descontos são aplicados sobre ele.</p>
        {convite.temPendencia && (
          <Aviso>
            Há mensalidades de {convite.anoLetivo - 1} em aberto. Você pode garantir a vaga agora
            {exigeEmDia && comparativo ? '; o desconto de renovação antecipada vale depois da regularização' : ''}.
            {' '}A secretaria entra em contato, ou <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">fale com ela pelo WhatsApp</a>.
          </Aviso>
        )}
      </Secao>

      {comparativo && (
        <Secao titulo="Renove no prazo e economize">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-su-md border-2 border-accent bg-surface-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
              <p className="font-display text-su-sm font-bold text-accent">Renovando até {diaMes(prazoDesconto)}</p>
              <p className="mt-2 text-su-sm text-content-muted">{comparativo.pagamentos} parcelas de</p>
              <p className="whitespace-nowrap font-display text-[1.375rem] font-extrabold leading-tight tracking-[-0.02em] text-content-strong">{brl(comparativo.comDesconto)}</p>
            </div>
            <div className="rounded-su-md border border-subtle bg-surface-card p-4">
              <p className="font-display text-su-sm font-bold text-content-muted">Depois do prazo</p>
              <p className="mt-2 text-su-sm text-content-muted">{comparativo.pagamentos} parcelas de</p>
              <p className="whitespace-nowrap font-display text-[1.375rem] font-extrabold leading-tight tracking-[-0.02em] text-content-faint">{brl(comparativo.cheio)}</p>
            </div>
          </div>
          <p className="font-display text-su-lg font-extrabold text-success">Economia de {brl(comparativo.economia)} no ano.</p>
          <p className="pt-2 font-display text-su-base font-extrabold text-content-strong">Para ter o desconto</p>
          <Passos itens={condicoes} />
          <p className="rounded-su-md bg-blues-50 p-4 font-display text-su-base font-bold text-blues-700">
            Renove agora e pague a primeira mensalidade só em janeiro.
          </p>
        </Secao>
      )}

      <form onSubmit={enviar} noValidate className="space-y-8">
        <Secao titulo="Escolha o plano" passo={1}>
          <fieldset className="space-y-3">
            <legend className="sr-only">Plano</legend>
            {calculo.opcoes.map((o) => {
              const plano = campanha.planos.find((p) => p.id === o.planoId);
              const ativo = escolha.planoId === o.planoId;
              return (
                <label key={o.planoId} className={`flex cursor-pointer items-start gap-3 rounded-su-md border bg-surface-card p-4 transition-colors ${ativo ? 'border-accent shadow-ring-accent' : 'border-subtle hover:border-strong'}`}>
                  <input type="radio" name="plano" value={o.planoId} checked={ativo} onChange={() => setE({ planoId: o.planoId })} className="mt-1.5 h-4 w-4 accent-accent" />
                  <span className="flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="font-display text-su-lg font-extrabold text-content-strong">{plano.rotulo}</span>
                      <span className="font-display text-su-lg font-extrabold text-content-strong">
                        {o.pagamentos > 1 ? `${o.pagamentos}x ${brl(o.valorPagamento)}` : brl(o.valorPagamento)}
                      </span>
                    </span>
                    <span className="mt-1 block text-su-sm text-content-muted">
                      {o.pagamentos === 12 ? 'Janeiro a dezembro' : o.pagamentos === 2 ? 'Janeiro e julho' : 'Pagamento único em janeiro'}
                      {` · total ${brl(o.total)}`}
                    </span>
                    {o.desconto && (
                      <span className="mt-2 inline-block rounded-su-xs bg-success-bg px-2 py-0.5 text-su-xs font-semibold text-success-fg">
                        {o.desconto.nome}: {pct(o.desconto.pct)} · economia de {brl(o.economia)}
                      </span>
                    )}
                    {o.desconto?.id === 'renovacao_no_prazo' && convite.temPendencia && exigeEmDia && (
                      <span className="mt-1 block text-su-xs text-warning-fg">Desconto depende de regularizar as mensalidades em aberto.</span>
                    )}
                  </span>
                </label>
              );
            })}
          </fieldset>
          <p className="text-su-sm text-content-muted">Os descontos não se somam: em cada plano vale o maior.</p>
        </Secao>

        <Secao titulo="Pagamento" passo={2}>
          <fieldset>
            <legend className={labelCls}>Forma de pagamento</legend>
            <div className="flex flex-wrap gap-2">
              {campanha.formasPagamento.map((f) => (
                <button key={f} type="button" aria-pressed={escolha.formaPagamento === f} className={opcaoCls(escolha.formaPagamento === f)} onClick={() => setE({ formaPagamento: f })}>{f}</button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className={labelCls}>Dia do vencimento</legend>
            <div className="flex flex-wrap gap-2">
              {campanha.diasVencimento.map((d) => (
                <button key={d} type="button" aria-pressed={Number(escolha.diaVencimento) === d} className={opcaoCls(Number(escolha.diaVencimento) === d)} onClick={() => setE({ diaVencimento: d })}>Dia {d}</button>
              ))}
            </div>
          </fieldset>
          {opcao && vencimentos.length > 0 && (
            <p className="rounded-su-md border border-subtle bg-surface-card p-4 text-su-base text-content-body">
              {opcao.pagamentos > 1
                ? <>{opcao.pagamentos} pagamentos de <strong className="text-content-strong">{brl(opcao.valorPagamento)}</strong>, de {dataBR(vencimentos[0])} a {dataBR(vencimentos[vencimentos.length - 1])}.</>
                : <>Pagamento único de <strong className="text-content-strong">{brl(opcao.valorPagamento)}</strong> em {dataBR(vencimentos[0])}.</>}
            </p>
          )}
          {descontoNoPrazo && limitePagamento && (
            <Aviso>Para manter o desconto de renovação, pague a 1ª mensalidade até <strong>{dataBR(limitePagamento)}</strong>. Depois disso, o ano fica no valor cheio.</Aviso>
          )}
        </Secao>

        <Secao titulo="Contrato e assinatura" passo={3}>
          {previa ? <TextoContrato quadro={quadroDaRenovacao(previa)} /> : (
            <p className="rounded-su-md border border-dashed border-strong p-4 text-su-base text-content-muted">Escolha o plano para ver o contrato com os valores.</p>
          )}
          <label className="block">
            <span className={labelCls}>Nome completo de quem assina</span>
            <input className={inputCls} autoComplete="name" value={assinatura.nome} onChange={(e) => setA({ nome: e.target.value })} />
            <span className="mt-1.5 block text-su-sm text-content-muted">{convite.menorDeIdade ? 'O responsável pelo aluno.' : 'O aluno ou o responsável financeiro.'}</span>
          </label>
          <label className="block">
            <span className={labelCls}>CPF</span>
            <input className={inputCls} inputMode="numeric" placeholder="000.000.000-00" maxLength={14} value={assinatura.cpf} onChange={(e) => setA({ cpf: mascaraCpf(e.target.value) })} />
          </label>
          <label className="block">
            <span className={labelCls}>E-mail <span className="font-body font-normal text-content-muted">(opcional, para receber uma cópia)</span></span>
            <input className={inputCls} type="email" autoComplete="email" value={assinatura.email} onChange={(e) => setA({ email: e.target.value })} />
          </label>
          {RECAPTCHA_SITE_KEY && assinatura.email.trim() && (
            <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} onChange={(t) => setRecaptcha(t || '')} onExpired={() => setRecaptcha('')} />
          )}
          <label className="flex items-start gap-3 text-su-base text-content-body">
            <input type="checkbox" className="mt-1 h-5 w-5 flex-none accent-accent" checked={assinatura.aceite} onChange={(e) => setA({ aceite: e.target.checked })} />
            Li e concordo com o contrato de prestação de serviços educacionais de {convite.anoLetivo}.
          </label>
        </Secao>

        {erros.length > 0 && (
          <div role="alert" className="rounded-su-md bg-danger-bg p-4 text-su-sm text-danger-fg">
            <ul className="list-disc space-y-0.5 pl-4">{erros.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}

        <div className="space-y-3">
          <button type="submit" disabled={enviando}
            className="flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-su-sm bg-accent font-display text-su-base font-bold text-white transition-transform hover:bg-accent-hover active:scale-[.97] disabled:opacity-60 focus:outline-none focus-visible:shadow-ring-accent">
            {enviando ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Registrando…</> : 'Assinar e renovar a matrícula'}
          </button>
          <p className="text-center text-su-sm text-content-muted">
            A assinatura digital registra nome, CPF, data, hora e IP. O contrato em PDF é baixado em seguida.
          </p>
        </div>
      </form>
    </Pagina>
  );
}
