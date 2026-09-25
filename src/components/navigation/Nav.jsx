export const Nav = ({ icon, label, active, onClick, collapsed, badge }) => (
  <button
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={`w-full flex items-center rounded-lg text-sm transition-colors ${
      collapsed ? 'justify-center py-2.5' : 'gap-2.5 px-3 py-2'
    } ${
      active
        ? 'bg-[#0e48fe]/10 font-semibold text-accent'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    <span className={`flex-shrink-0 relative ${active ? 'text-accent' : 'text-slate-400'}`}>
      {icon}
      {badge && collapsed && (
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-accent rounded-full border border-white" />
      )}
    </span>
    {!collapsed && <span className="truncate flex-1">{label}</span>}
    {!collapsed && badge && (
      <span className="ml-auto bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
        {badge}
      </span>
    )}
  </button>
);
