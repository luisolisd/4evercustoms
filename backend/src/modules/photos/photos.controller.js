const prisma = require('../../config/database');
const { ok, created, notFound, error } = require('../../utils/response');
const { optimizeImage, uploadToCloudinary, destroyCloudPhotos } = require('./photos.upload');
const { cloudinary: cloudCfg } = require('../../config');
const { parsePagination } = require('../../utils/pagination');
const { ensureTemplates, addSlotsToOrder } = require('../../utils/photoSlots');
const { TECHNICIAN } = require('../../utils/roles');
const { z, ensure, httpError } = require('../../utils/guards');
const { autoAdvanceSafe } = require('../../utils/orderFlow');

const cloudinaryReady = () =>
  cloudCfg.cloudName && cloudCfg.cloudName !== 'DEV_SKIP' &&
  cloudCfg.apiKey && cloudCfg.apiSecret;

const PHASES = ['RECEPTION', 'DELIVERY'];

// ¿El servidor puede guardar fotos? (Cloudinary configurado). La app lo consulta para avisar antes de fallar.
const storageStatus = (req, res) => ok(res, { ready: !!cloudinaryReady() });

// La orden debe ser del taller; un técnico solo accede a las que tiene asignadas
const accessibleOrder = async (req) => {
  const order = await prisma.workOrder.findFirst({
    where: {
      id: req.params.orderId,
      workshopId: req.params.workshopId,
      ...(req.workshopUser.role === TECHNICIAN && { technicians: { some: { userId: req.user.id } } }),
    },
    select: { id: true, receptionSignedAt: true },
  });
  if (!order) throw httpError('Orden no encontrada', 404);
  return order;
};

// ── Fotos de una orden ───────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    await accessibleOrder(req);
    const photos = await prisma.photo.findMany({
      where: { workOrderId: req.params.orderId, workshopId: req.params.workshopId },
      orderBy: { takenAt: 'desc' },
    });
    ok(res, photos);
  } catch (e) { next(e); }
};

const LOCKED_MSG = 'La recepción ya fue firmada por el cliente: las fotos de recepción no se pueden modificar. Un administrador puede anular la firma.';

const upload = async (req, res, next) => {
  try {
    const order = await accessibleOrder(req);
    if (!cloudinaryReady()) {
      return error(res, 'La carga de fotos no está configurada. Falta conectar Cloudinary en el servidor.', 503);
    }
    if (!req.files?.length) return ok(res, []);

    const phase = PHASES.includes(req.body.phase) ? req.body.phase : null;
    const caption = req.body.caption ? String(req.body.caption).slice(0, 200) : null;
    // Etiqueta de daño u observación de recepción (Golpe, Rayón, Estrellado, Faltante, Pintura, otro...)
    const tag = req.body.tag ? String(req.body.tag).trim().slice(0, 40) : null;

    // Si la foto cumple un requerimiento (slot), debe pertenecer a esta orden
    let slotId = null;
    if (req.body.slotId) {
      const slot = await prisma.orderPhotoSlot.findFirst({
        where: { id: String(req.body.slotId), workOrderId: req.params.orderId },
        select: { id: true, kind: true },
      });
      if (!slot) return error(res, 'El requerimiento de foto no existe en esta orden', 400);
      slotId = slot.id;
      if (order.receptionSignedAt && slot.kind === 'RECEPTION') return error(res, LOCKED_MSG, 409);
    }
    if (order.receptionSignedAt && phase === 'RECEPTION') return error(res, LOCKED_MSG, 409);

    const uploads = await Promise.all(
      req.files.map(async (file) => {
        const optimized = await optimizeImage(file.buffer);
        const result = await uploadToCloudinary(optimized);
        return { result, bytes: optimized.length };
      })
    );

    const photos = await prisma.$transaction(
      uploads.map(({ result, bytes }) =>
        prisma.photo.create({
          data: {
            workshopId: req.params.workshopId,
            workOrderId: req.params.orderId,
            url: result.secure_url,
            thumbnailUrl: result.secure_url.replace('/upload/', '/upload/w_300,h_300,c_fill/'),
            publicId: result.public_id,
            bytes,
            caption,
            tag,
            phase,
            slotId,
            uploadedById: req.user.id,
          },
        })
      )
    );

    await autoAdvanceSafe(req.params.orderId); // la primera foto del técnico / checklist completo avanzan el estatus
    created(res, photos);
  } catch (e) { next(e); }
};

// ── Borrado individual y por lote (supervisor / admin) ───────────────────────

const remove = async (req, res, next) => {
  try {
    const photo = await prisma.photo.findFirst({
      where: { id: req.params.photoId, workshopId: req.params.workshopId },
      include: { workOrder: { select: { receptionSignedAt: true } }, slot: { select: { kind: true } } },
    });
    if (!photo) return notFound(res);
    if (photo.workOrder?.receptionSignedAt && (photo.phase === 'RECEPTION' || photo.slot?.kind === 'RECEPTION')) return error(res, LOCKED_MSG, 409);

    await destroyCloudPhotos([photo]);
    await prisma.photo.delete({ where: { id: photo.id } });

    ok(res, { message: 'Foto eliminada' });
  } catch (e) { next(e); }
};

const bulkRemove = async (req, res, next) => {
  try {
    const { ids } = z.object({ ids: z.array(z.string().min(1)).min(1).max(200) }).parse(req.body);
    const found = await prisma.photo.findMany({
      where: { id: { in: ids }, workshopId: req.params.workshopId },
      select: { id: true, url: true, publicId: true, phase: true, workOrder: { select: { receptionSignedAt: true } }, slot: { select: { kind: true } } },
    });
    if (!found.length) return notFound(res, 'No se encontraron fotos');
    // Las fotos de recepción de una orden con recepción firmada se conservan
    const isLocked = (p) => p.workOrder?.receptionSignedAt && (p.phase === 'RECEPTION' || p.slot?.kind === 'RECEPTION');
    const photos = found.filter((p) => !isLocked(p));
    const skipped = found.length - photos.length;
    if (!photos.length) return error(res, LOCKED_MSG, 409);

    await destroyCloudPhotos(photos);
    const del = await prisma.photo.deleteMany({ where: { id: { in: photos.map((p) => p.id) } } });
    ok(res, { deleted: del.count, skipped });
  } catch (e) { next(e); }
};

// Galería de todo lo almacenado, con tamaño, para administrar el espacio
const gallery = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const { orderId, from, to, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const parse = (v) => {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) throw httpError('Fecha inválida', 400);
      return d;
    };
    const where = {
      workshopId,
      ...(orderId && { workOrderId: orderId }),
      ...((from || to) && {
        createdAt: { ...(from && { gte: parse(from) }), ...(to && { lte: parse(to) }) },
      }),
      ...(search && {
        workOrder: {
          OR: [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            { customer: { OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ] } },
          ],
        },
      }),
    };

    const [data, total, agg] = await Promise.all([
      prisma.photo.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          workOrder: { select: { id: true, orderNumber: true, customer: { select: { firstName: true, lastName: true } } } },
          slot: { select: { label: true } },
        },
      }),
      prisma.photo.count({ where }),
      prisma.photo.aggregate({ where, _sum: { bytes: true } }),
    ]);

    res.json({
      success: true,
      data,
      totalBytes: Number(agg._sum.bytes || 0),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (e) { next(e); }
};

// ── Fotos requeridas por orden ───────────────────────────────────────────────

const addSlots = async (req, res, next) => {
  try {
    const { orderId, workshopId } = req.params;
    await ensure.workOrder(orderId, workshopId);
    const body = z
      .object({ templateIds: z.array(z.string()).default([]), custom: z.array(z.string()).default([]) })
      .parse(req.body);
    const added = await addSlotsToOrder(workshopId, orderId, body);
    await autoAdvanceSafe(orderId);
    created(res, { added });
  } catch (e) { next(e); }
};

const removeSlot = async (req, res, next) => {
  try {
    const slot = await prisma.orderPhotoSlot.findFirst({
      // Las fotos de recepción son obligatorias y no se pueden quitar; solo las pedidas al técnico
      where: { id: req.params.slotId, kind: 'TECH', workOrder: { workshopId: req.params.workshopId } },
      select: { id: true, workOrderId: true },
    });
    if (!slot) return notFound(res);
    await prisma.orderPhotoSlot.delete({ where: { id: slot.id } });
    await autoAdvanceSafe(slot.workOrderId); // las fotos quedan en la orden (slotId → null)
    ok(res, { message: 'Requerimiento eliminado' });
  } catch (e) { next(e); }
};

// ── Catálogo de fotos del taller ─────────────────────────────────────────────

const listTemplates = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    await ensureTemplates(workshopId);
    const data = await prisma.photoTemplate.findMany({
      where: { workshopId, ...(req.query.all !== 'true' && { isActive: true }) },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    ok(res, data);
  } catch (e) { next(e); }
};

const labelSchema = z.string().trim().min(1, 'Requerido').max(80);

const createTemplate = async (req, res, next) => {
  try {
    const { workshopId } = req.params;
    const label = labelSchema.parse(req.body.label);
    const last = await prisma.photoTemplate.aggregate({ where: { workshopId }, _max: { sortOrder: true } });
    const tpl = await prisma.photoTemplate.upsert({
      where: { workshopId_label: { workshopId, label } },
      update: { isActive: true },
      create: { workshopId, label, sortOrder: (last._max.sortOrder ?? 0) + 1 },
    });
    created(res, tpl);
  } catch (e) { next(e); }
};

const updateTemplate = async (req, res, next) => {
  try {
    const data = z
      .object({ label: labelSchema.optional(), isActive: z.boolean().optional() })
      .parse(req.body);
    const r = await prisma.photoTemplate.updateMany({
      where: { id: req.params.templateId, workshopId: req.params.workshopId },
      data,
    });
    if (r.count === 0) return notFound(res);
    ok(res, { message: 'Actualizado' });
  } catch (e) { next(e); }
};

const removeTemplate = async (req, res, next) => {
  try {
    await prisma.photoTemplate.deleteMany({ where: { id: req.params.templateId, workshopId: req.params.workshopId } });
    ok(res, { message: 'Eliminado del catálogo' });
  } catch (e) { next(e); }
};

module.exports = {
  storageStatus, list, upload, remove, bulkRemove, gallery,
  addSlots, removeSlot,
  listTemplates, createTemplate, updateTemplate, removeTemplate,
};
