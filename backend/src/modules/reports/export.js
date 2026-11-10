const ExcelJS = require('exceljs');
const prisma = require('../../config/database');
const { z } = require('../../utils/guards');

// ── Formato (mismo estilo del registro de clientes del taller) ───────────────
const FONT = 'Arial';
const C = {
  title: 'FF1F4E78', head: 'FF2E75B6', border: 'FFBFBFBF', zebra: 'FFF7F9FC', gray: 'FF595959',
  red: 'FFF8CBAD', yellow: 'FFFFE699', green: 'FFC6E0B4', softGreen: 'FFE2EFDA', softYellow: 'FFFFF2CC',
};
const thin = { style: 'thin', color: { argb: C.border } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const DATE = 'dd/mm/yyyy';
const MONEY = '"$"#,##0.00';

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inicial inválida'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha final inválida'),
});

const fDate = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
const day = (d) => (d ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) : null);

// Encabezado de hoja: título, subtítulo y fila de columnas (con filtro y panel fijo)
function sheetBase(wb, name, title, subtitle, columns, tab) {
  const ws = wb.addWorksheet(name, {
    views: [{ showGridLines: false, state: 'frozen', ySplit: 3, zoomScale: 90 }],
    properties: { tabColor: { argb: tab } },
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
  });
  ws.columns = columns.map((c) => ({ width: c.w }));
  const last = columns.length;
  ws.mergeCells(1, 1, 1, last);
  ws.mergeCells(2, 1, 2, last);
  const t = ws.getCell(1, 1);
  t.value = title;
  t.font = { name: FONT, size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  t.fill = fill(C.title);
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;
  const s = ws.getCell(2, 1);
  s.value = subtitle;
  s.font = { name: FONT, size: 9, italic: true, color: { argb: C.gray } };
  s.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(2).height = 18;
  const h = ws.getRow(3);
  columns.forEach((c, i) => {
    const cell = h.getCell(i + 1);
    cell.value = c.h;
    cell.font = { name: FONT, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = fill(C.head);
    cell.border = BORDER;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  h.height = 34;
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: last } };
  ws.pageSetup.printTitlesRow = '1:3';
  return ws;
}

// Escribe una fila de datos con el estilo base (borde fino, cebra suave, formato por columna)
function putRow(ws, rowNum, values, columns) {
  const row = ws.getRow(rowNum);
  columns.forEach((c, i) => {
    const cell = row.getCell(i + 1);
    const v = values[i];
    cell.value = v === undefined || v === '' ? null : v;
    cell.font = { name: FONT, size: 10.5 };
    cell.border = BORDER;
    cell.alignment = { horizontal: c.align || 'left', vertical: 'middle', wrapText: true };
    if (c.fmt) cell.numFmt = c.fmt;
    if (rowNum % 2 === 0) cell.fill = fill(C.zebra);
  });
  return row;
}

const statusOf = (next, today) => {
  if (!next) return '';
  const days = Math.round((next - today) / 86400000);
  return days < 0 ? 'VENCIDO' : days <= 7 ? 'PROXIMO' : 'PROGRAMADO';
};

async function loadData(workshopId, from, to) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T23:59:59.999Z`);
  const history = await prisma.serviceHistory.findMany({
    where: { workshopId, serviceDate: { gte: start, lte: end } },
    orderBy: [{ serviceDate: 'asc' }, { createdAt: 'asc' }],
    include: {
      vehicle: { include: { customer: true } },
      workOrder: {
        select: {
          orderNumber: true, totalAmount: true, technicianNotes: true, recommendations: true,
          workOrderParts: { select: { quantity: true, description: true, part: { select: { name: true } } } },
          technicians: { select: { user: { select: { firstName: true, lastName: true } } } },
        },
      },
    },
  });

  const vehicleIds = [...new Set(history.map((h) => h.vehicleId))];
  const [reminders, lastServices] = vehicleIds.length
    ? await Promise.all([
      prisma.serviceReminder.findMany({
        where: { workshopId, type: 'SERVICE', vehicleId: { in: vehicleIds }, status: { in: ['PENDING', 'CONTACTED', 'CONFIRMED'] } },
        orderBy: { dueDate: 'asc' },
        select: { vehicleId: true, workOrderId: true, dueDate: true, serviceType: true, nextMileage: true },
      }),
      prisma.serviceHistory.findMany({
        where: { workshopId, vehicleId: { in: vehicleIds }, serviceDate: { lte: end } },
        orderBy: { serviceDate: 'desc' },
        select: { vehicleId: true, serviceDate: true },
      }),
    ])
    : [[], []];
  return { history, reminders, lastServices };
}

async function exportExcel(req, res, next) {
  try {
    const { workshopId } = req.params;
    const { from, to } = querySchema.parse(req.query);
    if (from > to) return res.status(400).json({ success: false, message: 'La fecha inicial debe ser anterior a la final' });
    if ((new Date(to) - new Date(from)) / 86400000 > 366) return res.status(400).json({ success: false, message: 'El rango máximo es de un año' });

    const workshop = await prisma.workshop.findUnique({ where: { id: workshopId }, select: { name: true } });
    const { history, reminders, lastServices } = await loadData(workshopId, from, to);

    // Un renglón por vehículo atendido en el periodo
    const byVehicle = new Map();
    for (const h of history) {
      if (!byVehicle.has(h.vehicleId)) byVehicle.set(h.vehicleId, { vehicle: h.vehicle, services: [] });
      byVehicle.get(h.vehicleId).services.push(h);
    }
    const vehicles = [...byVehicle.values()].sort((a, b) => {
      const an = `${a.vehicle.customer.firstName} ${a.vehicle.customer.lastName}`.toLowerCase();
      const bn = `${b.vehicle.customer.firstName} ${b.vehicle.customer.lastName}`.toLowerCase();
      return an.localeCompare(bn, 'es');
    });
    const rowId = new Map(vehicles.map((v, i) => [v.vehicle.id, i + 1]));
    const lastBy = new Map();
    for (const l of lastServices) if (!lastBy.has(l.vehicleId)) lastBy.set(l.vehicleId, l.serviceDate);
    const nextBy = new Map();
    for (const r of reminders) if (!nextBy.has(r.vehicleId)) nextBy.set(r.vehicleId, r);

    const now = new Date();
    // "Hoy" según la hora del taller (México), para que los días restantes coincidan con lo que ve el usuario
    const today = new Date(`${now.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })}T00:00:00.000Z`);
    const period = from === to ? fDate(from) : `${fDate(from)} al ${fDate(to)}`;
    const stamp = now.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'medium', timeStyle: 'short' });
    const subtitle = `${workshop?.name || 'Taller'} · Periodo: ${period} · Generado: ${stamp}`;

    const wb = new ExcelJS.Workbook();
    wb.creator = workshop?.name || 'Taller';
    wb.created = now;
    wb.calcProperties = { fullCalcOnLoad: true }; // las fórmulas (días restantes, estatus) se recalculan al abrir

    // ── 1. Clientes y Vehículos ──
    const colsV = [
      { h: 'ID', w: 6, align: 'center' }, { h: 'Nombre del Cliente', w: 28 }, { h: 'Teléfono', w: 16, align: 'center' },
      { h: 'Email', w: 26 }, { h: 'Dirección', w: 28 }, { h: 'Marca', w: 14, align: 'center' }, { h: 'Modelo', w: 14, align: 'center' },
      { h: 'Año', w: 8, align: 'center' }, { h: 'VIN', w: 22, align: 'center' }, { h: 'Color', w: 11, align: 'center' },
      { h: 'Kilometraje Actual', w: 13, align: 'center', fmt: '#,##0' }, { h: 'Último Servicio', w: 13, align: 'center', fmt: DATE },
      { h: 'Próximo Servicio', w: 13, align: 'center', fmt: DATE }, { h: 'Días Restantes', w: 11, align: 'center', fmt: '0' },
      { h: 'Estatus', w: 14, align: 'center' }, { h: 'Servicio Recomendado', w: 30 }, { h: 'Notas', w: 36 },
      { h: 'Fecha Llamada Calidad', w: 14, align: 'center', fmt: DATE }, { h: 'Resultado Llamada', w: 18, align: 'center' }, { h: 'Comentarios Llamada', w: 30 },
    ];
    const w1 = sheetBase(wb, 'Clientes y Vehiculos', 'REGISTRO DE CLIENTES Y VEHÍCULOS', subtitle, colsV, C.head);
    vehicles.forEach(({ vehicle: v, services }, i) => {
      const r = 4 + i;
      const c = v.customer;
      const lastSvc = day(lastBy.get(v.id) || services[services.length - 1].serviceDate);
      const nxt = nextBy.get(v.id);
      const next = nxt ? day(nxt.dueDate) : null;
      const lastWithKm = [...services].reverse().find((s) => s.mileage != null);
      const lastNote = [...services].reverse().map((s) => s.workOrder?.technicianNotes).find(Boolean) || '';
      const days = next ? Math.round((next - today) / 86400000) : null;
      const row = putRow(w1, r, [
        i + 1, `${c.firstName} ${c.lastName}`.trim(), c.phone, c.email, c.address, v.make, v.model, v.year, v.vin, v.color,
        lastWithKm?.mileage ?? v.mileage ?? null, lastSvc, next, null, null,
        nxt?.serviceType || services[services.length - 1].workOrder?.recommendations || '', lastNote, null, null, null,
      ], colsV);
      // Días restantes y estatus: fórmulas vivas (se recalculan al abrir el archivo)
      row.getCell(14).value = { formula: `IF(M${r}="","",M${r}-TODAY())`, result: days ?? '' };
      row.getCell(15).value = { formula: `IF(M${r}="","",IF(M${r}-TODAY()<0,"VENCIDO",IF(M${r}-TODAY()<=7,"PROXIMO","PROGRAMADO")))`, result: statusOf(next, today) };
      row.getCell(15).font = { name: FONT, size: 10.5, bold: true };
    });
    const lastV = Math.max(4, 3 + vehicles.length);
    w1.addConditionalFormatting({
      ref: `A4:T${lastV}`,
      rules: [
        { type: 'expression', formulae: ['$O4="VENCIDO"'], priority: 1, style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: C.red } } } },
        { type: 'expression', formulae: ['$O4="PROXIMO"'], priority: 2, style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: C.yellow } } } },
        { type: 'expression', formulae: ['$O4="PROGRAMADO"'], priority: 3, style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: C.softGreen } } } },
      ],
    });
    for (let r = 4; r <= lastV; r++) {
      w1.getCell(`S${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Satisfecho,Con observaciones,Insatisfecho,No contesto"'], showErrorMessage: true, error: 'Elige una opción de la lista' };
    }

    // ── 2. Historial de Servicios ──
    const colsH = [
      { h: 'ID Cliente', w: 10, align: 'center' }, { h: 'Nombre del Cliente', w: 26 }, { h: 'Placas', w: 12, align: 'center' },
      { h: 'Fecha de Servicio', w: 14, align: 'center', fmt: DATE }, { h: 'Kilometraje', w: 12, align: 'center', fmt: '#,##0' },
      { h: 'Servicio Realizado', w: 32 }, { h: 'Refacciones / Trabajo', w: 42 }, { h: 'Costo', w: 13, align: 'right', fmt: MONEY },
      { h: 'Próximo Servicio Recomendado', w: 18, align: 'center', fmt: DATE }, { h: 'Técnico', w: 22 }, { h: 'Notas', w: 36 },
    ];
    const w2 = sheetBase(wb, 'Historial de Servicios', 'HISTORIAL DE SERVICIOS POR VEHÍCULO', subtitle, colsH, 'FF548235');
    let totalCost = 0;
    history.forEach((h, i) => {
      const o = h.workOrder || {};
      const c = h.vehicle.customer;
      const items = (o.workOrderParts || []).map((p) => `${p.part?.name || p.description || 'Concepto'}${Number(p.quantity) !== 1 ? ` x${Number(p.quantity)}` : ''}`).join(', ');
      const techs = (o.technicians || []).map((t) => `${t.user.firstName} ${t.user.lastName}`.trim()).join(', ');
      const nxt = reminders.find((r) => r.workOrderId && h.workOrderId === r.workOrderId && r.vehicleId === h.vehicleId);
      const cost = Number(o.totalAmount || 0);
      totalCost += cost;
      putRow(w2, 4 + i, [
        rowId.get(h.vehicleId), `${c.firstName} ${c.lastName}`.trim(), h.vehicle.licensePlate, day(h.serviceDate), h.mileage,
        h.description, items, cost, nxt ? day(nxt.dueDate) : null, techs, o.technicianNotes || o.recommendations || '',
      ], colsH);
    });
    const lastH = Math.max(4, 3 + history.length);
    const totRow = lastH + 1;
    w2.getCell(`G${totRow}`).value = 'TOTAL DEL PERIODO';
    w2.getCell(`H${totRow}`).value = { formula: `SUM(H4:H${lastH})`, result: totalCost };
    for (const a of [`G${totRow}`, `H${totRow}`]) {
      const cell = w2.getCell(a);
      cell.font = { name: FONT, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = fill(C.title);
      cell.border = BORDER;
      cell.alignment = { horizontal: a.startsWith('G') ? 'right' : 'right', vertical: 'middle' };
    }
    w2.getCell(`H${totRow}`).numFmt = MONEY;

    // ── 3. Resumen ──
    const counts = { VENCIDO: 0, PROXIMO: 0, PROGRAMADO: 0, SIN: 0 };
    for (const { vehicle: v } of vehicles) {
      const n = nextBy.get(v.id);
      const st = n ? statusOf(day(n.dueDate), today) : '';
      counts[st || 'SIN'] += 1;
    }
    const w3 = wb.addWorksheet('Resumen', { views: [{ showGridLines: false, zoomScale: 90 }], properties: { tabColor: { argb: 'FFC55A11' } },
      pageSetup: { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    w3.columns = [{ width: 44 }, { width: 18 }, { width: 4 }, { width: 40 }, { width: 18 }];
    w3.mergeCells('A1:E1');
    w3.mergeCells('A2:E2');
    Object.assign(w3.getCell('A1'), { value: 'RESUMEN Y RECORDATORIOS' });
    w3.getCell('A1').font = { name: FONT, size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    w3.getCell('A1').fill = fill(C.title);
    w3.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    w3.getRow(1).height = 30;
    w3.getCell('A2').value = subtitle;
    w3.getCell('A2').font = { name: FONT, size: 9, italic: true, color: { argb: C.gray } };
    w3.getCell('A2').alignment = { indent: 1 };

    const head = (cell, text) => {
      const x = w3.getCell(cell);
      x.value = text; x.font = { name: FONT, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      x.fill = fill(C.head); x.border = BORDER; x.alignment = { horizontal: 'center', vertical: 'middle' };
    };
    const line = (rowN, label, formula, result, bg, fmt) => {
      const a = w3.getCell(`A${rowN}`); const b = w3.getCell(`B${rowN}`);
      a.value = label; b.value = { formula, result };
      a.font = { name: FONT, size: 11 }; b.font = { name: FONT, size: 11, bold: true };
      a.border = BORDER; b.border = BORDER;
      a.alignment = { vertical: 'middle', wrapText: true }; b.alignment = { horizontal: 'center', vertical: 'middle' };
      if (bg) { a.fill = fill(bg); b.fill = fill(bg); }
      if (fmt) b.numFmt = fmt;
    };
    head('A4', 'Indicador'); head('B4', 'Total');
    const rngO = `'Clientes y Vehiculos'!$O$4:$O$${lastV}`;
    line(5, 'Vehículos atendidos en el periodo', `COUNTA('Clientes y Vehiculos'!$B$4:$B$${lastV})`, vehicles.length);
    line(6, 'Servicios realizados', `COUNTA('Historial de Servicios'!$F$4:$F$${lastH})`, history.length);
    line(7, 'Ingresos del periodo', `'Historial de Servicios'!H${totRow}`, totalCost, null, MONEY);
    line(8, 'VENCIDOS (llamar de inmediato)', `COUNTIF(${rngO},"VENCIDO")`, counts.VENCIDO, C.red);
    line(9, 'PRÓXIMOS a vencer (7 días o menos)', `COUNTIF(${rngO},"PROXIMO")`, counts.PROXIMO, C.yellow);
    line(10, 'PROGRAMADOS (más de 7 días)', `COUNTIF(${rngO},"PROGRAMADO")`, counts.PROGRAMADO, C.green);
    line(11, 'SIN FECHA de próximo servicio', `COUNTBLANK('Clientes y Vehiculos'!$M$4:$M$${lastV})`, counts.SIN);

    // Servicios por técnico (periodo)
    head('D4', 'Servicios por técnico'); head('E4', 'Servicios');
    const byTech = new Map();
    for (const h of history) {
      const names = (h.workOrder?.technicians || []).map((t) => `${t.user.firstName} ${t.user.lastName}`.trim());
      for (const n of names.length ? names : ['Sin técnico asignado']) byTech.set(n, (byTech.get(n) || 0) + 1);
    }
    [...byTech.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([n, q], i) => {
      const a = w3.getCell(`D${5 + i}`); const b = w3.getCell(`E${5 + i}`);
      a.value = n; b.value = q;
      a.font = { name: FONT, size: 11 }; b.font = { name: FONT, size: 11, bold: true };
      a.border = BORDER; b.border = BORDER; b.alignment = { horizontal: 'center' };
    });

    // Recordatorios: vencidos y próximos (lista corta para actuar)
    let rr = 14;
    const remList = (title, bg, filterSt) => {
      w3.mergeCells(`A${rr}:E${rr}`);
      const t = w3.getCell(`A${rr}`);
      t.value = title; t.font = { name: FONT, size: 12, bold: true, color: { argb: 'FFFFFFFF' } }; t.fill = fill(C.head);
      t.alignment = { vertical: 'middle', indent: 1 };
      rr += 1;
      ['Cliente', 'Vehículo', '', 'Servicio recomendado', 'Fecha'].forEach((x, i) => {
        const c = w3.getCell(rr, i + 1); c.value = x || null;
        c.font = { name: FONT, size: 10, bold: true }; c.fill = fill('FFD9E2F3'); c.border = BORDER;
        c.alignment = { horizontal: 'center' };
      });
      rr += 1;
      let n = 0;
      for (const { vehicle: v } of vehicles) {
        const nx = nextBy.get(v.id);
        if (!nx || statusOf(day(nx.dueDate), today) !== filterSt) continue;
        w3.getCell(rr, 1).value = `${v.customer.firstName} ${v.customer.lastName}`.trim() + (v.customer.phone ? ` · ${v.customer.phone}` : '');
        w3.getCell(rr, 2).value = `${v.make} ${v.model} ${v.year}`;
        w3.mergeCells(rr, 2, rr, 3);
        w3.getCell(rr, 4).value = nx.serviceType;
        w3.getCell(rr, 5).value = day(nx.dueDate); w3.getCell(rr, 5).numFmt = DATE;
        for (let c = 1; c <= 5; c++) { const x = w3.getCell(rr, c); x.font = { name: FONT, size: 10 }; x.border = BORDER; x.fill = fill(bg); }
        w3.getCell(rr, 5).alignment = { horizontal: 'center' };
        rr += 1; n += 1;
      }
      if (!n) { w3.mergeCells(`A${rr}:E${rr}`); w3.getCell(`A${rr}`).value = 'Sin registros en el periodo'; w3.getCell(`A${rr}`).font = { name: FONT, size: 10, italic: true, color: { argb: C.gray } }; rr += 1; }
      rr += 1;
    };
    remList('VENCIDOS — llamar de inmediato', C.red, 'VENCIDO');
    remList('PRÓXIMOS A VENCER — 7 días o menos', C.softYellow, 'PROXIMO');

    // ── 4. Llamadas de Calidad ──
    const colsQ = [
      { h: 'Cliente', w: 28 }, { h: 'Teléfono', w: 16, align: 'center' }, { h: 'Vehículo', w: 26 },
      { h: 'Fecha de Servicio', w: 14, align: 'center', fmt: DATE }, { h: 'Días desde Servicio', w: 12, align: 'center', fmt: '0' },
      { h: 'Trabajo Realizado / Notas', w: 44 }, { h: 'Estatus Llamada', w: 16, align: 'center' }, { h: 'Resultado / Comentario', w: 36 },
    ];
    const w4 = sheetBase(wb, 'Llamadas de Calidad', 'LLAMADAS DE CALIDAD — SEGUIMIENTO A TRABAJOS REALIZADOS', subtitle, colsQ, 'FF7030A0');
    history.forEach((h, i) => {
      const r = 4 + i;
      const c = h.vehicle.customer;
      const d = day(h.serviceDate);
      const row = putRow(w4, r, [
        `${c.firstName} ${c.lastName}`.trim(), c.phone, `${h.vehicle.make} ${h.vehicle.model} ${h.vehicle.year}`.trim(), d, null,
        [h.description, h.workOrder?.technicianNotes].filter(Boolean).join(' — '), 'PENDIENTE', null,
      ], colsQ);
      row.getCell(5).value = { formula: `TODAY()-D${r}`, result: Math.round((today - d) / 86400000) };
      w4.getCell(`G${r}`).dataValidation = { type: 'list', allowBlank: false, formulae: ['"PENDIENTE,LLAMADO,REINTENTAR"'], showErrorMessage: true, error: 'Elige una opción de la lista' };
    });
    const lastQ = Math.max(4, 3 + history.length);
    w4.addConditionalFormatting({
      ref: `A4:H${lastQ}`,
      rules: [
        { type: 'expression', formulae: ['$G4="PENDIENTE"'], priority: 1, style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: C.softYellow } } } },
        { type: 'expression', formulae: ['$G4="REINTENTAR"'], priority: 2, style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: C.red } } } },
        { type: 'expression', formulae: ['$G4="LLAMADO"'], priority: 3, style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: C.softGreen } } } },
      ],
    });

    const fileName = `Registro_Clientes_${from}_a_${to}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    await wb.xlsx.write(res);
    res.end();
  } catch (e) { next(e); }
}

module.exports = { exportExcel, loadData };
