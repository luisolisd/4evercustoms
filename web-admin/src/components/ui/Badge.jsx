import clsx from 'clsx';

const COLORS = {
  gray:   'bg-gray-100 text-gray-700',
  blue:   'bg-blue-100 text-blue-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  orange: 'bg-orange-100 text-orange-700',
  green:  'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  red:    'bg-red-100 text-red-700',
  teal:   'bg-teal-100 text-teal-700',
  brand:  'bg-brand-100 text-brand-700',
};

export default function Badge({ color = 'gray', children, className }) {
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', COLORS[color], className)}>
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
