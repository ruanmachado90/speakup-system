import React from 'react';

export function SidebarNav({ icon, label, active, onClick, collapsed, badge }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center rounded-lg text-sm transition-colors relative ${
        collapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2.5'
      } ${
        active
          ? 'bg-[#005DE4]/10 font-semibold text-[#005DE4]'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <span className={`flex-shrink-0 ${active ? 'text-[#005DE4]' : 'text-slate-400'}`}>
        {icon}
      </span>
      {!collapsed && <span className="truncate flex-1 text-left">{label}</span>}
      {badge > 0 && !collapsed && (
        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      {badge > 0 && collapsed && (
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}
