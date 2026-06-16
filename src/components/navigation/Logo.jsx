export const Logo = ({ collapsed }) => (
  <div className="h-14 flex items-center justify-center border-b border-slate-100 flex-shrink-0">
    {collapsed ? (
      <img
        src="https://www.speakupcataguases.com/wp-content/uploads/2026/05/icone-2-azul.png"
        alt="SpeakUp"
        className="w-8 h-8 object-contain"
      />
    ) : (
      <img
        src="https://www.speakupcataguases.com/wp-content/uploads/2026/02/logo-speakup-azul.png"
        alt="SpeakUp"
        className="h-7 object-contain"
      />
    )}
  </div>
);
