export const Table = ({header, data, render}) => (
  <table className="w-full">
    <thead className="bg-slate-50">
      <tr>{header.map(h=><th key={h} className="px-6 py-3 text-left text-xs">{h}</th>)}</tr>
    </thead>
    <tbody>
      {data.map(r => <tr key={r.id} className="border-t">{render(r)}</tr>)}
    </tbody>
  </table>
);
