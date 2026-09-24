import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { gerarReciboVendaPDF, valorPorExtenso } from '../utils/recibo';

export default function Recibo() {
  const { id } = useParams();
  const [cobranca, setCobranca] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCobranca() {
      const snap = await getDoc(doc(db, 'vendas', id));
      setCobranca(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    }
    fetchCobranca();
  }, [id]);

  if (loading) return <div className="p-8 text-slate-500">Carregando recibo...</div>;
  if (!cobranca) return <div className="p-8 text-red-500">Cobrança não encontrada.</div>;

  // Dados para recibo
  const valor = Number(cobranca.valor || 0);
  const valorPago = Number(cobranca.valorPago || cobranca.valor || 0);
  const valorExtenso = valorPorExtenso(valorPago);
  const dataVenda = cobranca.createdAt ? new Date(cobranca.createdAt) : null;
  const dataVenc = cobranca.vencimento ? new Date(cobranca.vencimento) : null;
  const hojeStr = new Date().toLocaleDateString('pt-BR');
  // Referência agora é o material comprado
  const referenciaMaterial = cobranca.material || cobranca.referencia || '';

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-white p-8 print:p-0">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg border border-slate-200 p-0 overflow-hidden">
        {/* Cabeçalho azul e logo */}
        <div className="bg-[#0e48fe] py-6 px-8 text-center">
          <img src="https://www.speakupcataguases.com/wp-content/uploads/2025/11/logo-speakup-brancal-1.png" alt="Logo SpeakUp" className="h-12 mx-auto mb-2" />
          <h2 className="text-2xl font-black text-white tracking-wide mb-1">RECIBO DE VENDA</h2>
          <div className="text-xs text-blue-100">Recibo Nº {cobranca.id}</div>
        </div>
        {/* Empresa info */}
        <div className="text-center text-xs text-slate-500 mt-4 mb-2">
          <strong>SPEAKUP ENGLISH LANGUAGE ACADEMY</strong><br />
          CNPJ: 28.649.636/0001-88<br />
          Praça Governador Valadares, 119 - Centro - Cataguases/MG
        </div>
        {/* Valor box */}
        <div className="bg-gradient-to-r from-[#0e48fe] to-[#0b3ad4] text-white rounded-xl shadow p-6 my-6 text-center">
          <div className="text-xs opacity-90 mb-1">VALOR DA VENDA</div>
          <div className="text-3xl font-black mb-1">R$ {valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
          <div className="text-sm italic opacity-95">({valorExtenso})</div>
        </div>
        {/* Referência do material */}
        {referenciaMaterial && (
          <div className="bg-white border-2 border-dashed border-[#0e48fe] rounded-lg py-3 px-4 text-center mb-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Material/Referência</div>
            <div className="text-lg font-bold text-[#0e48fe]">{referenciaMaterial}</div>
          </div>
        )}
        {/* Dados da venda */}
        <div className="bg-slate-50 rounded-lg p-4 mb-4">
          <div className="flex flex-wrap gap-4 text-sm mb-2">
            <div className="flex-1 min-w-[120px]">
              <div className="font-semibold text-slate-600">Aluno(a):</div>
              <div className="text-slate-800">{cobranca.aluno}</div>
            </div>
            <div className="flex-1 min-w-[120px]">
              <div className="font-semibold text-slate-600">Data da Venda:</div>
              <div className="text-slate-800">{dataVenda ? dataVenda.toLocaleDateString('pt-BR') : '-'}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm mb-2">
            <div className="flex-1 min-w-[120px]">
              <div className="font-semibold text-slate-600">Vencimento:</div>
              <div className="text-slate-800">{dataVenc ? dataVenc.toLocaleDateString('pt-BR') : '-'}</div>
            </div>
            <div className="flex-1 min-w-[120px]">
              <div className="font-semibold text-slate-600">Valor Pago:</div>
              <div className="text-slate-800">R$ {valorPago.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex-1 min-w-[120px]">
              <div className="font-semibold text-slate-600">Forma de Pagamento:</div>
              <div className="text-slate-800">{cobranca.pagamento || '-'}</div>
            </div>
            <div className="flex-1 min-w-[120px]">
              <div className="font-semibold text-slate-600">Parcelas:</div>
              <div className="text-slate-800">{cobranca.parcelas || '-'}</div>
            </div>
          </div>
        </div>
        {/* Rodapé */}
        <div className="text-center text-xs text-slate-500 mt-8 mb-2">
          Recibo gerado em {hojeStr}<br />SpeakUp English Language Academy
        </div>
        <div className="mt-6 flex justify-center gap-3 print:hidden">
          <button
            className="px-6 py-2 rounded bg-[#0e48fe] text-white font-bold"
            onClick={async () => {
              try {
                await gerarReciboVendaPDF(cobranca);
              } catch (e) {
                alert('Erro ao gerar o recibo: ' + (e?.message || 'tente novamente'));
              }
            }}
          >
            Baixar recibo (PDF)
          </button>
          <button className="px-6 py-2 rounded border border-slate-300 text-slate-600 font-bold" onClick={() => window.print()}>Imprimir esta tela</button>
        </div>
      </div>
    </div>
  );
}
