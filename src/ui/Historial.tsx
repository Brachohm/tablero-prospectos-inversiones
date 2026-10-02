import { useId, useState } from "react";
import { CANALES } from "../config/crm";
import { CONTACTOS_MAX } from "../config/ficha";
import { borrarContacto, registrarContacto } from "../domain/crm";
import { fmtFecha, hoyISO } from "../domain/fechas";
import { historialDe } from "../domain/ficha";
import type { Canal, Contacto, Prospecto } from "../domain/tipos";
import { useArmado, useAviso } from "./hooks";

/** Historial de contactos: registrar (fecha, canal, nota) y ver la línea de tiempo. */
export function Historial({ p, actualizar }: { p: Prospecto; actualizar: (fn: (p: Prospecto) => Prospecto) => void }) {
  const avisar = useAviso();
  const [fecha, setFecha] = useState(hoyISO());
  const [canal, setCanal] = useState<Canal>("WhatsApp");
  const [nota, setNota] = useState("");
  const idFecha = useId();
  const idNota = useId();
  const h = historialDe(p);

  const registrar = () => {
    if (!fecha) return;
    const antes = h.length;
    actualizar((x) => registrarContacto(x, { fecha, canal, nota }));
    setNota("");
    avisar(antes < CONTACTOS_MAX ? "+10 XP · agenda el próximo contacto" : "Contacto registrado");
  };

  return (
    <div className="f">
      <span>
        Historial de contactos · <span className="hist-n">{h.length}</span>
        {h.length < CONTACTOS_MAX ? ` (mínimo ${CONTACTOS_MAX} antes de dar por perdido)` : " ✓"}
      </span>
      {h.length > 0 && (
        <ul className="hist" aria-label="Contactos registrados">
          {[...h].reverse().map((c) => (
            <ItemContacto key={c.id} c={c} borrar={() => actualizar((x) => borrarContacto(x, c.id))} />
          ))}
        </ul>
      )}
      <div className="hist-form">
        <div className="canales" role="group" aria-label="Canal">
          {CANALES.map((x) => (
            <button key={x} type="button" className="canal" aria-pressed={canal === x} onClick={() => setCanal(x)}>
              {x}
            </button>
          ))}
        </div>
        <div className="two">
          <div className="f">
            <label htmlFor={idFecha}>
              <span>Fecha</span>
            </label>
            <input id={idFecha} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="f">
            <label htmlFor={idNota}>
              <span>¿Qué pasó? (opcional)</span>
            </label>
            <input
              id={idNota}
              type="text"
              value={nota}
              placeholder="Le mandé un caso real, pidió pensarlo…"
              onChange={(e) => setNota(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && registrar()}
            />
          </div>
        </div>
        <button type="button" className="btn small" onClick={registrar} disabled={!fecha}>
          + Registrar contacto
        </button>
      </div>
    </div>
  );
}

function ItemContacto({ c, borrar }: { c: Contacto; borrar: () => void }) {
  const [armado, click] = useArmado(borrar);
  return (
    <li>
      <div>
        <b>{fmtFecha(c.fecha)}</b> <small>· {c.canal}</small>
        {c.nota && <p>{c.nota}</p>}
      </div>
      <button
        type="button"
        className="x"
        data-armado={armado ? "1" : undefined}
        onClick={click}
        aria-label={armado ? "Toca otra vez para borrar el contacto" : `Borrar contacto del ${fmtFecha(c.fecha)}`}
      >
        {armado ? "¿Borrar?" : "✕"}
      </button>
    </li>
  );
}
