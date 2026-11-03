import { useState } from 'react';
import { fotoDoProfessor, iniciaisDoNome } from '../../utils/agendaProfessor';

const TAMANHOS = {
  sm: 'w-9 h-9 text-su-xs',
  md: 'w-10 h-10 text-su-sm',
  lg: 'w-14 h-14 text-su-lg',
};

/** Foto do professor em círculo; sem foto (ou se não carregar), as iniciais. */
export default function AvatarProfessor({ nome, tamanho = 'md' }) {
  const foto = fotoDoProfessor(nome);
  const [falhou, setFalhou] = useState(false);
  const classe = `${TAMANHOS[tamanho]} rounded-pill bg-info-bg text-info-fg flex items-center justify-center font-display font-bold flex-shrink-0 overflow-hidden`;

  if (foto && !falhou) {
    return (
      <span className={classe}>
        <img src={foto} alt="" className="w-full h-full object-cover" onError={() => setFalhou(true)} />
      </span>
    );
  }
  return <span className={classe} aria-hidden="true">{iniciaisDoNome(nome)}</span>;
}
