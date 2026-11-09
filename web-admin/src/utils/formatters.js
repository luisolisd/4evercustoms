import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const fDate = (date) =>
  date ? format(parseISO(String(date)), 'dd/MM/yyyy', { locale: es }) : '—';

export const fDateTime = (date) =>
  date ? format(parseISO(String(date)), "dd/MM/yyyy HH:mm", { locale: es }) : '—';

export const fMoney = (amount) =>
  amount != null
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(amount))
    : '—';

export const fNumber = (n) =>
  n != null ? new Intl.NumberFormat('es-MX').format(Number(n)) : '—';


// ISO (UTC) → valor para <input type="datetime-local"> en hora LOCAL ("YYYY-MM-DDTHH:mm")
export const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Valor de <input type="datetime-local"> (hora local) → ISO UTC; '' si está vacío/invalid
export const fromLocalInput = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
};

