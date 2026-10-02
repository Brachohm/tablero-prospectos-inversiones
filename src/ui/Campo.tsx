import { useId } from "react";
import { MOTIVOS } from "../config/ficha";
import { crudo, motivosDe } from "../domain/ficha";
import type { Campo as CampoT, MotivoId, Prospecto } from "../domain/tipos";

export type Cambiar = (k: string, v: unknown) => void;

/** Un campo simple de la ficha: texto, número, fecha, lista, área de texto o check. */
export function Campo({ c, p, cambiar }: { c: CampoT; p: Prospecto; cambiar: Cambiar }) {
  const id = useId();
  if (c.t === "check") {
    const on = p[c.k] === true;
    return (
      <label className={"ck" + (on ? " on" : "")}>
        <input type="checkbox" checked={on} onChange={(e) => cambiar(c.k, e.target.checked)} />
        <span>{c.l}</span>
        <em aria-label={`${c.xp} XP`}>+{c.xp}</em>
      </label>
    );
  }
  // Valor tal cual (sin recortar), para poder escribir espacios.
  const v = crudo(p, c.k);
  let control;
  if (c.t === "select") {
    control = (
      <select id={id} value={v} onChange={(e) => cambiar(c.k, e.target.value)}>
        {c.k !== "etapa" && <option value="">Elegir…</option>}
        {c.o?.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );
  } else if (c.t === "textarea") {
    control = <textarea id={id} value={v} placeholder={c.ph} onChange={(e) => cambiar(c.k, e.target.value)} />;
  } else {
    const esNum = c.t === "number";
    const entero = esNum && c.k === "edad";
    control = (
      <input
        id={id}
        type={c.t}
        value={v}
        placeholder={c.ph}
        inputMode={esNum ? (entero ? "numeric" : "decimal") : c.t === "tel" ? "tel" : c.t === "email" ? "email" : undefined}
        min={c.min}
        max={c.max}
        step={esNum ? (entero ? 1 : 0.01) : undefined}
        autoComplete={c.k === "nombre" ? "off" : undefined}
        onChange={(e) => cambiar(c.k, e.target.value)}
      />
    );
  }
  return (
    <div className={"f" + (c.ancho ? " full" : "")}>
      <label htmlFor={id}>
        <span>{c.l}</span>
      </label>
      {control}
    </div>
  );
}

export function Motivos({ c, p, cambiar }: { c: CampoT; p: Prospecto; cambiar: Cambiar }) {
  const sel = motivosDe(p);
  const alternar = (id: MotivoId) =>
    cambiar("motivos", sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  return (
    <div className="f" role="group" aria-label={c.l}>
      <span>{c.l}</span>
      <div className="mchips">
        {MOTIVOS.map((m) => (
          <button key={m.id} type="button" className="mc" aria-pressed={sel.includes(m.id)} onClick={() => alternar(m.id)}>
            <span aria-hidden="true">{m.ic}</span> {m.l}
          </button>
        ))}
      </div>
      <p className="an-note" style={{ marginTop: 6 }}>
        Elige todos los que apliquen: abajo aparecen solo los campos de cada uno.
      </p>
    </div>
  );
}
