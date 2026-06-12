import { useState, useEffect } from 'react';
import { Car } from 'lucide-react';
import { brandLogoUrl } from '../../constants/brands';

// Muestra el emblema de la marca (CDN). Si no existe o falla, cae al ícono de auto.
export default function BrandLogo({ make, size = 20, className = 'text-gray-500' }) {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [make]);

  const url = brandLogoUrl(make);
  if (!url || err) return <Car size={size} className={className} />;

  return (
    <img
      src={url}
      alt={make || ''}
      onError={() => setErr(true)}
      className="object-contain"
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}
