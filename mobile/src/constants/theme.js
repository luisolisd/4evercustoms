export const COLORS = {
  primary:    '#ea580c',
  primaryDark:'#c2410c',
  primaryLight:'#fed7aa',
  bg:         '#f9fafb',
  card:       '#ffffff',
  dark:       '#111827',
  gray900:    '#111827',
  gray700:    '#374151',
  gray500:    '#6b7280',
  gray400:    '#9ca3af',
  gray200:    '#e5e7eb',
  gray100:    '#f3f4f6',
  green:      '#22c55e',
  greenLight: '#dcfce7',
  blue:       '#3b82f6',
  blueLight:  '#dbeafe',
  yellow:     '#f59e0b',
  yellowLight:'#fef3c7',
  red:        '#ef4444',
  redLight:   '#fee2e2',
  purple:     '#8b5cf6',
  teal:       '#14b8a6',
};

export const STATUS_COLORS = {
  RECEIVED:         { bg: '#f3f4f6', text: '#374151' },
  DIAGNOSIS:        { bg: '#dbeafe', text: '#1d4ed8' },
  AWAITING_AUTH:    { bg: '#fef3c7', text: '#92400e' },
  IN_REPAIR:        { bg: '#fed7aa', text: '#c2410c' },
  FINAL_TESTING:    { bg: '#ede9fe', text: '#6d28d9' },
  READY_FOR_PICKUP: { bg: '#dcfce7', text: '#15803d' },
  DELIVERED:        { bg: '#ccfbf1', text: '#0f766e' },
  CANCELLED:        { bg: '#fee2e2', text: '#b91c1c' },
};

export const STATUS_LABELS = {
  RECEIVED:         'Recibido',
  DIAGNOSIS:        'En diagnóstico',
  AWAITING_AUTH:    'Esp. autorización',
  IN_REPAIR:        'En reparación',
  FINAL_TESTING:    'Pruebas finales',
  READY_FOR_PICKUP: '¡Listo para entrega!',
  DELIVERED:        'Entregado',
  CANCELLED:        'Cancelado',
};

export const APPOINTMENT_STATUS = {
  PENDING:     { bg: '#fef3c7', text: '#92400e', label: 'Pendiente' },
  CONFIRMED:   { bg: '#dcfce7', text: '#15803d', label: 'Confirmada' },
  IN_PROGRESS: { bg: '#fed7aa', text: '#c2410c', label: 'En curso' },
  COMPLETED:   { bg: '#ccfbf1', text: '#0f766e', label: 'Completada' },
  CANCELLED:   { bg: '#fee2e2', text: '#b91c1c', label: 'Cancelada' },
};
