const ITEMS = [
  { key: 'pendientes', label: 'Pendientes', tone: 'warning', match: (a) => a.estado === 'pendiente' || a.estado === 'en_proceso' },
  { key: 'adicional', label: 'Evaluación adicional', tone: 'violet', match: (a) => a.estado === 'requiere_adicional' },
  { key: 'evaluados', label: 'Evaluados', tone: 'success', match: (a) => a.estado === 'evaluado' },
];

export default function StatsBar({ assignments, active, onSelect }) {
  return (
    <div className="ev-stats">
      <button
        type="button"
        className={`ev-stat ${active === 'todos' ? 'is-active' : ''}`}
        onClick={() => onSelect('todos')}
      >
        <span className="ev-stat__label">Asignados</span>
        <span className="ev-stat__value">{assignments.length}</span>
      </button>
      {ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`ev-stat ev-stat--${item.tone} ${active === item.key ? 'is-active' : ''}`}
          onClick={() => onSelect(item.key)}
        >
          <span className="ev-stat__label">{item.label}</span>
          <span className="ev-stat__value">{assignments.filter(item.match).length}</span>
        </button>
      ))}
    </div>
  );
}

export const FILTERS = {
  todos: () => true,
  ...Object.fromEntries(ITEMS.map((i) => [i.key, i.match])),
};
