import { WORK_ORDER_STATUS } from '../components/ui/Badge';

// Flujo de una orden (sin CANCELLED), en orden
export const WORK_ORDER_FLOW = [
  'RECEIVED', 'DIAGNOSIS', 'AWAITING_AUTH', 'IN_REPAIR', 'FINAL_TESTING', 'READY_FOR_PICKUP', 'DELIVERED',
];

export const WORK_ORDER_FLOW_OPTS = WORK_ORDER_FLOW.map((value) => ({ value, label: WORK_ORDER_STATUS[value].label }));
