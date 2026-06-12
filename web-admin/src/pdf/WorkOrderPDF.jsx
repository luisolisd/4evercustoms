import { Document, Page, View, Text, Image, StyleSheet, pdf, Font } from '@react-pdf/renderer';
import QRCode from 'qrcode';

// Evita que react-pdf corte palabras a la mitad (AUTO-MOTRIZ); solo corta en espacios.
Font.registerHyphenationCallback((word) => [word]);

const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0));
const fdate = (d) => (d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, color: '#111827', fontFamily: 'Helvetica' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold' },
  sub: { fontSize: 10, color: '#374151', marginTop: 3 },
  wsBox: { flexDirection: 'row', alignItems: 'center' },
  wsTextCol: { width: 175, alignItems: 'flex-end', marginRight: 10 },
  wsText: { fontSize: 8, color: '#374151', textAlign: 'right', lineHeight: 1.3 },
  logo: { width: 90 },
  hr: { borderBottomWidth: 1, borderBottomColor: '#111827', marginVertical: 12 },
  vehicle: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 4 },
  falla: { fontSize: 9, color: '#374151', marginTop: 5 },
  laborRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#111827', paddingBottom: 5, marginTop: 24 },
  bold: { fontFamily: 'Helvetica-Bold' },
  colHead: { flexDirection: 'row', marginTop: 6, color: '#9ca3af', fontSize: 7 },
  itemRow: { flexDirection: 'row', marginTop: 8 },
  cDesc: { flex: 1, paddingRight: 8 },
  cPU: { width: 65, textAlign: 'right' },
  cQty: { width: 30, textAlign: 'right' },
  cTotal: { width: 70, textAlign: 'right' },
  bottomWrap: { marginTop: 'auto' }, // empuja el bloque inferior al fondo de la página
  midRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  notesBox: { width: '54%', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4, padding: 8, minHeight: 110 },
  notesText: { marginTop: 3, color: '#374151', lineHeight: 1.4 },
  totals: { width: '40%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 30 },
  sigCol: { alignItems: 'center', width: 150 },
  sigLine: { borderTopWidth: 1, borderTopColor: '#9ca3af', width: 140, marginTop: 6, paddingTop: 4 },
  sigLabel: { width: 140, textAlign: 'center' },
  sigName: { width: 140, textAlign: 'center', fontFamily: 'Helvetica-Bold', marginTop: 2 },
  sigImg: { width: 120, height: 46, objectFit: 'contain' },
  qr: { width: 66, height: 66 },
  bottom: { borderTopWidth: 1, borderTopColor: '#111827', marginTop: 16, paddingTop: 6, textAlign: 'center', fontSize: 8, color: '#374151' },
});

function buildItems(order) {
  const items = [];
  (order.quotes || [])
    .filter((q) => q.status === 'APPROVED')
    .forEach((q) => (q.items || []).forEach((it) =>
      items.push({ description: it.description, unitPrice: Number(it.unitPrice), qty: Number(it.quantity), total: Number(it.total) })));
  (order.workOrderParts || []).forEach((p) =>
    items.push({ description: p.part?.name || 'Refacción', unitPrice: Number(p.unitPrice), qty: Number(p.quantity), total: Number(p.total) }));
  return items;
}

function WorkOrderDocument({ order, workshop, qrDataUrl, logoDataUrl }) {
  const total = Number(order.totalAmount || 0);
  const subtotal = total / 1.16; // los precios ya incluyen IVA → se desglosa hacia atrás
  const iva = total - subtotal;
  const items = buildItems(order);
  // Los precios capturados ya incluyen IVA; en los conceptos se muestran SIN IVA (÷1.16)
  const conceptosTotal = items.reduce((s, i) => s + i.total, 0) / 1.16;
  const line2 = [workshop?.address, workshop?.city].filter(Boolean).join(', ');
  const legal = workshop?.legalName
    ? `${workshop.legalName}${workshop?.taxId ? ` · RFC: ${workshop.taxId}` : ''}`
    : (workshop?.taxId ? `RFC: ${workshop.taxId}` : '');
  // Pie: DOMICILIO | RAZÓN SOCIAL RFC: XXXX
  const nameRfc = [workshop?.legalName, workshop?.taxId ? `RFC: ${workshop.taxId}` : '']
    .filter(Boolean).join(' ');
  const footerLine = [workshop?.address, nameRfc].filter(Boolean).join('  |  ');
  // Técnico = dueño/razón social; cliente del registro
  const tecnico = workshop?.legalName || workshop?.name || '';
  const cliente = order.customer ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() : '';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.title}>ORDEN DE TRABAJO</Text>
            <Text style={styles.sub}>#{order.orderNumber}  |  {fdate(order.receivedAt)}</Text>
          </View>
          <View style={styles.wsBox}>
            <View style={styles.wsTextCol}>
              <Text style={[styles.wsText, styles.bold]}>{workshop?.name || '4EVRcustoms'}</Text>
              {line2 ? <Text style={styles.wsText}>{line2}</Text> : null}
              {workshop?.legalName ? <Text style={styles.wsText}>{workshop.legalName}</Text> : null}
              {workshop?.taxId ? <Text style={styles.wsText}>RFC: {workshop.taxId}</Text> : null}
            </View>
            {logoDataUrl ? <Image style={styles.logo} src={logoDataUrl} /> : null}
          </View>
        </View>

        <View style={styles.hr} />

        <Text style={styles.vehicle}>{order.vehicle?.year} {order.vehicle?.make} {order.vehicle?.model}</Text>
        {order.description ? <Text style={styles.falla}>Falla: {order.description}</Text> : null}

        <View style={styles.laborRow}>
          <Text style={styles.bold}>Conceptos</Text>
          <Text style={styles.bold}>{money(conceptosTotal)}</Text>
        </View>
        <View style={styles.colHead}>
          <Text style={styles.cDesc}>DESCRIPCIÓN</Text>
          <Text style={styles.cPU}>P.U.</Text>
          <Text style={styles.cQty}>CANT</Text>
          <Text style={styles.cTotal}>TOTAL</Text>
        </View>

        {items.length === 0 ? (
          <Text style={{ marginTop: 10, color: '#9ca3af' }}>Sin conceptos capturados.</Text>
        ) : items.map((it, i) => (
          <View key={i} style={styles.itemRow}>
            <Text style={styles.cDesc}>{it.description}</Text>
            <Text style={styles.cPU}>{money(it.unitPrice / 1.16)}</Text>
            <Text style={styles.cQty}>{it.qty}</Text>
            <Text style={styles.cTotal}>{money(it.total / 1.16)}</Text>
          </View>
        ))}

        {/* Bloque inferior fijo al fondo de la página */}
        <View style={styles.bottomWrap}>
        {/* Observaciones / Recomendaciones (izquierda) + Totales (derecha) */}
        <View style={styles.midRow}>
          <View style={styles.notesBox}>
            <Text style={styles.bold}>Observaciones:</Text>
            <Text style={styles.notesText}>{order.diagnosis || ''}</Text>
            <Text style={[styles.bold, { marginTop: 10 }]}>Recomendaciones:</Text>
            <Text style={styles.notesText}>{order.recommendations || ''}</Text>
          </View>
          <View style={styles.totals}>
            <View style={styles.totalRow}><Text style={styles.bold}>Subtotal</Text><Text>{money(subtotal)}</Text></View>
            <View style={styles.totalRow}><Text>IVA (16%)</Text><Text>{money(iva)}</Text></View>
            <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 4 }]}>
              <Text style={styles.bold}>Total</Text><Text style={styles.bold}>{money(total)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          {qrDataUrl ? <Image style={styles.qr} src={qrDataUrl} /> : <View style={{ width: 66 }} />}
          <View style={styles.sigCol}>
            {order.customerSignature ? <Image style={styles.sigImg} src={order.customerSignature} /> : <View style={{ height: 46 }} />}
            <View style={styles.sigLine}><Text style={styles.sigLabel}>Firma cliente</Text></View>
            {cliente ? <Text style={styles.sigName}>{cliente}</Text> : null}
            {order.signedAt ? <Text style={{ width: 140, textAlign: 'center', fontSize: 7, color: '#9ca3af' }}>Firmado {fdate(order.signedAt)}</Text> : null}
          </View>
          <View style={styles.sigCol}>
            <View style={{ height: 46 }} />
            <View style={styles.sigLine}><Text style={styles.sigLabel}>Firma técnico</Text></View>
            {tecnico ? <Text style={styles.sigName}>{tecnico}</Text> : null}
          </View>
        </View>

        <Text style={styles.bottom}>{footerLine}</Text>
        </View>
      </Page>
    </Document>
  );
}

async function toDataUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve) => {
    const fr = new FileReader();
    fr.onloadend = () => resolve(fr.result);
    fr.readAsDataURL(blob);
  });
}

export async function downloadWorkOrderPdf(order, workshop) {
  const trackUrl = `${window.location.origin}/cliente/orden/${order.id}`;
  let qrDataUrl = null;
  let logoDataUrl = null;
  try { qrDataUrl = await QRCode.toDataURL(trackUrl, { margin: 1, width: 220 }); } catch { /* ignore */ }
  try { logoDataUrl = await toDataUrl('/color.png'); } catch { /* ignore */ }

  const blob = await pdf(
    <WorkOrderDocument order={order} workshop={workshop} qrDataUrl={qrDataUrl} logoDataUrl={logoDataUrl} />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Orden-${order.orderNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
