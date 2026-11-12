import logoAzul from '../../assets/logo-speakup-azul.png';

/*
 * Peças visuais da página da família (`/renovar/:codigo`), no padrão do site
 * institucional (speakup-site): papel pontilhado, barra com a logo e o
 * WhatsApp, título grande em Manrope com uma palavra marcada, números em
 * destaque, passos em quadradinho e o fecho azul-escuro com botão amarelo.
 * Cores só por token (nada de hex aqui).
 */

const PAPEL = {
  backgroundColor: 'var(--gr-50)',
  backgroundImage: 'radial-gradient(circle, var(--gr-300) 0.6px, transparent 0.6px)',
  backgroundSize: '8px 8px',
  boxShadow: 'inset 0 0 0 9999px rgba(255,255,255,.4)',
};
const PONTOS_CLAROS = {
  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.16) 0.8px, transparent 0.8px)',
  backgroundSize: '12px 12px',
};

/** Ícone do WhatsApp (o mesmo do site: todo botão que abre o WhatsApp leva ele). */
export function IconeWhatsApp({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="block flex-none">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3Z" />
    </svg>
  );
}

/** "(32) 99941-4548" a partir dos dígitos. */
function telefoneLegivel(numero) {
  const d = String(numero || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return numero;
}

/** Palavra marcada do título: azul com sublinhado amarelo (como no site). */
export const Marca = ({ children }) => (
  <span className="text-accent" style={{ boxShadow: 'inset 0 -0.14em 0 var(--su-yellow)' }}>{children}</span>
);

export function Titulo({ saudacao, children, lead }) {
  return (
    <div className="space-y-4">
      {saudacao && <p className="text-su-base font-semibold text-content-muted">{saudacao}</p>}
      <h1 className="font-display text-[2.125rem] font-extrabold leading-[1.06] tracking-[-0.03em] text-content-strong sm:text-[2.75rem]">{children}</h1>
      {lead && <p className="text-[1.0625rem] leading-relaxed text-content-body">{lead}</p>}
    </div>
  );
}

/** Números em destaque com legenda (como "9 anos · 2h · até 8" do site). */
export function Fatos({ itens }) {
  return (
    <dl className="grid border-t border-subtle pt-5" style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}>
      {itens.map(([valor, legenda]) => (
        <div key={legenda} className="pr-2">
          <dt className="sr-only">{legenda}</dt>
          <dd className="font-display text-[1.375rem] font-extrabold leading-tight tracking-[-0.02em] text-content-strong">{valor}</dd>
          <dd className="mt-1 text-su-sm leading-snug text-content-muted">{legenda}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Seção com linha fina em cima; `passo` vira o quadradinho numerado. */
export function Secao({ titulo, passo, children }) {
  return (
    <section className="space-y-4 border-t border-subtle pt-8">
      <h2 className="flex items-center gap-3 font-display text-[1.5rem] font-extrabold leading-tight tracking-[-0.02em] text-content-strong">
        {passo && <Numero>{passo}</Numero>}
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export const Numero = ({ children }) => (
  <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-su-sm bg-blues-50 font-display text-su-sm font-extrabold text-blues-700">{children}</span>
);

/** Passos numerados ligados por uma linha pontilhada (como os momentos da aula no site). */
export function Passos({ itens }) {
  return (
    <ol className="relative space-y-4">
      <span aria-hidden="true" className="absolute bottom-4 left-[15px] top-4 border-l-2 border-dotted border-strong" />
      {itens.map((t, i) => (
        <li key={t} className="relative flex items-start gap-4">
          <span className="relative rounded-su-sm" style={{ boxShadow: '0 0 0 4px var(--gr-50)' }}><Numero>{i + 1}</Numero></span>
          <span className="pt-1 text-su-base leading-snug text-content-strong">{t}</span>
        </li>
      ))}
    </ol>
  );
}

/** Aviso discreto (pendência, prazo do 1º pagamento). */
export const Aviso = ({ children }) => (
  <p className="rounded-su-md bg-warning-bg p-4 text-su-sm leading-relaxed text-warning-fg">{children}</p>
);

/** Fecho azul-escuro: dúvidas, WhatsApp da secretaria e assinatura. */
function Fecho({ textos, whatsapp }) {
  return (
    <section className="relative overflow-hidden bg-blues-700 text-center">
      <div className="absolute inset-0" style={PONTOS_CLAROS} aria-hidden="true" />
      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-5 px-5 py-16">
        <h2 className="font-display text-[2rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-white">
          Ficou com alguma <span style={{ boxShadow: 'inset 0 -0.14em 0 var(--su-yellow)' }}>dúvida</span>?
        </h2>
        <p className="text-[1.0625rem] leading-relaxed text-white/85">
          Somos gratos por estarem conosco! A secretaria atende {textos.atendimento.replace(/^\w/, (c) => c.toLowerCase())}
        </p>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer"
          className="inline-flex h-[3.25rem] w-full max-w-sm items-center justify-center gap-2 rounded-su-sm bg-brand-yellow px-6 font-display text-su-base font-extrabold text-content-strong transition-transform active:scale-[.97] focus:outline-none focus-visible:shadow-ring-accent">
          <IconeWhatsApp size={20} /> Falar com a secretaria
        </a>
        <p className="font-display text-su-sm font-bold text-white/85">
          Prefere ligar? <a href={`tel:+55${String(textos.whatsapp).replace(/\D/g, '').replace(/^55/, '')}`} className="text-white underline underline-offset-4">{telefoneLegivel(textos.whatsapp)}</a>
        </p>
        <p className="pt-2 font-display text-su-base font-extrabold text-white">{textos.assinatura}</p>
      </div>
    </section>
  );
}

/**
 * Moldura completa: barra fixa com a logo e o WhatsApp, conteúdo numa coluna
 * de leitura (celular primeiro), fecho azul e rodapé com o endereço.
 */
export function Pagina({ textos, whatsapp, children }) {
  return (
    <div className="min-h-screen font-body text-content-body" style={PAPEL}>
      <header className="sticky top-0 z-30 border-b border-subtle backdrop-blur-md" style={{ background: 'rgba(247,248,249,0.9)' }}>
        <div className="mx-auto flex h-16 max-w-xl items-center justify-between gap-4 px-5">
          <img src={logoAzul} alt="SpeakUp English School" className="block h-[26px] w-auto" />
          <a href={whatsapp} target="_blank" rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-su-sm bg-accent px-3.5 font-display text-su-sm font-bold text-white hover:bg-accent-hover focus:outline-none focus-visible:shadow-ring-accent">
            <IconeWhatsApp size={15} /> Dúvidas
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-xl space-y-8 px-5 pb-16 pt-10">{children}</main>
      <Fecho textos={textos} whatsapp={whatsapp} />
      <footer className="mx-auto max-w-xl space-y-3 px-5 py-10 text-su-sm text-content-muted">
        <img src={logoAzul} alt="" className="block h-6 w-auto" />
        <p>Escola de inglês em Cataguases, MG · Praça Governador Valadares, 119, Centro.</p>
        <p className="text-su-xs">© {new Date().getFullYear()} SpeakUp English School.</p>
      </footer>
    </div>
  );
}
