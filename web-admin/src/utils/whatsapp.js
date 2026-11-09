// wa.me exige el número en formato internacional sin "+"; 10 dígitos → lada de México (52)
export const waNumber = (phone) => {
  const d = String(phone || '').replace(/\D/g, '');
  return d.length === 10 ? `52${d}` : d;
};

export const waLink = (phone, text) => {
  const n = waNumber(phone);
  return n.length >= 10 ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
};
