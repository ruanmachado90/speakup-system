export const Nav = ({icon, label, active, onClick}) => (
  <button 
    onClick={onClick}
    className={`w-full flex gap-3 px-4 py-3 rounded-xl mb-1 ${active ? "bg-white/20" : "hover:bg-white/10"}`}
  >
    {icon}{label}
  </button>
);
