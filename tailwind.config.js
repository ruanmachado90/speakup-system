/**
 * Tailwind consome os tokens do SpeakUp Design System.
 *
 * A fonte da verdade dos VALORES é `src/styles/tokens/*.css`, espelhados do
 * projeto "SpeakUp Design System" no Claude Design. Aqui só damos nomes de
 * classe a eles — mudar um valor se faz lá, nunca aqui.
 *
 * CONVENÇÃO DE NOMES
 * As escalas que colidem com as do Tailwind (tamanho de fonte, raio,
 * entrelinha) usam o prefixo `su-`, para que nada do que já existe mude de
 * aparência sozinho:
 *
 *     text-su-h2     rounded-su-md     leading-su-snug
 *
 * Isso também deixa a migração legível: se a classe tem `su-`, a tela já
 * está no design system; se não tem, ainda não foi migrada. Quando a
 * migração terminar, dá para tirar o prefixo de uma vez.
 *
 * Cores, sombras, fontes e espaçamento não colidem e entram sem prefixo.
 *
 * REGRA: nada de hex cru no JSX. `bg-[#005DE4]` vira `bg-accent`.
 *
 * Nota: cor declarada como var() não aceita o modificador de opacidade do
 * Tailwind (`bg-ink/50`). Para transparência, use os tokens `ink-04/08/12/40/50/65`.
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Marca — acento, nunca superfície
        brand: {
          blue: 'var(--su-blue)',
          yellow: 'var(--su-yellow)',
          pink: 'var(--su-pink)',
          orange: 'var(--su-orange)',
        },
        blues: {
          50: 'var(--su-blue-50)',
          100: 'var(--su-blue-100)',
          200: 'var(--su-blue-200)',
          300: 'var(--su-blue-300)',
          600: 'var(--su-blue-600)',
          700: 'var(--su-blue-700)',
        },
        // Grafite — o cavalo de batalha da UI
        gr: {
          white: 'var(--gr-white)',
          50: 'var(--gr-50)',
          100: 'var(--gr-100)',
          200: 'var(--gr-200)',
          300: 'var(--gr-300)',
          400: 'var(--gr-400)',
          500: 'var(--gr-500)',
          600: 'var(--gr-600)',
          700: 'var(--gr-700)',
          800: 'var(--gr-800)',
          900: 'var(--gr-900)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          '04': 'var(--ink-04)',
          '08': 'var(--ink-08)',
          12: 'var(--ink-12)',
          40: 'var(--ink-40)',
          50: 'var(--ink-50)',
          65: 'var(--ink-65)',
        },
        // Semânticos
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
        },
        success: {
          DEFAULT: 'var(--su-success)',
          bg: 'var(--su-success-bg)',
          fg: 'var(--su-success-fg)',
        },
        warning: {
          DEFAULT: 'var(--su-warning)',
          bg: 'var(--su-warning-bg)',
          fg: 'var(--su-warning-fg)',
        },
        danger: {
          DEFAULT: 'var(--su-danger)',
          bg: 'var(--su-danger-bg)',
          fg: 'var(--su-danger-fg)',
        },
        info: {
          DEFAULT: 'var(--su-info)',
          bg: 'var(--su-info-bg)',
          fg: 'var(--su-info-fg)',
        },
        // Papéis
        surface: {
          page: 'var(--surface-page)',
          card: 'var(--surface-card)',
          sunken: 'var(--surface-sunken)',
          inverse: 'var(--surface-inverse)',
        },
        content: {
          strong: 'var(--text-strong)',
          body: 'var(--text-body)',
          muted: 'var(--text-muted)',
          faint: 'var(--text-faint)',
          'on-dark': 'var(--text-on-dark)',
        },
      },
      borderColor: {
        subtle: 'var(--border-subtle)',
        strong: 'var(--border-strong)',
        focus: 'var(--border-focus)',
      },
      fontFamily: {
        display: ['Manrope', 'system-ui', 'sans-serif'],
        body: ['Source Sans 3', 'system-ui', '-apple-system', 'sans-serif'],
      },
      // Escala tipográfica do sistema — prefixada, não substitui a do Tailwind
      fontSize: {
        'su-2xs': 'var(--fs-2xs)',
        'su-xs': 'var(--fs-xs)',
        'su-sm': 'var(--fs-sm)',
        'su-base': 'var(--fs-base)',
        'su-lg': 'var(--fs-lg)',
        'su-h4': 'var(--fs-h4)',
        'su-h3': 'var(--fs-h3)',
        'su-h2': 'var(--fs-h2)',
        'su-h1': 'var(--fs-h1)',
        'su-display': 'var(--fs-display)',
      },
      lineHeight: {
        'su-tight': 'var(--lh-tight)',
        'su-snug': 'var(--lh-snug)',
        'su-normal': 'var(--lh-normal)',
        'su-relaxed': 'var(--lh-relaxed)',
      },
      letterSpacing: {
        'su-tight': 'var(--ls-tight)',
        caps: 'var(--ls-caps)',
        'caps-lg': 'var(--ls-caps-lg)',
      },
      // Raios do sistema — 8px em card, 6px em botão/input.
      // Pill é só para tag/status, nunca para botão.
      borderRadius: {
        'su-xs': 'var(--radius-xs)',
        'su-sm': 'var(--radius-sm)',
        'su-md': 'var(--radius-md)',
        'su-lg': 'var(--radius-lg)',
        'su-xl': 'var(--radius-xl)',
        pill: 'var(--radius-pill)',
      },
      // A escala de 8pt do sistema bate exatamente com a do Tailwind
      // (1=4px … 20=80px), então aqui só entram os extras de layout.
      spacing: {
        sidebar: 'var(--sidebar-width)',
        header: 'var(--header-height)',
        gutter: 'var(--grid-gutter)',
        page: 'var(--page-pad)',
      },
      maxWidth: {
        content: 'var(--content-max)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-lg': 'var(--shadow-card-lg)',
        pop: 'var(--shadow-pop)',
        drawer: 'var(--shadow-drawer)',
        'pill-e': 'var(--shadow-pill)',
        btn: 'var(--shadow-btn)',
        'ring-accent': 'var(--ring-accent)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        standard: 'var(--ease-standard)',
      },
      transitionDuration: {
        fast: '100ms',
        base: '160ms',
        slow: '240ms',
      },
    }
  },
  plugins: []
};
