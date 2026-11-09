// Roles del taller.
//  ADMIN       → todo (usuarios, reportes, borrado)
//  SUPERVISOR  → opera: clientes, órdenes, cotizaciones, citas, recordatorios, corte, fotos
//  TECHNICIAN  → solo sus órdenes asignadas: estatus, notas y fotos
const ADMIN = 'WORKSHOP_ADMIN';
const SUPERVISOR = 'SUPERVISOR';
const TECHNICIAN = 'TECHNICIAN';

const STAFF = [ADMIN, SUPERVISOR];
const ALL = [ADMIN, SUPERVISOR, TECHNICIAN];

module.exports = { ADMIN, SUPERVISOR, TECHNICIAN, STAFF, ALL };
