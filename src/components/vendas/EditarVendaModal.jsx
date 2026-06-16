import { useState } from 'react';

export default function EditarVendaModal({ venda, onClose, onSave, loading, livros }) {
  const [form, setForm] = useState(() => ({
    aluno: venda.aluno || '',
    tipo: venda.tipo || '',
    livro: venda.livro || '',
    valor: venda.valor || '',
    pagamento: venda.pagamento || '',
    vencimento: venda.vencimento || '',
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg relative">
        <button className="absolute top-2 right-2 text-slate-400 hover:text-red-500" onClick={onClose}>&times;</button>
        <h3 className="text-xl font-bold mb-4">Editar venda</h3>
        <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); await onSave(form); }}>
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
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
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
              <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                <strong>Atenção:</strong> Para alterar categoria/livro, será necessário recriar a venda com as novas informações.
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Livro Atual</label>
                <select
                  value={form.livro || ''}
                  onChange={e => setForm(f => ({ ...f, livro: e.target.value }))}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#005DE4]"
                >
                  <option value="">Selecione o livro</option>
                  {livros.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <small className="text-xs text-gray-500">* Apenas para correções menores</small>
              </div>
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
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
