/** Silueta del cuerpo con 16 zonas táctiles y enfocables (mismo dibujo que el prototipo). */
import type { KeyboardEvent, ReactNode } from "react";
import { ZONA_BY, type EstadoZona } from "../domain/pre";

interface Props {
  estados: Record<string, EstadoZona>;
  sel: string;
  elegir: (zid: string) => void;
}

export function Cuerpo({ estados, sel, elegir }: Props) {
  const Z = (id: string, cls: string, shapes: ReactNode) => {
    const z = ZONA_BY[id];
    const est = estados[id] ?? "pend";
    const txtEst = est === "hit" ? "con antecedentes" : est === "clear" ? "sin antecedentes" : "sin revisar";
    return (
      <g
        className={`zone st-${est}${cls ? " " + cls : ""}${id === sel ? " on" : ""}`}
        tabIndex={0}
        role="button"
        aria-label={`${z.nombre}: ${txtEst}`}
        aria-pressed={id === sel}
        onClick={() => elegir(id)}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            elegir(id);
          }
        }}
      >
        <title>{z.nombre}</title>
        {shapes}
      </g>
    );
  };
  return (
    <svg viewBox="0 0 260 600" role="group" aria-label="Mapa del cuerpo para declarar preexistencias">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7EE0FF" stopOpacity="0" />
          <stop offset="1" stopColor="#7EE0FF" stopOpacity=".55" />
        </linearGradient>
      </defs>
      <g className="sil" aria-hidden="true">
        <path className="o" d="M68 116 L48 200 L38 288" strokeWidth="20" />
        <path className="o" d="M172 116 L192 200 L202 288" strokeWidth="20" />
        <path className="f" d="M68 116 L48 200 L38 288" strokeWidth="17" />
        <path className="f" d="M172 116 L192 200 L202 288" strokeWidth="17" />
        <path className="o" d="M104 352 L99 440 L97 540" strokeWidth="27" />
        <path className="o" d="M136 352 L141 440 L143 540" strokeWidth="27" />
        <path className="f" d="M104 352 L99 440 L97 540" strokeWidth="24" />
        <path className="f" d="M136 352 L141 440 L143 540" strokeWidth="24" />
        <ellipse className="b" cx="92" cy="562" rx="19" ry="10" />
        <ellipse className="b" cx="148" cy="562" rx="19" ry="10" />
        <ellipse className="b" cx="120" cy="44" rx="28" ry="34" />
        <rect className="b" x="108" y="76" width="24" height="26" rx="6" />
        <path className="b" d="M70 108 C96 97 144 97 170 108 L174 204 C172 236 162 258 156 278 L84 278 C78 258 68 236 66 204 Z" />
        <path className="b" d="M84 276 L156 276 C164 300 162 330 152 352 L88 352 C78 330 76 300 84 276 Z" />
      </g>
      {Z("cabeza", "", <ellipse className="zs" cx="120" cy="34" rx="22" ry="19" />)}
      {Z("ojos_orl", "", <rect className="zs" x="97" y="54" width="46" height="26" rx="11" />)}
      {Z("cuello", "", <rect className="zs" x="106" y="80" width="28" height="22" rx="6" />)}
      {Z(
        "pulmones",
        "",
        <>
          <ellipse className="zs" cx="97" cy="138" rx="19" ry="30" />
          <ellipse className="zs" cx="143" cy="138" rx="19" ry="30" />
        </>,
      )}
      {Z("corazon", "", <ellipse className="zs" cx="124" cy="150" rx="12" ry="14" transform="rotate(-12 124 150)" />)}
      {Z(
        "mamas",
        "",
        <>
          <ellipse className="zs" cx="99" cy="186" rx="16" ry="10" />
          <ellipse className="zs" cx="141" cy="186" rx="16" ry="10" />
        </>,
      )}
      {Z("abd_sup", "", <ellipse className="zs" cx="120" cy="216" rx="30" ry="18" />)}
      {Z(
        "renal",
        "",
        <>
          <ellipse className="zs" cx="82" cy="238" rx="8" ry="15" />
          <ellipse className="zs" cx="158" cy="238" rx="8" ry="15" />
        </>,
      )}
      {Z("abd_inf", "", <rect className="zs" x="98" y="238" width="44" height="40" rx="16" />)}
      {Z("pelvis", "", <ellipse className="zs" cx="120" cy="304" rx="20" ry="16" />)}
      {Z(
        "caderas",
        "",
        <>
          <circle className="zs" cx="90" cy="326" r="13" />
          <circle className="zs" cx="150" cy="326" r="13" />
        </>,
      )}
      {Z(
        "brazos",
        "ln",
        <>
          <path className="zs" d="M68 116 L48 200 L38 288" />
          <path className="zs" d="M172 116 L192 200 L202 288" />
        </>,
      )}
      {Z(
        "piernas",
        "ln",
        <>
          <path className="zs" d="M104 356 L99 440 L97 536" />
          <path className="zs" d="M136 356 L141 440 L143 536" />
        </>,
      )}
      {Z(
        "pies",
        "",
        <>
          <ellipse className="zs" cx="92" cy="562" rx="17" ry="9" />
          <ellipse className="zs" cx="148" cy="562" rx="17" ry="9" />
        </>,
      )}
      {Z("columna", "ln sp", <path className="zs" d="M232 104 L232 322" />)}
      {Z("sistemico", "frame", <rect className="zs" x="5" y="5" width="250" height="590" rx="18" />)}
      <text x="232" y="94" textAnchor="middle" className="tl" aria-hidden="true">
        Columna
      </text>
      <text x="16" y="26" className="tl" aria-hidden="true">
        Todo el cuerpo
      </text>
      <rect className="scanline" x="0" y="0" width="260" height="34" fill="url(#sg)" pointerEvents="none" />
    </svg>
  );
}
