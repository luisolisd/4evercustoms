const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const sharp = require('sharp');
const { cloudinary: cfg } = require('../../config');

cloudinary.config({
  cloud_name: cfg.cloudName,
  api_key: cfg.apiKey,
  api_secret: cfg.apiSecret,
});

// Store files in memory; optimizamos y subimos a Cloudinary en el controlador
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(Object.assign(new Error('Solo se aceptan imágenes'), { status: 400 }));
  },
});

// Optimiza: corrige orientación EXIF, limita a 1600 px por lado y convierte a WebP (calidad 85).
// Visualmente equivale al original pero suele pesar 5-10 veces menos.
const optimizeImage = (buffer) =>
  sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

const uploadToCloudinary = (buffer, folder = '4evrcustoms/work-orders') =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });

// https://res.cloudinary.com/<cloud>/image/upload/[transformaciones/][v123/]carpeta/archivo.ext → carpeta/archivo
const publicIdFromUrl = (url) => {
  const after = String(url).split('/upload/')[1];
  if (!after) return null;
  const parts = after.split('/');
  while (parts.length > 1 && (/^v\d+$/.test(parts[0]) || parts[0].includes(','))) parts.shift();
  return parts.join('/').replace(/\.[^./]+$/, '');
};

// Borra en Cloudinary (en bloques de 100). Los errores no impiden borrar el registro en BD.
const destroyCloudPhotos = async (photos) => {
  const ids = photos.map((p) => p.publicId || publicIdFromUrl(p.url)).filter(Boolean);
  if (!ids.length || !cfg.cloudName || cfg.cloudName === 'DEV_SKIP' || !cfg.apiKey || !cfg.apiSecret) return;
  for (let i = 0; i < ids.length; i += 100) {
    await cloudinary.api.delete_resources(ids.slice(i, i + 100)).catch(() => {});
  }
};

module.exports = { upload, cloudinary, optimizeImage, uploadToCloudinary, destroyCloudPhotos, publicIdFromUrl };
