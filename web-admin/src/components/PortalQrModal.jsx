import { useEffect, useState } from 'react';
import { Copy, Download, Printer } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { useToast } from '../hooks/useToast';

// QR del portal de clientes: al escanearlo se abre el portal y se ofrece "Agregar a inicio"
export default function PortalQrModal({ open, onClose }) {
  const toast = useToast();
  const [dataUrl, setDataUrl] = useState('');
  const url = `${window.location.origin}/cliente/acceso`;

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    import('qrcode')
      .then((m) => (m.default || m).toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: 'M' }))
      .then((d) => { if (alive) setDataUrl(d); })
      .catch(() => { if (alive) toast.error('No se pudo generar el QR'); });
    return () => { alive = false; };
  }, [open, url]); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success('Enlace copiado'); }
    catch { toast.error('No se pudo copiar'); }
  };

  const print = () => {
    const w = window.open('', '_blank');
    if (!w) return toast.error('Permite las ventanas emergentes para imprimir');
    w.document.write(`<!doctype html><title>QR portal de clientes</title>
      <body style="font-family:sans-serif;text-align:center;padding:40px">
        <h1 style="margin:0 0 4px">4EVRcustoms</h1>
        <p style="margin:0 0 24px;color:#555">Escanea para ver el estatus de tu vehículo, tus citas y avisos</p>
        <img src="${dataUrl}" style="width:380px;height:380px" />
        <p style="margin-top:16px;color:#777;font-size:14px">${url}</p>
        <script>window.onload=()=>{window.print()}</script></body>`);
    w.document.close();
  };

  return (
    <Modal open={open} onClose={onClose} title="QR del portal de clientes" size="sm">
      <div className="space-y-4 text-center">
        <p className="text-sm text-gray-600">
          Muéstralo o imprímelo en el taller. Al escanearlo, el cliente abre su portal y se le ofrece <b>agregarlo a su inicio</b> como una app.
        </p>
        <div className="mx-auto w-64 h-64 border border-gray-200 rounded-md bg-white p-2 flex items-center justify-center">
          {dataUrl ? <img src={dataUrl} alt="QR del portal de clientes" className="w-full h-full" /> : <span className="text-xs text-gray-400">Generando…</span>}
        </div>
        <p className="text-xs text-gray-500 break-all">{url}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <a
            href={dataUrl || undefined}
            download="qr-portal-clientes.png"
            className={`inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 min-h-[44px] sm:min-h-0 sm:py-2.5 text-sm font-semibold text-gray-700 shadow-soft hover:bg-gray-50 ${dataUrl ? '' : 'pointer-events-none opacity-50'}`}
          >
            <Download size={14} /> Descargar
          </a>
          <Button variant="secondary" icon={Printer} onClick={print} disabled={!dataUrl}>Imprimir</Button>
          <Button variant="secondary" icon={Copy} onClick={copy}>Copiar enlace</Button>
        </div>
      </div>
    </Modal>
  );
}
