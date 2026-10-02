/** Proveedor de avisos breves ("+10 XP"), anunciados a lectores de pantalla, con acción opcional ("Deshacer"). */
import { useCallback, useRef, useState, type ReactNode } from "react";
import { AvisoCtx, type AccionAviso } from "./hooks";

export function AvisoProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("");
  const [accion, setAccion] = useState<AccionAviso | null>(null);
  const [visible, setVisible] = useState(false);
  const t = useRef<number | undefined>(undefined);
  const avisar = useCallback((m: string, a?: AccionAviso) => {
    setMsg(m);
    setAccion(a ?? null);
    setVisible(true);
    window.clearTimeout(t.current);
    // Con acción se deja más tiempo para tocarla.
    t.current = window.setTimeout(() => setVisible(false), a ? 6000 : 1900);
  }, []);
  return (
    <AvisoCtx.Provider value={avisar}>
      {children}
      <div className={"toast" + (visible ? " show" : "") + (accion ? " con-accion" : "")} role="status" aria-live="polite">
        <span>{msg}</span>
        {accion && visible && (
          <button
            type="button"
            className="toast-accion"
            onClick={() => {
              accion.alTocar();
              setVisible(false);
            }}
          >
            {accion.texto}
          </button>
        )}
      </div>
    </AvisoCtx.Provider>
  );
}
