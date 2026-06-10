import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const fDate = (date) =>
  date ? format(parseISO(String(date)), 'dd/MM/yyyy', { locale: es }) : '—';

export const fDateTime = (date) =>
  date ? format(parseISO(String(date)), "dd/MM/yyyy HH:mm", { locale: es }) : '—';

export const fRelative = (date) =>
  date ? formatDistanceToNow(parseISO(String(date)), { addSuffix: true, locale: es }) : '—';

export const fMoney = (amount) =>
  amount != null
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(amount))
    : '—';

export const fNumber = (n) =>
  n != null ? new Intl.NumberFormat('es-MX').format(Number(n)) : '—';

export const fPhone = (phone) =>
  phone
    ? phone.replace(/(\+52)(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4')
    : '—';
