import { Search, X } from 'lucide-react';
import { TIPO_SAIDA, GRUPO_POR_ID } from '../../utils/despesasAnalise';
import Segmentado from './Segmentado';

const selectCls = 'border border-strong bg-surface-card rounded-su-sm px-3 py-2 text-su-sm font-semibold text-content-body focus:outline-none focus-visible:shadow-ring-accent';

export const OUTRAS = '__outras';

const STATUS = [
  { id: 'pagas', rotulo: 'Pagas' },
  { id: 'aPagar', rotulo: 'A pagar' },
  { id: 'vencidas', rotulo: 'Vencidas', alerta: true },
  { id: 'todas', rotulo: 'Todas' },
];

/**
 * Busca e filtros da lista de despesas. Só apresentação — quem filtra é a
 * página. A busca aceita descrição, categoria, fornecedor, valor e data; "/"
 * foca o campo e Esc limpa.
 */
export default function FiltrosDespesas({
  busca, setBusca, buscaRef,
  statusFiltro, setStatusFiltro, contagens,
  categoriaFiltro, setCategoriaFiltro, categoriasPadrao, opcoesCategoria,
  tipoFiltro, setTipoFiltro,
  grupoFiltro, setGrupoFiltro,
  termos, escopoBusca, setEscopoBusca, rotuloPeriodo,
  filtrosAtivos, limparFiltros,
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Situação">
        {STATUS.map((s) => {
          const ativo = statusFiltro === s.id;
          const n = contagens[s.id];
          const tomAtivo = s.alerta ? 'bg-danger text-white' : 'bg-accent text-white';
          const tomInativo = s.alerta && n > 0
            ? 'bg-danger-bg text-danger-fg hover:bg-red-100'
            : 'bg-surface-sunken text-content-body hover:bg-gr-200';
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatusFiltro(s.id)}
              aria-pressed={ativo}
              className={`px-3 py-1.5 rounded-su-sm text-su-sm font-semibold transition-colors focus:outline-none focus-visible:shadow-ring-accent ${ativo ? tomAtivo : tomInativo}`}
            >
              {s.rotulo}
              {n > 0 && <span className="ml-1.5 text-su-2xs tabular-nums opacity-80">{n}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-faint" aria-hidden="true" />
          <input
            ref={buscaRef}
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setBusca(''); }}
            placeholder="Buscar por descrição, fornecedor, categoria, valor ou data…"
            aria-label="Buscar despesas"
            autoComplete="off"
            className="w-full pl-9 pr-16 py-2 border border-strong bg-surface-card rounded-su-sm text-su-sm text-content-body placeholder:text-content-muted focus:outline-none focus-visible:shadow-ring-accent [&::-webkit-search-cancel-button]:hidden"
          />
          {busca ? (
            <button
              type="button"
              onClick={() => { setBusca(''); buscaRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-su-xs text-content-muted hover:text-content-body hover:bg-surface-sunken"
              aria-label="Limpar busca"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="hidden md:inline absolute right-3 top-1/2 -translate-y-1/2 text-su-xs font-semibold text-content-muted border border-subtle rounded-su-xs px-1.5 py-0.5">/</kbd>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className={selectCls} aria-label="Filtrar por categoria">
            <option value="">Todas as categorias</option>
            {categoriasPadrao.map((c) => <option key={c} value={c}>{c}</option>)}
            {opcoesCategoria.length > 0 && (
              <optgroup label="Personalizadas">
                <option value={OUTRAS}>Todas as personalizadas</option>
                {opcoesCategoria.map((c) => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            )}
          </select>
          <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className={selectCls} aria-label="Filtrar por tipo de saída">
            <option value="">Todos os tipos</option>
            {Object.entries(TIPO_SAIDA).map(([v, rotulo]) => <option key={v} value={v}>{rotulo}</option>)}
          </select>
        </div>
      </div>

      {(termos.length > 0 || filtrosAtivos) && (
        <div className="flex flex-wrap items-center gap-2 text-su-sm">
          {termos.length > 0 && (
            <Segmentado
              rotulo="Escopo da busca"
              valor={escopoBusca}
              onChange={setEscopoBusca}
              tom="card"
              tamanho="sm"
              opcoes={[
                { valor: 'periodo', rotulo: rotuloPeriodo },
                { valor: 'todos', rotulo: 'Todos os períodos' },
              ]}
            />
          )}
          {grupoFiltro && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-blues-50 text-blues-700 px-2.5 py-1 text-su-xs font-semibold">
              Grupo: {GRUPO_POR_ID[grupoFiltro].nome}
              <button type="button" onClick={() => setGrupoFiltro('')} aria-label="Remover filtro de grupo" className="hover:text-content-strong">
                <X size={12} />
              </button>
            </span>
          )}
          {filtrosAtivos && (
            <button type="button" onClick={limparFiltros} className="text-su-xs font-semibold text-accent hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </>
  );
}
