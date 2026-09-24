import { useEffect, useMemo, useState } from 'react';
import { Award, X, Loader2, Download, Ban } from 'lucide-react';
import { auth } from '../../firebase';
import { NIVEIS_CERTIFICADO, nivelDoAluno, tituloDoNivel, dataBR } from '../../utils/certificado';
import { emitirCertificado, certificadosDoAluno, revogarCertificado } from '../../utils/certificadoStore';
import { paraISODia } from '../../utils/matricula';

/**
 * Emite o certificado de conclusão de um aluno. O nível já vem da turma dele
 * (ou do curso + book); a secretaria confere/ajusta antes de emitir.
 */
export default function EmitirCertificadoModal({ aluno, turma, onClose, toastMsg }) {
  const nivelInicial = useMemo(() => nivelDoAluno(aluno, turma), [aluno, turma]);
  const [nivel, setNivel] = useState(nivelInicial);
  const [titulo, setTitulo] = useState(tituloDoNivel(nivelInicial));
  const [data, setData] = useState(() => paraISODia(new Date()));
  const [emitidos, setEmitidos] = useState(null); // null = carregando
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let cancelado = false;
    certificadosDoAluno(aluno.id)
      .then((lista) => { if (!cancelado) setEmitidos(lista); })
      .catch((e) => { console.error(e); if (!cancelado) setEmitidos([]); });
    return () => { cancelado = true; };
  }, [aluno.id]);

  const trocarNivel = (n) => {
    setNivel(n);
    if (n) setTitulo(tituloDoNivel(n));
  };

  const baixar = async (cert) => {
    const { baixarCertificadoPDF } = await import('../../utils/certificadoPDF');
    await baixarCertificadoPDF(cert);
  };

  const emitir = async (e) => {
    e.preventDefault();
    setErro('');
    const jaTem = (emitidos || []).find((c) => c.status === 'valido' && c.titulo === titulo.trim());
    if (jaTem && !window.confirm(`${aluno.name} já tem um certificado válido de "${titulo.trim()}" (${jaTem.codigo}). Emitir outro mesmo assim?`)) return;
    setSalvando(true);
    try {
      const cert = await emitirCertificado({
        aluno, titulo, nivel, dataEmissao: data, emitidoPor: auth.currentUser?.email || auth.currentUser?.uid || null,
      });
      await baixar(cert);
      setEmitidos((prev) => [cert, ...(prev || [])]);
      toastMsg?.(`Certificado ${cert.codigo} emitido`);
    } catch (err) {
      console.error(err);
      setErro(err.message || 'Erro ao emitir o certificado.');
    } finally {
      setSalvando(false);
    }
  };

  const revogar = async (cert) => {
    const motivo = window.prompt(`Revogar o certificado ${cert.codigo}? Ele continua consultável, mas aparece como REVOGADO.\n\nMotivo (opcional):`);
    if (motivo === null) return;
    try {
      await revogarCertificado(cert.codigo, motivo);
      setEmitidos((prev) => prev.map((c) => (c.codigo === cert.codigo ? { ...c, status: 'revogado' } : c)));
      toastMsg?.('Certificado revogado');
    } catch (err) {
      console.error(err);
      setErro('Erro ao revogar o certificado.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-[#0e48fe] text-white p-2 rounded-lg"><Award size={18} /></div>
            <div>
              <h3 className="font-bold text-slate-800">Emitir certificado</h3>
              <p className="text-sm text-slate-500">{aluno.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>

        <form onSubmit={emitir} className="p-5 space-y-4">
          {aluno.status === 'cancelado' && (
            <p role="alert" className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
              Este aluno está com a matrícula cancelada.
            </p>
          )}

          <div className="flex flex-col">
            <label htmlFor="cert-nivel" className="text-sm font-bold text-slate-600 mb-1">Nível</label>
            <select id="cert-nivel" value={nivel} onChange={(e) => trocarNivel(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0e48fe]">
              <option value="">{nivelInicial ? 'Outro (digitar título)' : 'Selecione o nível'}</option>
              {Object.keys(NIVEIS_CERTIFICADO).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {nivelInicial
                ? `Nível sugerido pela turma${turma?.nome ? ` (${turma.nome})` : ''}.`
                : 'Não foi possível deduzir o nível pela turma — escolha manualmente.'}
            </p>
          </div>

          <div className="flex flex-col">
            <label htmlFor="cert-titulo" className="text-sm font-bold text-slate-600 mb-1">Título no certificado</label>
            <input id="cert-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={120}
              className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0e48fe]" />
          </div>

          <div className="flex flex-col">
            <label htmlFor="cert-data" className="text-sm font-bold text-slate-600 mb-1">Data de emissão</label>
            <input id="cert-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required
              className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0e48fe]" />
          </div>

          {erro && <p role="alert" className="text-red-600 text-sm">{erro}</p>}

          <button type="submit" disabled={salvando || emitidos === null}
            className="w-full py-2.5 bg-[#0e48fe] text-white rounded-lg font-semibold hover:bg-[#0b3ad4] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {salvando ? <><Loader2 size={16} className="animate-spin" /> Emitindo...</> : <><Award size={16} /> Emitir e baixar PDF</>}
          </button>
        </form>

        {emitidos && emitidos.length > 0 && (
          <div className="px-5 pb-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Já emitidos para este aluno</p>
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {emitidos.map((c) => (
                <li key={c.codigo} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{c.titulo}</p>
                    <p className="text-xs text-slate-500">
                      {c.codigo} · {dataBR(c.dataEmissao)}
                      {c.status === 'revogado' && <span className="ml-2 font-bold text-red-600">REVOGADO</span>}
                    </p>
                  </div>
                  <button type="button" onClick={() => baixar(c)} title="Baixar PDF" aria-label={`Baixar certificado ${c.codigo}`}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Download size={15} /></button>
                  {c.status !== 'revogado' && (
                    <button type="button" onClick={() => revogar(c)} title="Revogar" aria-label={`Revogar certificado ${c.codigo}`}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600"><Ban size={15} /></button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
