import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UserPlus, CarFront } from 'lucide-react';
import Modal from './ui/Modal';
import CustomerForm from './forms/CustomerForm';
import VehicleForm from './forms/VehicleForm';
import { createCustomer } from '../services/customers';
import { createVehicle } from '../services/vehicles';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../hooks/useToast';

const linkClass =
  'inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-40 disabled:cursor-not-allowed';

// El formulario de la ventana está dentro de otro <form> (React propaga los eventos por el portal):
// se corta aquí para que guardar el cliente/vehículo no envíe también el formulario de atrás.
const Isolate = ({ children }) => <div onSubmit={(e) => e.stopPropagation()}>{children}</div>;

// Refresca las listas que alimentan los desplegables y espera a que estén listas antes de seleccionar lo nuevo
const refreshLists = async (qc, keys) => {
  await Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: k })));
  // Deja que React dibuje las opciones nuevas del desplegable antes de seleccionarlas
  await new Promise((r) => setTimeout(r, 120));
};

/** "+ Nuevo cliente": se da de alta sin salir del formulario y queda seleccionado. */
export function NewCustomerButton({ onCreated }) {
  const workshopId = useAuthStore((s) => s.workshopId);
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (data) => {
    setBusy(true);
    try {
      const res = await createCustomer(workshopId, data);
      await refreshLists(qc, [['customers-all'], ['customers-list'], ['customers']]);
      toast.success('Cliente creado');
      setOpen(false);
      onCreated?.(res.data);
    } catch (e) {
      toast.error(e.message || 'No se pudo crear el cliente');
    } finally { setBusy(false); }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={linkClass}><UserPlus size={13} /> Nuevo cliente</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo cliente" size="md">
        <Isolate><CustomerForm onSubmit={save} loading={busy} /></Isolate>
      </Modal>
    </>
  );
}

/** "+ Nuevo vehículo": para el cliente elegido; queda seleccionado al guardarse. */
export function NewVehicleButton({ customerId, onCreated }) {
  const workshopId = useAuthStore((s) => s.workshopId);
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (data) => {
    setBusy(true);
    try {
      const res = await createVehicle(workshopId, { ...data, customerId });
      await refreshLists(qc, [['vehicles-customer'], ['vehicles'], ['customers-all'], ['customers']]);
      toast.success('Vehículo agregado');
      setOpen(false);
      onCreated?.(res.data);
    } catch (e) {
      toast.error(e.message || 'No se pudo agregar el vehículo');
    } finally { setBusy(false); }
  };

  return (
    <>
      <button type="button" disabled={!customerId} onClick={() => setOpen(true)} className={linkClass}><CarFront size={13} /> Nuevo vehículo</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo vehículo" size="lg">
        <Isolate><VehicleForm fixedCustomerId={customerId} onSubmit={save} loading={busy} /></Isolate>
      </Modal>
    </>
  );
}
