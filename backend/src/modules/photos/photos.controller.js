const prisma = require('../../config/database');
const { ok, created, notFound, error } = require('../../utils/response');
const { cloudinary, uploadToCloudinary } = require('./photos.upload');
const { cloudinary: cloudCfg } = require('../../config');

const cloudinaryReady = () =>
  cloudCfg.cloudName && cloudCfg.cloudName !== 'DEV_SKIP' &&
  cloudCfg.apiKey && cloudCfg.apiSecret;

const list = async (req, res, next) => {
  try {
    const photos = await prisma.photo.findMany({
      where: { workOrderId: req.params.orderId, workshopId: req.params.workshopId },
      orderBy: { takenAt: 'desc' },
    });
    ok(res, photos);
  } catch (e) { next(e); }
};

const upload = async (req, res, next) => {
  try {
    if (!cloudinaryReady()) {
      return error(res, 'La carga de fotos no está configurada. Falta conectar Cloudinary en el servidor.', 503);
    }
    if (!req.files?.length) return ok(res, []);

    const uploads = await Promise.all(
      req.files.map((file) => uploadToCloudinary(file.buffer))
    );

    const photos = await prisma.$transaction(
      uploads.map((result) =>
        prisma.photo.create({
          data: {
            workshopId: req.params.workshopId,
            workOrderId: req.params.orderId,
            url: result.secure_url,
            thumbnailUrl: result.secure_url.replace('/upload/', '/upload/w_300,h_300,c_fill/'),
            caption: req.body.caption || null,
            phase: req.body.phase || null,
            uploadedById: req.user.id,
          },
        })
      )
    );

    created(res, photos);
  } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try {
    const photo = await prisma.photo.findFirst({
      where: { id: req.params.photoId, workshopId: req.params.workshopId },
    });
    if (!photo) return notFound(res);

    const publicId = photo.url
      .split('/')
      .slice(-2)
      .join('/')
      .split('.')[0];
    await cloudinary.uploader.destroy(publicId).catch(() => {});
    await prisma.photo.delete({ where: { id: photo.id } });

    ok(res, { message: 'Foto eliminada' });
  } catch (e) { next(e); }
};

module.exports = { list, upload, remove };
