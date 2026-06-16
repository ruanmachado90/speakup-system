import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

function numeroParaExtenso(valor) {
  // Simples para valores até 9999
  if (!valor) return 'zero real';
  const partes = valor.toFixed(2).split('.');
  const reais = parseInt(partes[0]);
  const centavos = parseInt(partes[1]);
  let ext = reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).replace('R$', '').trim();
  ext += reais === 1 ? ' real' : ' reais';
  if (centavos > 0) ext += ` e ${centavos} centavos`;
  return ext;
}

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
  const valorExtenso = numeroParaExtenso(valorPago);
  const dataVenda = cobranca.createdAt ? new Date(cobranca.createdAt) : null;
  const dataVenc = cobranca.vencimento ? new Date(cobranca.vencimento) : null;
  const dataPag = cobranca.dataPagamento ? new Date(cobranca.dataPagamento) : null;
  const hojeStr = new Date().toLocaleDateString('pt-BR');
  // Referência agora é o material comprado
  const referenciaMaterial = cobranca.material || cobranca.referencia || '';

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-white p-8 print:p-0">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg border border-slate-200 p-0 overflow-hidden">
        {/* Cabeçalho azul e logo */}
        <div className="bg-[#005DE4] py-6 px-8 text-center">
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
        <div className="bg-gradient-to-r from-[#005DE4] to-[#003d99] text-white rounded-xl shadow p-6 my-6 text-center">
          <div className="text-xs opacity-90 mb-1">VALOR DA VENDA</div>
          <div className="text-3xl font-black mb-1">R$ {valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
          <div className="text-sm italic opacity-95">({valorExtenso})</div>
        </div>
        {/* Referência do material */}
        {referenciaMaterial && (
          <div className="bg-white border-2 border-dashed border-[#005DE4] rounded-lg py-3 px-4 text-center mb-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Material/Referência</div>
            <div className="text-lg font-bold text-[#005DE4]">{referenciaMaterial}</div>
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
          <button className="px-6 py-2 rounded bg-[#005DE4] text-white font-bold" onClick={() => window.print()}>Imprimir / PDF</button>
          <button
            className="px-6 py-2 rounded bg-emerald-600 text-white font-bold"
            onClick={() => {
              const html = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head><meta charset='utf-8'><title>Recibo ${cobranca.id}</title>
                <style>
                  body { font-family: Arial, sans-serif; color: #1e293b; margin: 40px; }
                  h1 { color: #005DE4; text-align: center; }
                  .label { font-weight: bold; color: #475569; }
                  .valor { font-size: 24pt; font-weight: bold; color: #005DE4; text-align: center; }
                  .extenso { font-style: italic; text-align: center; color: #334155; }
                  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                  td { padding: 6px 4px; border-bottom: 1px solid #e2e8f0; }
                  .rodape { margin-top: 40px; text-align: center; font-size: 9pt; color: #94a3b8; }
                  hr { border: none; border-top: 2px solid #005DE4; margin: 16px 0; }
                </style>
                </head>
                <body>
                  <h1>RECIBO DE VENDA</h1>
                  <p style="text-align:center;font-size:9pt;color:#64748b;">Recibo Nº ${cobranca.id}</p>
                  <p style="text-align:center;font-size:9pt;">
                    <strong>SPEAKUP ENGLISH LANGUAGE ACADEMY</strong><br/>
                    CNPJ: 28.649.636/0001-88<br/>
                    Praça Governador Valadares, 119 - Centro - Cataguases/MG
                  </p>
                  <hr/>
                  <p class="valor">R$ ${valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                  <p class="extenso">(${valorExtenso})</p>
                  ${referenciaMaterial ? `<p style="text-align:center;"><span class="label">Material/Referência:</span> ${referenciaMaterial}</p>` : ''}
                  <hr/>
                  <table>
                    <tr><td class="label">Aluno(a):</td><td>${cobranca.aluno || '-'}</td></tr>
                    <tr><td class="label">Data da Venda:</td><td>${dataVenda ? dataVenda.toLocaleDateString('pt-BR') : '-'}</td></tr>
                    <tr><td class="label">Vencimento:</td><td>${dataVenc ? dataVenc.toLocaleDateString('pt-BR') : '-'}</td></tr>
                    <tr><td class="label">Valor Pago:</td><td>R$ ${valorPago.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td></tr>
                    <tr><td class="label">Forma de Pagamento:</td><td>${cobranca.pagamento || '-'}</td></tr>
                    <tr><td class="label">Parcelas:</td><td>${cobranca.parcelas || '-'}</td></tr>
                  </table>
                  <div class="rodape">Recibo gerado em ${hojeStr} — SpeakUp English Language Academy</div>
                </body></html>`;
              const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Recibo-${cobranca.aluno || cobranca.id}.doc`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Baixar .doc
          </button>
        </div>
      </div>
    </div>
  );
}
