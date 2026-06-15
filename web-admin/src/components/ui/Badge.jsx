import clsx from 'clsx';

const COLORS = {
  gray:   'bg-gray-100 text-gray-700 ring-gray-200',
  blue:   'bg-blue-50 text-blue-700 ring-blue-200',
  yellow: 'bg-amber-50 text-amber-700 ring-amber-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  green:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  purple: 'bg-purple-50 text-purple-700 ring-purple-200',
  red:    'bg-red-50 text-red-700 ring-red-200',
  teal:   'bg-teal-50 text-teal-700 ring-teal-200',
  brand:  'bg-brand-50 text-brand-700 ring-brand-200',
};

export default function Badge({ color = 'gray', children, className }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset', COLORS[color], className)}>
      {children}
    </span>
  );
}

// ---- Preset mappers ----

export const WORK_ORDER_STATUS = {
  RECEIVED:         { label: 'Recibido',           color: 'gray'   },
  DIAGNOSIS:        { label: 'Diagnóstico',         color: 'blue'   },
  AWAITING_AUTH:    { label: 'Esp. autorización',   color: 'yellow' },
  IN_REPAIR:        { label: 'En reparación',       color: 'orange' },
  FINAL_TESTING:    { label: 'Pruebas finales',     color: 'purple' },
  READY_FOR_PICKUP: { label: 'Listo para entrega',  color: 'green'  },
  DELIVERED:        { label: 'Entregado',           color: 'teal'   },
  CANCELLED:        { label: 'Cancelado',           color: 'red'    },
};

export const APPOINTMENT_STATUS = {
  PENDING:    { label: 'Pendiente',   color: 'yellow' },
  CONFIRMED:  { label: 'Confirmada',  color: 'blue'   },
  IN_PROGRESS:{ label: 'En curso',    color: 'orange' },
  COMPLETED:  { label: 'Completada',  color: 'green'  },
  CANCELLED:  { label: 'Cancelada',   color: 'red'    },
  NO_SHOW:    { label: 'No se presentó', color: 'gray' },
};

export const QUOTE_STATUS = {
  DRAFT:    { label: 'Borrador',  color: 'gray'   },
  SENT:     { label: 'Enviada',   color: 'blue'   },
  APPROVED: { label: 'Aprobada', color: 'green'  },
  REJECTED: { label: 'Rechazada',color: 'red'    },
  EXPIRED:  { label: 'Expirada', color: 'yellow' },
};

export const PAYMENT_STATUS = {
  PENDING:  { label: 'Pendiente', color: 'yellow' },
  PARTIAL:  { label: 'Parcial',   color: 'orange' },
  PAID:     { label: 'Pagado',    color: 'green'  },
  REFUNDED: { label: 'Reembolsado', color: 'gray' },
};

export function WorkOrderBadge({ status }) {
  const s = WORK_ORDER_STATUS[status] || { label: status, color: 'gray' };
  return <Badge color={s.color}>{s.label}</Badge>;
}

export function AppointmentBadge({ status }) {
  const s = APPOINTMENT_STATUS[status] || { label: status, color: 'gray' };
  return <Badge color={s.color}>{s.label}</Badge>;
}

export function QuoteBadge({ status }) {
  const s = QUOTE_STATUS[status] || { label: status, color: 'gray' };
  return <Badge color={s.color}>{s.label}</Badge>;
}

export function PaymentBadge({ status }) {
  const s = PAYMENT_STATUS[status] || { label: status, color: 'gray' };
  return <Badge color={s.color}>{s.label}</Badge>;
}
