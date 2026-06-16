import { useState } from 'react';

export default function NovaVendaModal({ onClose, onSubmit, loading, categoriasLivros, gerarNumerosLivros }) {
  const [form, setForm] = useState({
    aluno: '',
    tipo: '',
    categoria: '',
    numeroLivro: '',
    livro: '',
    valor: '',
    pagamento: '',
    parcelas: '1/1',
    vencimento: '',
  });

  const calcularLivro = (categoria, numero) => {
    return categoria && numero ? `${categoria} Book ${numero}` : '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg relative">
        <button className="absolute top-2 right-2 text-slate-400 hover:text-red-500" onClick={onClose}>&times;</button>
        <h3 className="text-xl font-bold mb-4">Nova venda</h3>
        <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); await onSubmit(form); }}>
          <div>
            <label className="block text-sm font-semibold mb-1">Nome do Aluno *</label>
            <input
              type="text"
              value={form.aluno || ''}
              onChange={e => setForm(f => ({ ...f, aluno: e.target.value }))}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
              placeholder="Nome completo"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Tipo de Compra *</label>
            <select
              value={form.tipo || ''}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value, livro: '' }))}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
              required
            >
              <option value="">Selecione o tipo</option>
              <option value="Material Didático">Material Didático</option>
              <option value="Uniforme">Uniforme</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
          {form.tipo === 'Material Didático' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Categoria *</label>
                <select
                  value={form.categoria || ''}
                  onChange={e => {
                    const categoria = e.target.value;
                    const livro = calcularLivro(categoria, form.numeroLivro);
                    setForm(f => ({ ...f, categoria, numeroLivro: '', livro }));
                  }}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                  required
                >
                  <option value="">Selecione a categoria</option>
                  {categoriasLivros.map(c => (
                    <option key={c.valor} value={c.valor}>{c.label}</option>
                  ))}
                </select>
              </div>
              {form.categoria && (
                <div>
                  <label className="block text-sm font-semibold mb-1">Livro *</label>
                  <select
                    value={form.numeroLivro || ''}
                    onChange={e => {
                      const numero = e.target.value;
                      const livro = calcularLivro(form.categoria, numero);
                      setForm(f => ({ ...f, numeroLivro: numero, livro }));
                    }}
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                    required
                  >
                    <option value="">Selecione o número</option>
                    {gerarNumerosLivros(form.categoria).map(l => (
                      <option key={l.valor} value={l.valor}>{l.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {form.livro && (
                <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                  <strong>Livro selecionado:</strong> {form.livro}
                </div>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold mb-1">Valor Total *</label>
            <input
              type="number"
              value={form.valor || ''}
              onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
              placeholder="R$ 0,00"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Forma de Pagamento *</label>
            <select
              value={form.pagamento || ''}
              onChange={e => setForm(f => ({ ...f, pagamento: e.target.value }))}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
              required
            >
              <option value="">Selecione a forma</option>
              <option value="PIX">PIX</option>
              <option value="BOLETO">BOLETO</option>
              <option value="CARTÃO">CARTÃO</option>
              <option value="DINHEIRO">DINHEIRO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Número de Parcelas</label>
            <select
              value={form.parcelas || '1/1'}
              onChange={e => setForm(f => ({ ...f, parcelas: e.target.value }))}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
            >
              {[1, 2, 3, 4, 5, 6].map(num => (
                <option key={num} value={`${num}/${num}`}>{num}x</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Vencimento da Primeira Parcela *</label>
            <input
              type="date"
              value={form.vencimento || ''}
              onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
              required
            />
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              className="px-6 py-2 rounded-lg bg-slate-200 text-slate-700 font-medium hover:bg-slate-300 transition-colors"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-[#005DE4] text-white font-bold hover:bg-[#004BB8] transition-colors"
              disabled={loading}
            >
              {loading ? 'Criando...' : 'Criar Venda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
