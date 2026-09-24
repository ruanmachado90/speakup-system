import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, ShieldX, SearchX, Loader2 } from 'lucide-react';
import logoUrl from '../assets/logo-speakup-azul.png';
import { buscarCertificado } from '../utils/certificadoStore';
import { normalizarCodigo, dataBR } from '../utils/certificado';

/**
 * Página pública de verificação de certificado (destino do QR do PDF).
 * Mostra só o que o certificado afirma: nome, curso, data, situação.
 */
export default function VerificarCertificado() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const [digitado, setDigitado] = useState(codigo || '');
  // Resultado da última consulta, marcado com o código a que se refere (`para`).
  // Enquanto o resultado guardado é de outro código, a tela mostra "consultando".
  const [resultado, setResultado] = useState({ para: null, fase: 'idle' });
  const estado = resultado.para === (codigo || null)
    ? resultado
    : { fase: codigo ? 'buscando' : 'idle' };

  useEffect(() => {
    if (!codigo) return undefined;
    let cancelado = false;
    buscarCertificado(codigo)
      .then((cert) => {
        if (cancelado) return;
        if (!cert) setResultado({ para: codigo, fase: 'inexistente' });
        else setResultado({ para: codigo, fase: cert.status === 'revogado' ? 'revogado' : 'valido', cert });
      })
      .catch((e) => {
        console.error('[VerificarCertificado]', e);
        if (!cancelado) setResultado({ para: codigo, fase: 'erro' });
      });
    return () => { cancelado = true; };
  }, [codigo]);

  const consultar = (e) => {
    e.preventDefault();
    const c = normalizarCodigo(digitado);
    if (!c) {
      setResultado({ para: codigo || null, fase: 'inexistente' });
      return;
    }
    navigate(`/verificar/${c}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#edf2f8] to-[#dbe8f8] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-7 text-center">
        <img src={logoUrl} alt="SpeakUp English School" className="h-9 mx-auto mb-5" />
        <h1 className="text-xl font-black text-[#101214] mb-1">Verificação de certificado</h1>
        <p className="text-sm text-slate-500 mb-5">Confirme se um certificado foi realmente emitido pela SpeakUp.</p>

        <form onSubmit={consultar} className="flex gap-2 mb-5">
          <input
            value={digitado}
            onChange={(e) => setDigitado(e.target.value)}
            placeholder="SU-2026-XXXXXX"
            aria-label="Código do certificado"
            autoCapitalize="characters"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#0e48fe]"
          />
          <button type="submit" className="px-4 py-2 bg-[#0e48fe] text-white rounded-lg text-sm font-semibold hover:bg-[#0b3ad4]">
            Verificar
          </button>
        </form>

        <div aria-live="polite">
          {estado.fase === 'buscando' && (
            <p className="flex items-center justify-center gap-2 text-slate-500 text-sm"><Loader2 size={16} className="animate-spin" /> Consultando...</p>
          )}

          {estado.fase === 'valido' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-left">
              <p className="flex items-center gap-2 font-bold text-emerald-800 mb-3"><BadgeCheck size={20} /> Certificado válido</p>
              <Dado rotulo="Aluno(a)" valor={estado.cert.nome} forte />
              <Dado rotulo="Certificado" valor={estado.cert.titulo} />
              <Dado rotulo="Data de emissão" valor={dataBR(estado.cert.dataEmissao)} />
              <Dado rotulo="Código" valor={estado.cert.codigo} mono />
              <p className="text-xs text-emerald-700 mt-3">Emitido pela SpeakUp English School — Cataguases/MG.</p>
            </div>
          )}

          {estado.fase === 'revogado' && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-left">
              <p className="flex items-center gap-2 font-bold text-red-800 mb-2"><ShieldX size={20} /> Certificado revogado</p>
              <p className="text-sm text-red-800">
                O certificado <span className="font-mono">{estado.cert.codigo}</span> existe, mas foi cancelado pela escola e não é mais válido.
                Em caso de dúvida, fale com a SpeakUp.
              </p>
            </div>
          )}

          {estado.fase === 'inexistente' && (
            <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-left">
              <p className="flex items-center gap-2 font-bold text-amber-800 mb-2"><SearchX size={20} /> Certificado não encontrado</p>
              <p className="text-sm text-amber-800">
                Não existe certificado com esse código. Confira se digitou igual ao que está no documento (o formato é SU-AAAA-XXXXXX).
                Se o código está correto, o documento pode não ser autêntico.
              </p>
            </div>
          )}

          {estado.fase === 'erro' && (
            <p role="alert" className="text-sm text-red-600">Não foi possível consultar agora. Tente novamente em instantes.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const Dado = ({ rotulo, valor, forte, mono }) => (
  <div className="mb-2">
    <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">{rotulo}</p>
    <p className={`${forte ? 'text-lg font-black' : 'text-sm font-semibold'} ${mono ? 'font-mono' : ''} text-slate-900`}>{valor}</p>
  </div>
);
