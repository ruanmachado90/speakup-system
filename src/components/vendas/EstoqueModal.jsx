import { useState } from 'react';

export default function EstoqueModal({ editingItem, onClose, onSave, categoriasLivros, gerarNumerosLivros }) {
  const [form, setForm] = useState(() => {
    if (editingItem) {
      return {
        livro: editingItem.livro,
        quantidade: editingItem.quantidade?.toString(),
        estoqueMinimo: editingItem.estoqueMinimo?.toString() || '5',
        precoCusto: editingItem.precoCusto?.toString() || '',
        precoVenda: editingItem.precoVenda?.toString() || '',
      };
    }
    return {
      categoria: '',
      numeroLivro: '',
      livro: '',
      quantidade: '',
      estoqueMinimo: '5',
      precoCusto: '',
      precoVenda: '',
    };
  });

  const calcularLivro = (categoria, numero) => {
    return categoria && numero ? `${categoria} Book ${numero}` : '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg relative">
        <button className="absolute top-2 right-2 text-slate-400 hover:text-red-500" onClick={onClose}>&times;</button>
        <h3 className="text-xl font-bold mb-4">{editingItem ? 'Editar item do estoque' : 'Adicionar item ao estoque'}</h3>
        <form
          className="space-y-4"
          onSubmit={async (e) => { e.preventDefault(); await onSave(form); }}
        >
          {editingItem ? (
            <div>
              <label className="block text-sm font-semibold mb-1">Livro</label>
              <input
                type="text"
                value={form.livro || ''}
                className="w-full border rounded-lg px-4 py-2 bg-gray-100 text-gray-600 focus:outline-none"
                disabled
              />
            </div>
          ) : (
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
            <label className="block text-sm font-semibold mb-1">Quantidade em Estoque *</label>
            <input
              type="number"
              value={form.quantidade || ''}
              onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
              placeholder="0"
              min="0"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Estoque Mínimo</label>
            <input
              type="number"
              value={form.estoqueMinimo || '5'}
              onChange={e => setForm(f => ({ ...f, estoqueMinimo: e.target.value }))}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
              placeholder="5"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Preço de Custo</label>
            <input
              type="number"
              value={form.precoCusto || ''}
              onChange={e => setForm(f => ({ ...f, precoCusto: e.target.value }))}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
              placeholder="R$ 0,00"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Preço de Venda</label>
            <input
              type="number"
              value={form.precoVenda || ''}
              onChange={e => setForm(f => ({ ...f, precoVenda: e.target.value }))}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
              placeholder="R$ 0,00"
              min="0"
              step="0.01"
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
            >
              {editingItem ? 'Salvar Alterações' : 'Adicionar ao Estoque'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
