import { Document, Page, View, Text, Image, pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { IVA_FACTOR } from '../constants/tax';
import { styles, money, fdate, toDataUrl } from './WorkOrderPDF';

// Cotización con el mismo formato que la orden de trabajo, para enviar al cliente y que la autorice.
// Los precios capturados incluyen IVA; en los conceptos se muestran sin IVA (÷1.16), igual que la orden.
function QuoteDocument({ quote, workshop, vehicle, customer, qrDataUrl, logoDataUrl }) {
  const total = Number(quote.total || 0);
  const subtotal = total / IVA_FACTOR;
  const iva = total - subtotal;
  const items = (quote.items || []).map((it) => ({
    description: it.description,
    unitPrice: Number(it.unitPrice),
    qty: Number(it.quantity),
    total: Number(it.total),
  }));
  const conceptosTotal = items.reduce((s, i) => s + i.total, 0) / IVA_FACTOR;
  const line2 = [workshop?.address, workshop?.city].filter(Boolean).join(', ');
  const nameRfc = [workshop?.legalName, workshop?.taxId ? `RFC: ${workshop.taxId}` : ''].filter(Boolean).join(' ');
  const footerLine = [workshop?.address, nameRfc].filter(Boolean).join('  |  ');
  const tecnico = workshop?.legalName || workshop?.name || '';
  const cli = customer || quote.customer;
  const cliente = cli ? `${cli.firstName || ''} ${cli.lastName || ''}`.trim() : '';
  const veh = vehicle || quote.workOrder?.vehicle;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.title}>COTIZACIÓN</Text>
            <Text style={styles.sub}>#{quote.quoteNumber}  |  {fdate(quote.createdAt)}</Text>
            {quote.validUntil ? <Text style={styles.sub}>Válida hasta: {fdate(quote.validUntil)}</Text> : null}
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

        {cliente ? <Text style={styles.falla}>Cliente: {cliente}</Text> : null}
        {veh ? <Text style={styles.vehicle}>{veh.year} {veh.make} {veh.model}{veh.licensePlate ? `  |  ${veh.licensePlate}` : ''}</Text> : null}

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
          <View key={i} style={styles.itemRow} wrap={false}>
            <Text style={styles.cDesc}>{it.description}</Text>
            <Text style={styles.cPU}>{money(it.unitPrice / IVA_FACTOR)}</Text>
            <Text style={styles.cQty}>{it.qty}</Text>
            <Text style={styles.cTotal}>{money(it.total / IVA_FACTOR)}</Text>
          </View>
        ))}

        <View style={styles.bottomWrap}>
          <View style={styles.midRow}>
            <View style={styles.notesBox}>
              <Text style={styles.bold}>Observaciones:</Text>
              <Text style={styles.notesText}>{quote.notes || ''}</Text>
              <Text style={[styles.notesText, { marginTop: 10, fontSize: 8, color: '#6b7280' }]}>
                Para autorizar esta cotización firme de conformidad o responda «AUTORIZO» al mensaje donde la recibió.
              </Text>
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
              <View style={{ height: 46 }} />
              <View style={styles.sigLine}><Text style={styles.sigLabel}>Autorizo (firma cliente)</Text></View>
              {cliente ? <Text style={styles.sigName}>{cliente}</Text> : null}
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

/** Genera y descarga el PDF. `extra` permite pasar { vehicle, customer } cuando la cotización no los trae. */
export async function downloadQuotePdf(quote, workshop, extra = {}) {
  const orderId = quote.workOrderId || quote.workOrder?.id;
  let qrDataUrl = null;
  let logoDataUrl = null;
  // El QR lleva al portal del cliente, donde puede aprobar o rechazar (solo si hay orden ligada)
  if (orderId) {
    try { qrDataUrl = await QRCode.toDataURL(`${window.location.origin}/cliente/orden/${orderId}`, { margin: 1, width: 220 }); } catch { /* ignore */ }
  }
  try { logoDataUrl = await toDataUrl('/color.png'); } catch { /* ignore */ }

  const blob = await pdf(
    <QuoteDocument quote={quote} workshop={workshop} vehicle={extra.vehicle} customer={extra.customer} qrDataUrl={qrDataUrl} logoDataUrl={logoDataUrl} />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Cotizacion-${quote.quoteNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
