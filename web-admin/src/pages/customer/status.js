// Estatus de la orden de trabajo (seguimiento del vehículo)
export const WO_STEPS = [
  { key: 'RECEIVED', label: 'Recibido' },
  { key: 'DIAGNOSIS', label: 'Diagnóstico' },
  { key: 'AWAITING_AUTH', label: 'Esperando autorización' },
  { key: 'IN_REPAIR', label: 'En reparación' },
  { key: 'FINAL_TESTING', label: 'Pruebas finales' },
  { key: 'READY_FOR_PICKUP', label: 'Listo para entrega' },
];

export const WO_STATUS = {
  RECEIVED:         { label: 'Recibido', color: 'bg-blue-100 text-blue-700' },
  DIAGNOSIS:        { label: 'Diagnóstico', color: 'bg-indigo-100 text-indigo-700' },
  AWAITING_AUTH:    { label: 'Esperando autorización', color: 'bg-amber-100 text-amber-700' },
  IN_REPAIR:        { label: 'En reparación', color: 'bg-orange-100 text-orange-700' },
  FINAL_TESTING:    { label: 'Pruebas finales', color: 'bg-purple-100 text-purple-700' },
  READY_FOR_PICKUP: { label: 'Listo para entrega', color: 'bg-green-100 text-green-700' },
  DELIVERED:        { label: 'Entregado', color: 'bg-gray-200 text-gray-700' },
  CANCELLED:        { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
};

export const APPT_STATUS = {
  PENDING:     { label: 'Pendiente', color: 'bg-amber-100 text-amber-700' },
  CONFIRMED:   { label: 'Confirmada', color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'En proceso', color: 'bg-orange-100 text-orange-700' },
  COMPLETED:   { label: 'Completada', color: 'bg-green-100 text-green-700' },
  CANCELLED:   { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
  NO_SHOW:     { label: 'No asistió', color: 'bg-gray-200 text-gray-600' },
};

export const QUOTE_STATUS = {
  DRAFT:    { label: 'Borrador', color: 'bg-gray-100 text-gray-600' },
  SENT:     { label: 'Por aprobar', color: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Aprobada', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rechazada', color: 'bg-red-100 text-red-700' },
  EXPIRED:  { label: 'Expirada', color: 'bg-gray-200 text-gray-600' },
};

export const money = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0));

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
