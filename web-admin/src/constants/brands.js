// Marcas comunes (México). El slug = minúsculas con guiones, igual que el CDN de logos.
export const CAR_BRANDS = [
  'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler', 'Dodge',
  'Fiat', 'Ford', 'GMC', 'Honda', 'Hyundai', 'Jeep', 'Kia', 'Land Rover', 'Lexus',
  'Mazda', 'Mercedes-Benz', 'MINI', 'Mitsubishi', 'Nissan', 'Peugeot', 'RAM',
  'Renault', 'SEAT', 'Subaru', 'Suzuki', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo',
];

export const brandSlug = (make) => (make || '').toLowerCase().trim().replace(/\s+/g, '-');

// Logos por CDN público (car-logos-dataset). Si no existe, el componente cae al ícono.
export const brandLogoUrl = (make) =>
  make ? `https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset/logos/thumb/${brandSlug(make)}.png` : null;
