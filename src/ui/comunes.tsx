import type { CSSProperties, ReactNode } from "react";
import { useArmado } from "./hooks";
import { usePlegado } from "./plegado";

export function Anillo({ pct, label }: { pct: number; label?: string }) {
  return (
    <div className="ring" style={{ "--p": pct } as CSSProperties} role="img" aria-label={label ?? `Avance ${pct}%`}>
      <b aria-hidden="true">{pct}%</b>
    </div>
  );
}

/** Botón que pide un segundo toque antes de ejecutar. */
export function BotonConfirmar({
  onConfirm,
  children,
  armadoTexto,
  className = "btn ghost small",
  ...rest
}: {
  onConfirm: () => void;
  children: ReactNode;
  armadoTexto: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [armado, click] = useArmado(onConfirm);
  return (
    <button type="button" className={className} data-armado={armado ? "1" : undefined} onClick={click} {...rest}>
      {armado ? armadoTexto : children}
    </button>
  );
}

/** Título de una sección desplegable: el título es el botón que la abre o la pliega. */
export function TituloPlegable({ id, seccion, children }: { id: string; seccion: string; children: ReactNode }) {
  const { abierta, alternar } = usePlegado(seccion);
  if (!alternar) return <h2 id={id}>{children}</h2>;
  return (
    <h2 id={id}>
      <button type="button" className="plegar" aria-expanded={abierta} onClick={alternar}>
        {children}
        <span className="chev" aria-hidden="true">
          ›
        </span>
      </button>
    </h2>
  );
}
