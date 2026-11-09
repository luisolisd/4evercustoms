import clsx from 'clsx';

/**
 * Tabla en escritorio · tarjetas en celular. Así nada obliga a deslizar de lado y
 * todas las columnas y acciones siguen disponibles en el teléfono.
 *
 *  columns: [{
 *    key, header,
 *    cell: (row) => node,
 *    mobile: 'title' | 'badge' | 'field' (por defecto) | 'hide',
 *      title → encabezado de la tarjeta · badge → esquina superior derecha · field → fila "etiqueta: valor"
 *    mobileLabel: etiqueta en la tarjeta (por defecto, el header),
 *    desktop: false → la columna solo existe en la tarjeta del celular
 *    align: 'left' | 'center' | 'right', className
 *  }]
 *  actions: (row, { mobile }) => node   (columna final en tabla; pie de la tarjeta en celular)
 */
export default function ResponsiveTable({
  columns, rows, rowKey = 'id', onRowClick, actions, actionsHeader = '', minWidth = 640, rowClassName,
}) {
  const align = { left: 'text-left', center: 'text-center', right: 'text-right' };
  const deskCols = columns.filter((c) => c.desktop !== false);
  const titleCols = columns.filter((c) => c.mobile === 'title');
  const badgeCols = columns.filter((c) => c.mobile === 'badge');
  const fieldCols = columns.filter((c) => !c.mobile || c.mobile === 'field');
  const key = (r) => (typeof rowKey === 'function' ? rowKey(r) : r[rowKey]);
  const stop = (e) => e.stopPropagation();

  return (
    <>
      {/* Escritorio / tablet */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth }}>
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              {deskCols.map((c) => (
                <th key={c.key} className={clsx('px-5 py-3 font-semibold', align[c.align || 'left'], c.headerClassName)}>{c.header}</th>
              ))}
              {actions && <th className="px-5 py-3 text-right">{actionsHeader}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r) => (
              <tr
                key={key(r)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={clsx('transition-colors hover:bg-gray-50', onRowClick && 'cursor-pointer', rowClassName?.(r))}
              >
                {deskCols.map((c) => (
                  <td key={c.key} className={clsx('px-5 py-4 align-middle', align[c.align || 'left'], c.className)}>{c.cell(r)}</td>
                ))}
                {actions && (
                  <td className="px-5 py-4" onClick={stop}>
                    <div className="flex items-center justify-end gap-1">{actions(r, { mobile: false })}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Celular */}
      <div className="md:hidden divide-y divide-gray-100">
        {rows.map((r) => (
          <div
            key={key(r)}
            onClick={onRowClick ? () => onRowClick(r) : undefined}
            className={clsx('p-4 space-y-3', onRowClick && 'cursor-pointer active:bg-gray-50', rowClassName?.(r))}
          >
            {(titleCols.length > 0 || badgeCols.length > 0) && (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-0.5">{titleCols.map((c) => <div key={c.key}>{c.cell(r)}</div>)}</div>
                {badgeCols.length > 0 && <div className="shrink-0 flex flex-col items-end gap-1">{badgeCols.map((c) => <div key={c.key}>{c.cell(r)}</div>)}</div>}
              </div>
            )}
            {fieldCols.length > 0 && (
              <dl className="space-y-1.5 text-sm">
                {fieldCols.map((c) => (
                  <div key={c.key} className="flex items-start justify-between gap-4">
                    <dt className="shrink-0 text-xs text-gray-400 pt-0.5">{c.mobileLabel ?? c.header}</dt>
                    <dd className="min-w-0 text-right text-gray-800">{c.cell(r)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {actions && (
              <div className="flex flex-wrap items-center gap-2 pt-1" onClick={stop}>{actions(r, { mobile: true })}</div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// Botón de acción reutilizable: icono solo en escritorio, icono + texto en celular
export function RowAction({ icon: Icon, label, onClick, tone = 'gray', mobile, title }) {
  const tones = {
    gray: 'text-gray-500 hover:text-gray-800 hover:bg-gray-100',
    blue: 'text-blue-600 hover:bg-blue-50',
    amber: 'text-amber-600 hover:bg-amber-50',
    red: 'text-red-600 hover:bg-red-50',
    brand: 'text-brand-600 hover:bg-brand-50',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={title || label}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-xl transition-colors font-medium',
        mobile ? 'min-h-[40px] px-3.5 text-sm border border-gray-200 bg-white' : 'p-1.5',
        tones[tone]
      )}
    >
      <Icon size={mobile ? 16 : 15} />
      {mobile && <span>{label}</span>}
    </button>
  );
}
