import { ESTADOS } from '../utils/format';

export default function StatusBadge({ estado }) {
  const info = ESTADOS[estado] || { label: estado, tone: 'muted' };
  return <span className={`ev-badge ev-badge--${info.tone}`}>{info.label}</span>;
}
