/** Aviso de versión nueva de la app (service worker) y de "lista para usar sin conexión". */
import { useRegisterSW } from "virtual:pwa-register/react";

export function Actualizacion() {
  const {
    needRefresh: [hayNueva, setHayNueva],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Revisa si hay versión nueva cada hora mientras la app está abierta.
      if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000);
    },
  });
  if (!hayNueva) return null;
  return (
    <div className="banner" role="status">
      <span>Hay una versión nueva de la app.</span>
      <button className="btn small" onClick={() => void updateServiceWorker(true)}>
        Actualizar
      </button>
      <button className="btn ghost small" onClick={() => setHayNueva(false)}>
        Después
      </button>
    </div>
  );
}
