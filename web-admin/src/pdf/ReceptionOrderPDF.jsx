import { Document, Page, View, Text, Image, StyleSheet, Svg, Path, Font } from '@react-pdf/renderer';

Font.registerHyphenationCallback((word) => [word]);

const BLUE = '#3d5a80';
const LINE = '#cfd6df';
const GRAY = '#8a94a3';
const INK = '#1f2937';

const s = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 30, paddingHorizontal: 34, fontFamily: 'Helvetica', fontSize: 8, color: INK },
  head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  shop: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#4b5d75', letterSpacing: 0.3 },
  shopSub: { fontSize: 7, color: '#5b6b82', marginTop: 3 },
  folioBox: { width: 190, borderWidth: 0.8, borderColor: LINE, padding: 8, alignItems: 'center' },
  orderTitle: { fontSize: 12.5, fontFamily: 'Helvetica-Bold', color: '#4b5d75' },
  folio: { fontSize: 9, color: '#4b5d75', marginTop: 8, fontFamily: 'Helvetica-Bold' },
  row: { flexDirection: 'row', borderBottomWidth: 0.6, borderBottomColor: LINE, borderBottomStyle: 'dashed' },
  cell: { paddingHorizontal: 4, paddingTop: 2.5, paddingBottom: 3, minHeight: 22 },
  label: { fontSize: 5.8, color: GRAY, letterSpacing: 0.2, textTransform: 'uppercase' },
  value: { fontSize: 8.5, marginTop: 2, color: INK },
  bar: { backgroundColor: BLUE, paddingVertical: 2.5, paddingHorizontal: 5, marginTop: 6 },
  barText: { color: '#fff', fontSize: 8.6, fontFamily: 'Helvetica-Bold' },
  barSub: { fontFamily: 'Helvetica', marginLeft: 4 },
  box: { width: 7, height: 7, borderWidth: 0.7, borderColor: '#475569', marginHorizontal: 2, alignItems: 'center', justifyContent: 'center' },
  boxMark: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BLUE, marginTop: -0.5 },
  svcLine: { borderBottomWidth: 0.6, borderBottomColor: LINE, borderBottomStyle: 'dashed', minHeight: 13, paddingHorizontal: 4, justifyContent: 'center' },
  th: { fontSize: 6.3, color: '#475569', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  invRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: LINE },
  invCell: { paddingHorizontal: 4, justifyContent: 'center', height: 12.4, fontSize: 7.6, borderRightWidth: 0.5, borderRightColor: LINE },
  cond: { fontSize: 7.4, marginTop: 3, lineHeight: 1.35 },
  sigRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  sigNameValue: { fontSize: 7.4, color: '#1f2937', marginTop: 1.5 },
  sig: { alignItems: 'center', borderTopWidth: 0.6, borderTopColor: '#9aa5b4', paddingTop: 3 },
  sigName: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#334155' },
  sigSub: { fontSize: 5.8, color: '#b0b8c4', marginTop: 1.5 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginHorizontal: -4 },
  photoCell: { width: '33.33%', padding: 4 },
  photoImg: { width: '100%', height: 150, objectFit: 'cover', borderWidth: 0.6, borderColor: LINE },
  photoLabel: { fontSize: 7, marginTop: 2.5, color: '#334155' },
  footer: { position: 'absolute', bottom: 14, left: 34, right: 34, flexDirection: 'row', justifyContent: 'space-between', fontSize: 6.5, color: '#9aa5b4' },
});

const Box = ({ on }) => <View style={s.box}>{on ? <Text style={s.boxMark}>X</Text> : null}</View>;

const Cell = ({ label, value, flex = 1, children }) => (
  <View style={[s.cell, { flex }]}>
    <Text style={s.label}>{label}</Text>
    {children || <Text style={s.value}>{value || ' '}</Text>}
  </View>
);

const Bar = ({ title, sub, tick }) => (
  <View style={[s.bar, { flexDirection: 'row', alignItems: 'center' }]}>
    <Text style={s.barText}>{title}</Text>
    {sub ? <Text style={[s.barText, s.barSub]}>{sub}</Text> : null}
    {tick ? <><Tick color="#fff" /><Text style={[s.barText, s.barSub]}> {tick}</Text></> : null}
  </View>
);

const Tick = ({ color = '#475569', size = 7 }) => (
  <Svg width={size} height={size} viewBox="0 0 10 10"><Path d="M1,5.5 L4,8.5 L9.2,1.5" stroke={color} strokeWidth={1.4} fill="none" /></Svg>
);

const FUEL = ['E', '1/4', '1/2', '3/4', 'F'];
const FUEL_TXT = { E: 'E', '1/4': '¼', '1/2': '½', '3/4': '¾', F: 'F' };

// ── Inventario (idéntico al formato impreso) ─────────────────────────────────
const COL_A = ['Llave(s) — cant. ____', 'Tapetes', 'Llanta de refacción', 'Gato / llave de ruedas', 'Herramienta', 'Estéreo / pantalla', 'Antena', 'Tapón de gasolina', ''];
const COL_B = ['Espejos laterales', 'Limpiaparabrisas', 'Tapones / copas de rin', 'Triángulos / extintor', 'Tarjeta de circulación', 'Póliza de seguro', 'Encendedor / cargador', 'Cables pasa-corriente', ''];
const COL_C = ['Check engine', 'ABS', 'Presión de aceite', 'Batería / carga', 'Bolsa de aire', 'Temperatura', 'Frenos', 'Otro: ________', ''];
const W = { a: '29%', m1: '4.3%', b: '28%', m2: '3.7%', c: '31%', m3: '3.9%' };

function Inventory() {
  return (
    <View style={{ borderWidth: 0.5, borderColor: LINE, marginTop: 1 }}>
      <View style={[s.invRow, { backgroundColor: '#f3f5f8', height: 14 }]}>
        <View style={[s.invCell, { width: W.a, height: 14 }]}><Text style={s.th}>Artículo</Text></View>
        <View style={[s.invCell, { width: W.m1, height: 14 }]}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Tick /><Text style={s.th}>/X</Text></View></View>
        <View style={[s.invCell, { width: W.b, height: 14 }]}><Text style={s.th}>Artículo</Text></View>
        <View style={[s.invCell, { width: W.m2, height: 14 }]}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Tick /><Text style={s.th}>/X</Text></View></View>
        <View style={[s.invCell, { width: W.c, height: 14 }]}><Text style={s.th}>Testigos encendidos en tablero</Text></View>
        <View style={[s.invCell, { width: W.m3, height: 14, borderRightWidth: 0 }]}><Tick /></View>
      </View>
      {COL_A.slice(0, 8).map((a, i) => (
        <View key={i} style={s.invRow}>
          <View style={[s.invCell, { width: W.a }]}><Text>{a}</Text></View>
          <View style={[s.invCell, { width: W.m1 }]} />
          <View style={[s.invCell, { width: W.b }]}><Text>{COL_B[i]}</Text></View>
          <View style={[s.invCell, { width: W.m2 }]} />
          <View style={[s.invCell, { width: W.c }]}><Text>{COL_C[i]}</Text></View>
          <View style={[s.invCell, { width: W.m3, borderRightWidth: 0 }]} />
        </View>
      ))}
    </View>
  );
}

// ── Dibujos de carrocería ────────────────────────────────────────────────────
// Espacio de firma: imagen (si ya firmó en digital) sobre la línea, rótulo y nombre debajo
function SigSlot({ title, image, name, signed }) {
  return (
    <View style={{ width: '31%' }}>
      <View style={{ height: 30, justifyContent: 'flex-end', alignItems: 'center' }}>
        {image ? <Image src={image} style={{ height: 29, maxWidth: '100%', objectFit: 'contain' }} /> : null}
      </View>
      <View style={s.sig}>
        <Text style={s.sigName}>{title}</Text>
        <Text style={signed && name ? s.sigNameValue : s.sigSub}>{signed && name ? name : 'Nombre y firma'}</Text>
      </View>
    </View>
  );
}

// Dibujo idéntico al del formato impreso (imagen) + rótulos como texto nítido
const K = 320 / 988;
const LBL = [
  ['LADO IZQUIERDO', 195, 22], ['VISTA SUPERIOR', 540, 76], ['LADO DERECHO', 197, 198],
  ['FRENTE', 870, 22], ['ATRÁS', 870, 196],
];
function BodyImage({ src }) {
  const lab = { position: 'absolute', width: 120, textAlign: 'center', fontSize: 7, color: '#475569' };
  return (
    <View style={{ width: 320, height: 372 * K, alignSelf: 'center', marginTop: 3 }}>
      <Image src={src} style={{ width: 320, height: 372 * K }} />
      {LBL.map(([t, x, y]) => <Text key={t + y} style={{ ...lab, left: x * K - 60, top: y * K - 4 }}>{t}</Text>)}
      <Text style={{ ...lab, left: 368 * K - 60, top: 190 * K - 4, transform: 'rotate(-90deg)' }}>FRENTE</Text>
      <Text style={{ ...lab, left: 718 * K - 60, top: 188 * K - 4, transform: 'rotate(90deg)' }}>ATRÁS</Text>
    </View>
  );
}

// ── Documento ────────────────────────────────────────────────────────────────
function ReceptionOrderDocument({ order, workshop, photos = [], carsSrc }) {
  const c = order.customer || {};
  const v = order.vehicle || {};
  const shopAddr = [workshop.address, workshop.city && workshop.state ? `${workshop.city}, ${workshop.state}` : workshop.city || workshop.state].filter(Boolean).join(', ');
  const d = new Date(order.receivedAt);
  const date = d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
  const promise = order.estimatedReady ? new Date(order.estimatedReady).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const rows = [];
  for (let i = 0; i < photos.length; i += 9) rows.push(photos.slice(i, i + 9));

  return (
    <Document title={`Orden de recepción ${order.orderNumber}`}>
      <Page size="LETTER" style={s.page}>
        <View style={s.head}>
          <View>
            <Text style={s.shop}>{(workshop.name || '').toUpperCase()}</Text>
            <Text style={s.shopSub}>Dirección: {shopAddr}</Text>
            <Text style={s.shopSub}>Tel. / WhatsApp: {workshop.phone}</Text>
          </View>
          <View style={s.folioBox}>
            <Text style={s.orderTitle}>ORDEN DE RECEPCIÓN</Text>
            <Text style={s.folio}>FOLIO No.  {order.orderNumber}</Text>
          </View>
        </View>

        <View style={[s.row, { borderWidth: 0.6, borderColor: LINE, borderBottomStyle: 'solid' }]}>
          <Cell label="Fecha de ingreso" value={date} flex={1.1} />
          <Cell label="Hora de ingreso" value={time} flex={1.1} />
          <Cell label="Fecha promesa (diagnóstico)" value={promise} flex={1.5} />
          <Cell label="Recibió (asesor)" value={order.advisor} flex={1.3} />
        </View>

        <Bar title="1. DATOS DEL CLIENTE" />
        <View style={s.row}>
          <Cell label="Nombre / razón social" value={`${c.firstName || ''} ${c.lastName || ''}`.trim()} flex={2} />
          <Cell label="Teléfono / WhatsApp" value={c.phone} flex={1.05} />
          <Cell label="Teléfono alterno" value={c.altPhone} flex={1} />
        </View>
        <View style={s.row}>
          <Cell label="Correo electrónico" value={c.email} flex={2} />
          <Cell label="RFC" value={c.rfc} flex={1.05} />
          <Cell label="¿Requiere factura?" flex={1}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
              <Box /><Text style={s.value}>Sí</Text><View style={{ width: 8 }} /><Box /><Text style={s.value}>No</Text>
            </View>
          </Cell>
        </View>

        <Bar title="2. DATOS DEL VEHÍCULO" />
        <View style={s.row}>
          <Cell label="Marca" value={v.make} flex={1.35} />
          <Cell label="Modelo / versión" value={v.model} flex={1.3} />
          <Cell label="Año" value={v.year} flex={0.6} />
          <Cell label="Color" value={v.color} flex={1.05} />
          <Cell label="Placas" value={v.licensePlate} flex={0.9} />
          <Cell label="Kilometraje" value={order.mileageIn != null ? `${order.mileageIn.toLocaleString('es-MX')} km` : ''} flex={1} />
        </View>
        <View style={s.row}>
          <Cell label="No. de serie (VIN)" value={v.vin} flex={2} />
          <Cell label="Motor / transmisión" value={v.engineType} flex={1.05} />
          <Cell label="Nivel de gasolina" flex={1}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
              {FUEL.map((f) => (
                <View key={f} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 8 }}>{FUEL_TXT[f]}</Text><Box on={order.fuelLevel === f} />
                </View>
              ))}
            </View>
          </Cell>
        </View>

        <Bar title="3. SERVICIO SOLICITADO" />
        {/* Servicio de la orden; si es corto, quedan 3 renglones para escribir a mano */}
        <View style={{ height: 39, position: 'relative', overflow: 'hidden' }}>
          {[1, 2, 3].map((i) => <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: i * 13 - 0.5, borderBottomWidth: 0.6, borderBottomColor: LINE, borderBottomStyle: 'dashed' }} />)}
          <Text maxLines={3} style={{ fontSize: 8.2, lineHeight: 1.58, paddingHorizontal: 4, paddingTop: 0.5 }}>{order.description || ' '}</Text>
        </View>

        <Bar title="4. INVENTARIO DEL VEHÍCULO" sub="(marcar" tick="si está presente, X si falta)" />
        <Inventory />

        <Bar title="5. ESTADO DE CARROCERÍA E INTERIORES" sub="(marcar en el dibujo)" />
        <BodyImage src={carsSrc} />
        <Text style={{ fontSize: 7.4, textAlign: 'center', marginTop: 2 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>CLAVES:</Text>  G = Golpe   R = Rayón   A = Abolladura   Q = Quebrado / estrellado   F = Faltante   O = Óxido / pintura dañada
        </Text>
        <View style={{ borderWidth: 0.5, borderColor: LINE, marginTop: 4, padding: 3, minHeight: 24 }}>
          <Text style={s.label}>OBSERVACIONES (vestiduras, cristales, llantas, olores, objetos de valor declarados):</Text>
          <Text style={{ fontSize: 7.8, marginTop: 2 }}>{order.receptionNotes || ' '}</Text>
        </View>

        <Bar title="6. CONDICIONES Y AUTORIZACIÓN" />
        <Text style={s.cond}><Text style={{ fontFamily: 'Helvetica-Bold' }}>1. </Text>El cliente autoriza la revisión y diagnóstico del vehículo. Antes de cualquier reparación se le enviará una cotización para su autorización.</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
          <Text style={{ fontSize: 7.4 }}><Text style={{ fontFamily: 'Helvetica-Bold' }}>2. </Text>Si el cliente no autoriza la reparación, el diagnóstico tendrá un costo de $__________.  Se autoriza prueba de manejo: </Text>
          <Box /><Text style={{ fontSize: 7.4 }}>Sí</Text><Box /><Text style={{ fontSize: 7.4 }}>No</Text>
        </View>
        <Text style={s.cond}><Text style={{ fontFamily: 'Helvetica-Bold' }}>3. </Text>El taller no se hace responsable por objetos de valor no declarados en esta orden, ni por fallas ocultas no relacionadas con el servicio solicitado.</Text>
        <Text style={s.cond}><Text style={{ fontFamily: 'Helvetica-Bold' }}>4. </Text>Vehículos no recogidos ______ días después de avisar que están listos generarán un cargo por resguardo de $________ por día.</Text>

        <View style={s.sigRow}>
          {/* Cliente y asesor firman en digital al recibir; el cliente firma a mano al entregarle el vehículo */}
          <SigSlot title="CLIENTE (ENTREGA EL VEHÍCULO)" image={order.receptionSignature} name={order.receptionSignedBy || `${c.firstName || ''} ${c.lastName || ''}`.trim()} signed={!!order.receptionSignature} />
          <SigSlot title="ASESOR (RECIBE)" image={order.advisorSignature} name={order.advisorName} signed={!!order.advisorSignature} />
          <SigSlot title="CLIENTE (RECIBE DE CONFORMIDAD)" />
        </View>
        <View style={s.footer} fixed><Text>{workshop.name} · Orden de recepción {order.orderNumber}</Text><Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} /></View>
      </Page>

      {rows.map((group, pi) => (
        <Page key={pi} size="LETTER" style={s.page}>
          <View style={s.head}>
            <View>
              <Text style={s.shop}>{(workshop.name || '').toUpperCase()}</Text>
              <Text style={s.shopSub}>Orden de recepción · Folio {order.orderNumber} · {c.firstName} {c.lastName} · {v.make} {v.model} {v.licensePlate}</Text>
            </View>
          </View>
          <Bar title="5. ESTADO DE CARROCERÍA E INTERIORES" sub="— fotografías tomadas en la recepción" />
          <View style={s.photoGrid}>
            {group.map((p, i) => (
              <View key={i} style={s.photoCell} wrap={false}>
                <Image style={s.photoImg} src={p.src} />
                <Text style={s.photoLabel}>{p.label}</Text>
              </View>
            ))}
          </View>
          <View style={s.footer} fixed><Text>{workshop.name} · Orden de recepción {order.orderNumber}</Text><Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} /></View>
        </Page>
      ))}
    </Document>
  );
}

async function toDataUrl(url) {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve) => { const fr = new FileReader(); fr.onloadend = () => resolve(fr.result); fr.readAsDataURL(blob); });
}

// react-pdf solo admite PNG/JPEG; las fotos se guardan en WebP, así que se convierten a JPEG
async function toJpegDataUrl(url, maxSide = 640) {
  const bmp = await createImageBitmap(await (await fetch(url)).blob());
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  return canvas.toDataURL('image/jpeg', 0.82);
}

// Fotos de recepción (por lugar solicitado) y daños marcados; las que fallen se omiten
async function buildPhotos(order) {
  const slots = (order.photoSlots || []).filter((s) => s.kind === 'RECEPTION').map((s) => ({ label: s.label, photo: s.photos?.[0] }));
  const damages = (order.photos || []).filter((p) => p.phase === 'RECEPTION' && !p.slotId).map((p) => ({ label: p.tag || 'Observación', photo: p }));
  const list = [...slots, ...damages].filter((x) => x.photo).slice(0, 18);
  const done = await Promise.all(list.map(async (x) => {
    try { return { label: x.label, src: await toJpegDataUrl(x.photo.url) }; } catch { return null; }
  }));
  return done.filter(Boolean);
}

export async function downloadReceptionOrderPdf(order, workshop, advisor) {
  const [{ pdf }, carsSrc, photos] = await Promise.all([
    import('@react-pdf/renderer'),
    toDataUrl('/orden-recepcion-autos.png'),
    buildPhotos(order),
  ]);
  const blob = await pdf(
    <ReceptionOrderDocument order={{ ...order, advisor: order.advisorName || advisor }} workshop={workshop} photos={photos} carsSrc={carsSrc} />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Recepcion-${order.orderNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
