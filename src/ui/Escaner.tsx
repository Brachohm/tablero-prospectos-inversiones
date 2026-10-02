/** Misión "Declaración de preexistencias" (solo nuevo prospecto): escáner del cuerpo por persona. */
import { useId, useRef, useState } from "react";
import { XP_PRE } from "../config/juego";
import { ESTADOS_CONDICION, ROLES_PERSONA, ZONAS } from "../config/zonas";
import {
  estadoPersona,
  estadoZona,
  etiquetaPersona,
  grupoVisible,
  hitsPersona,
  personasDe,
  preResumen,
  TITULAR_ID,
  ZONA_BY,
  zonaDe,
  zonasPendientes,
  type EstadoZona,
} from "../domain/pre";
import {
  alternarZonaLimpia,
  detalleCondicion,
  editarPersona,
  marcarCondicion,
  MAX_PERSONAS,
  otraZona,
  personaConDatos,
  quitarPersona,
  responderNo,
  responderSi,
  restoSinAntecedentes,
  setNumeroPersonas,
  setOtra,
  siguientePaso,
  type CampoPersona,
} from "../domain/pre-ops";
import type { Prospecto } from "../domain/tipos";
import { useAviso } from "./hooks";
import { BotonConfirmar } from "./comunes";
import { Cuerpo } from "./Cuerpo";
import { imcPersona, NOTA_IMC, RANGOS_IMC } from "../domain/imc";
import type { Persona } from "../domain/tipos";

interface Props {
  p: Prospecto;
  actualizar: (fn: (p: Prospecto) => Prospecto) => void;
  /** Se llama cuando toda la declaración está completa (para bajar a la misión siguiente). */
  alCompletar: () => void;
}

export function Escaner({ p, actualizar, alCompletar }: Props) {
  const avisar = useAviso();
  const [pid, setPid] = useState(TITULAR_ID);
  const [zid, setZid] = useState(ZONAS[0].id);
  const panel = useRef<HTMLDivElement>(null);
  const gate = useRef<HTMLDivElement>(null);
  const trabajo = useRef<HTMLDivElement>(null);

  const pers = personasDe(p);
  const idx = Math.max(0, pers.findIndex((x) => x.id === pid));
  const per = pers[idx];
  const est = estadoPersona(p, per.id);
  const etiqueta = etiquetaPersona(per, idx);

  const ver = (r: React.RefObject<HTMLElement | null>) =>
    requestAnimationFrame(() => r.current?.scrollIntoView?.({ block: "nearest" }));

  const elegirPersona = (id: string, zona = ZONAS[0].id) => {
    setPid(id);
    setZid(zona);
  };

  const elegirZona = (id: string) => {
    setZid(id);
    ver(panel);
  };

  /** Después de terminar con una persona: siguiente sin responder, luego zonas pendientes, y si no, completa. */
  const siguiente = (q: Prospecto, desde: string) => {
    const paso = siguientePaso(q, desde);
    const lista = personasDe(q);
    if (paso.tipo === "persona") {
      const i = lista.findIndex((x) => x.id === paso.pid);
      elegirPersona(paso.pid);
      avisar("Sigue: " + etiquetaPersona(lista[i], i));
      ver(gate);
    } else if (paso.tipo === "zonas") {
      const i = lista.findIndex((x) => x.id === paso.pid);
      elegirPersona(paso.pid, otraZona(q, paso.pid, ZONAS.at(-1)!.id, 1, true));
      avisar("Faltan zonas por revisar de " + etiquetaPersona(lista[i], i));
    } else {
      avisar("Declaración completa ✓");
      alCompletar();
    }
  };

  /** Aplica un cambio y devuelve la ficha resultante (para decidir el siguiente paso). */
  const aplicar = (fn: (q: Prospecto) => Prospecto | null): Prospecto | null => {
    const q = fn(p);
    if (q) actualizar(() => q);
    return q;
  };

  const setN = (n: number) => {
    const q = aplicar((x) => setNumeroPersonas(x, n));
    if (!q) return;
    const lista = personasDe(q);
    if (n > pers.length) elegirPersona(lista[lista.length - 1].id);
    else if (!lista.some((x) => x.id === pid)) elegirPersona(lista[lista.length - 1].id);
  };

  const ultimo = pers[pers.length - 1];
  const menosNecesitaConfirmar = pers.length > 1 && personaConDatos(p, ultimo.id);

  const no = () => {
    const q = aplicar((x) => responderNo(x, per.id));
    if (!q) {
      avisar("Tiene condiciones declaradas: quítalas primero");
      return;
    }
    avisar(`Sin preexistencias · +${XP_PRE.sinPreexistencias} XP`);
    siguiente(q, per.id);
  };

  const si = () => {
    aplicar((x) => responderSi(x, per.id));
    setZid(ZONAS[0].id);
    ver(trabajo);
  };

  const zonaLimpia = () => {
    const q = aplicar((x) => alternarZonaLimpia(x, per.id, zid))!;
    if (zonaDe(q, per.id, zid)?.ok) {
      if (zonasPendientes(q, per.id) === 0) {
        avisar(`Escaneo completo · +${XP_PRE.escaneoCompleto} XP`);
        siguiente(q, per.id);
      } else {
        avisar(`Zona sin antecedentes · +${XP_PRE.zona} XP`);
        setZid(otraZona(q, per.id, zid, 1, true));
      }
    }
  };

  const resto = () => {
    const q = aplicar((x) => restoSinAntecedentes(x, per.id))!;
    avisar(`Escaneo completo · +${XP_PRE.escaneoCompleto} XP`);
    siguiente(q, per.id);
  };

  const estados: Record<string, EstadoZona> = Object.fromEntries(
    ZONAS.map((z) => [z.id, estadoZona(zonaDe(p, per.id, z.id))]),
  );
  const revisadas = Object.values(estados).filter((s) => s !== "pend").length;

  return (
    <div className="pre">
      <p className="an-note" style={{ margin: "0 0 10px" }}>
        Declara persona por persona, antes de cotizar. Si no tiene ninguna condición, responde "No" y seguimos; si la
        tiene, recorre el cuerpo de cabeza a pies. Cómo se trata cada condición lo define la aseguradora: esto es un registro
        tuyo, no un diagnóstico.
      </p>

      <div className="pre-q">
        <b id="npers">¿Cuántas personas se van a asegurar?</b>
        <div className="stepper" role="group" aria-labelledby="npers">
          {menosNecesitaConfirmar ? (
            <BotonConfirmar
              className=""
              armadoTexto="¿Quitar?"
              aria-label="Una persona menos"
              onConfirm={() => {
                setN(pers.length - 1);
                avisar("Persona quitada");
              }}
            >
              −
            </BotonConfirmar>
          ) : (
            <button
              type="button"
              aria-label="Una persona menos"
              onClick={() => (pers.length <= 1 ? avisar("Debe haber al menos una persona") : setN(pers.length - 1))}
            >
              −
            </button>
          )}
          <span aria-live="polite">{pers.length}</span>
          <button
            type="button"
            aria-label="Una persona más"
            disabled={pers.length >= MAX_PERSONAS}
            onClick={() => setN(pers.length + 1)}
          >
            +
          </button>
        </div>
      </div>

      <div className="pchips" role="group" aria-label="Personas">
        {pers.map((x, i) => {
          const e = estadoPersona(p, x.id);
          const h = hitsPersona(p, x.id);
          const st =
            e === "no" ? "✓" : e === "si" ? (h ? `${h} cond.` : zonasPendientes(p, x.id) ? "…" : "✓") : "○";
          return (
            <button
              key={x.id}
              type="button"
              className={"pchip" + (x.id === per.id ? " on" : "")}
              aria-pressed={x.id === per.id}
              onClick={() => elegirPersona(x.id)}
            >
              {etiquetaPersona(x, i)}
              <i className="pst">{st}</i>
            </button>
          );
        })}
      </div>

      <EditarPersona p={p} idx={idx} actualizar={actualizar} alQuitar={() => elegirPersona(TITULAR_ID)} />

      <div ref={gate}>
        {est === "pend" && (
          <div className="gate">
            <h3>¿{etiqueta} tiene alguna condición médica previa que declarar?</h3>
            <p className="an-note">
              Enfermedades, cirugías, tratamientos o estudios pendientes. Si no tiene ninguna, responde "No" y pasamos al
              siguiente paso.
            </p>
            <div className="gate-b">
              <button type="button" className="btn small" onClick={no}>
                No, ninguna
              </button>
              <button type="button" className="btn ghost small" onClick={si}>
                Sí, declarar
              </button>
            </div>
          </div>
        )}
        {est === "no" && (
          <div className="gate ok">
            <span>✓ {etiqueta}: sin preexistencias</span>
            <button type="button" className="btn ghost small" onClick={si}>
              Cambiar a Sí
            </button>
          </div>
        )}
        {est === "si" && hitsPersona(p, per.id) === 0 && (
          <div className="gate si">
            <span>Declarando para {etiqueta}</span>
            <button type="button" className="btn ghost small" onClick={no}>
              No tiene ninguna
            </button>
          </div>
        )}
      </div>

      {est === "si" && (
        <div className="pre-grid" ref={trabajo}>
          <div className="pre-map">
            <div className="scan">
              <div className="scan-top">
                <span>Escáner de preexistencias</span>
                <b>
                  {revisadas}/{ZONAS.length} zonas
                </b>
              </div>
              <Cuerpo estados={estados} sel={zid} elegir={elegirZona} />
              <div className="scan-leg" aria-hidden="true">
                <span>
                  <i className="dot st-pend" />
                  Sin revisar
                </span>
                <span>
                  <i className="dot st-clear" />
                  Sin antecedentes
                </span>
                <span>
                  <i className="dot st-hit" />
                  Con antecedentes
                </span>
              </div>
            </div>
          </div>
          <div className="pre-side">
            <div className="zchips" role="group" aria-label="Zonas del cuerpo">
              {ZONAS.map((z) => {
                const d = zonaDe(p, per.id, z.id);
                const n = d?.it ? Object.keys(d.it).length : 0;
                const s = estados[z.id];
                return (
                  <button
                    key={z.id}
                    type="button"
                    className={`zc st-${s}${z.id === zid ? " on" : ""}`}
                    aria-pressed={z.id === zid}
                    onClick={() => elegirZona(z.id)}
                  >
                    <i className="dot" aria-hidden="true" />
                    <span aria-hidden="true">{z.icono}</span> {z.nombre}
                    {n > 0 && <b>{n}</b>}
                    <span className="sr">
                      {s === "hit" ? ", con antecedentes" : s === "clear" ? ", sin antecedentes" : ", sin revisar"}
                    </span>
                  </button>
                );
              })}
            </div>
            <div ref={panel}>
              <PanelZona
                p={p}
                pid={per.id}
                zid={zid}
                etiqueta={etiqueta}
                actualizar={actualizar}
                avisar={avisar}
                zonaLimpia={zonaLimpia}
                resto={resto}
                mover={(dir) => setZid(otraZona(p, per.id, zid, dir))}
              />
            </div>
          </div>
        </div>
      )}

      <Resumen p={p} ir={(id, z) => { elegirPersona(id, z); ver(panel); }} />

    </div>
  );
}

function EditarPersona({
  p,
  idx,
  actualizar,
  alQuitar,
}: {
  p: Prospecto;
  idx: number;
  actualizar: Props["actualizar"];
  alQuitar: () => void;
}) {
  const per = personasDe(p)[idx];
  const base = useId();
  const set = (campo: CampoPersona, v: string) => actualizar((x) => editarPersona(x, per.id, campo, v));
  return (
    <>
      <div className="pedit">
        {idx > 0 && (
          <>
            <div className="f">
              <label htmlFor={base + "r"}>
                <span>Rol</span>
              </label>
              <select id={base + "r"} value={per.rol} onChange={(e) => set("rol", e.target.value)}>
                {ROLES_PERSONA.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="f">
              <label htmlFor={base + "n"}>
                <span>Nombre</span>
              </label>
              <input id={base + "n"} type="text" value={per.nombre} onChange={(e) => set("nombre", e.target.value)} />
            </div>
          </>
        )}
        <div className="f">
          <label htmlFor={base + "e"}>
            <span>Edad</span>
          </label>
          <input
            id={base + "e"}
            type="number"
            inputMode="numeric"
            min={0}
            max={120}
            value={per.edad}
            onChange={(e) => set("edad", e.target.value)}
          />
        </div>
        <div className="f">
          <label htmlFor={base + "s"}>
            <span>Sexo</span>
          </label>
          <select id={base + "s"} value={per.sexo} onChange={(e) => set("sexo", e.target.value)}>
            <option value="">—</option>
            <option>Mujer</option>
            <option>Hombre</option>
          </select>
        </div>
        <div className="f">
          <label htmlFor={base + "t"}>
            <span>Talla</span>
          </label>
          <div className="con-unidad">
            <input
              id={base + "t"}
              type="text"
              inputMode="decimal"
              placeholder={per.tallaU === "cm" ? "170" : "1,70"}
              value={per.talla ?? ""}
              onChange={(e) => set("talla", e.target.value)}
            />
            <select aria-label="Unidad de la talla" value={per.tallaU ?? "m"} onChange={(e) => set("tallaU", e.target.value)}>
              <option value="m">m</option>
              <option value="cm">cm</option>
            </select>
          </div>
        </div>
        <div className="f">
          <label htmlFor={base + "p"}>
            <span>Peso</span>
          </label>
          <div className="con-unidad">
            <input
              id={base + "p"}
              type="text"
              inputMode="decimal"
              placeholder={per.pesoU === "lb" ? "154" : "70"}
              value={per.peso ?? ""}
              onChange={(e) => set("peso", e.target.value)}
            />
            <select aria-label="Unidad del peso" value={per.pesoU ?? "kg"} onChange={(e) => set("pesoU", e.target.value)}>
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </div>
        </div>
        {idx > 0 && (
          <BotonConfirmar
            armadoTexto="Toca otra vez para quitar"
            onConfirm={() => {
              actualizar((x) => quitarPersona(x, per.id));
              alQuitar();
            }}
          >
            Quitar persona
          </BotonConfirmar>
        )}
      </div>
      <TarjetaIMC per={per} />
      {idx === 0 && (
        <p className="an-note">
          El titular es la persona de la ficha (su edad es la de la misión 1). Ajusta el número de arriba según a quiénes
          va a asegurar.
        </p>
      )}
    </>
  );
}

function PanelZona({
  p,
  pid,
  zid,
  etiqueta,
  actualizar,
  avisar,
  zonaLimpia,
  resto,
  mover,
}: {
  p: Prospecto;
  pid: string;
  zid: string;
  etiqueta: string;
  actualizar: Props["actualizar"];
  avisar: (m: string) => void;
  zonaLimpia: () => void;
  resto: () => void;
  mover: (dir: 1 | -1) => void;
}) {
  const Z = ZONA_BY[zid];
  const per = personasDe(p).find((x) => x.id === pid)!;
  const d = zonaDe(p, pid, zid);
  const it = d?.it ?? {};
  const hit = estadoZona(d) === "hit";
  const pend = zonasPendientes(p, pid);
  const base = useId();
  return (
    <div className="zp">
      <div className="zp-head">
        <span className="zp-ic" aria-hidden="true">
          {Z.icono}
        </span>
        <div>
          <h3>{Z.nombre}</h3>
          <p>{Z.pista}</p>
        </div>
      </div>
      <p className="an-note">
        Declarando para: <b>{etiqueta}</b>
      </p>
      {Z.grupos
        .filter((g) => grupoVisible(g, per))
        .map((g, gi) => (
          <div key={gi}>
            {g.titulo && <h4 className="gt">{g.titulo}</h4>}
            <div className="checks">
              {g.condiciones.map((c) => {
                const x = it[c.id];
                const on = !!x;
                return (
                  <div className="cond" key={c.id}>
                    <label className={"ck" + (on ? " on" : "")}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => {
                          actualizar((q) => marcarCondicion(q, pid, zid, c.id, e.target.checked));
                          if (e.target.checked) avisar("+2 XP");
                        }}
                      />
                      <span>{c.l}</span>
                    </label>
                    {on && (
                      <div className="cond-d">
                        <label>
                          <small>Año</small>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1930}
                            max={2100}
                            value={x.a ?? ""}
                            onChange={(e) => actualizar((q) => detalleCondicion(q, pid, zid, c.id, "a", e.target.value))}
                          />
                        </label>
                        <label>
                          <small>Estado</small>
                          <select
                            value={x.e ?? ""}
                            onChange={(e) => actualizar((q) => detalleCondicion(q, pid, zid, c.id, "e", e.target.value))}
                          >
                            <option value="">Elegir…</option>
                            {ESTADOS_CONDICION.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </label>
                        <label className="w">
                          <small>Tratamiento o medicación</small>
                          <input
                            type="text"
                            value={x.t ?? ""}
                            onChange={(e) => actualizar((q) => detalleCondicion(q, pid, zid, c.id, "t", e.target.value))}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      <div className="f" style={{ marginTop: 12 }}>
        <label htmlFor={base + "o"}>
          <span>Otra condición o antecedente en esta zona</span>
        </label>
        <input
          id={base + "o"}
          type="text"
          value={d?.otra ?? ""}
          placeholder="Cirugías, estudios pendientes, secuelas…"
          onChange={(e) => actualizar((q) => setOtra(q, pid, zid, e.target.value))}
        />
      </div>
      <div className="zp-actions">
        <button type="button" className="btn ghost small" onClick={() => mover(-1)}>
          ← Anterior
        </button>
        {!hit && (
          <button type="button" className={"btn small" + (d?.ok ? " ghost" : "")} onClick={zonaLimpia}>
            {d?.ok ? "Sin antecedentes ✓ (desmarcar)" : "Sin antecedentes en esta zona"}
          </button>
        )}
        <button type="button" className="btn ghost small" onClick={() => mover(1)}>
          Siguiente →
        </button>
      </div>
      {hitsPersona(p, pid) > 0 && pend > 0 && (
        <div className="zp-rest">
          <BotonConfirmar armadoTexto="Toca otra vez: confirma que el resto no tiene nada" onConfirm={resto}>
            El resto sin antecedentes ({pend} zonas)
          </BotonConfirmar>
        </div>
      )}
    </div>
  );
}

function Resumen({ p, ir }: { p: Prospecto; ir: (pid: string, zid: string) => void }) {
  return (
    <div className="psum">
      <h3>Resumen de la declaración</h3>
      {preResumen(p).map((x) =>
        x.sinPre ? (
          <div className="psum-p" key={x.pid}>
            <b>{x.etiqueta}</b>
            <small>
              {x.persona} · sin preexistencias ✓{x.imc && ` · ${x.imc}`}
            </small>
          </div>
        ) : (
          <div className="psum-p" key={x.pid}>
            <b>{x.etiqueta}</b>
            <small>
              {x.persona} · {x.con.length} con antecedentes · {x.clear} sin antecedentes · {x.pend.length} pendientes
              {x.imc && ` · ${x.imc}`}
            </small>
            {x.con.length > 0 && (
              <ul className="an-list">
                {x.con.map((z) => (
                  <li key={z.zona}>
                    <b>{z.zona}:</b>{" "}
                    {z.items.map((i) => i.c + (i.a ? ` (${i.a})` : "") + (i.e ? " · " + i.e.toLowerCase() : "")).join("; ")}
                  </li>
                ))}
              </ul>
            )}
            {x.pend.length > 0 && (x.con.length > 0 || x.clear > 0) ? (
              <>
                <p className="an-note" style={{ marginTop: 8 }}>
                  Por revisar:
                </p>
                <div>
                  {x.pend.map((z) => (
                    <button type="button" key={z.id} className="pz" onClick={() => ir(x.pid, z.id)}>
                      {z.n}
                    </button>
                  ))}
                </div>
              </>
            ) : x.pend.length ? (
              <p className="an-note" style={{ marginTop: 8 }}>
                Aún sin responder.
              </p>
            ) : (
              <p className="an-note" style={{ marginTop: 8 }}>
                Escaneo completo. ✓
              </p>
            )}
          </div>
        ),
      )}
    </div>
  );
}

/** IMC de la persona: valor, rango en una escala de colores y factor de riesgo si aplica. */
function TarjetaIMC({ per }: { per: Persona }) {
  const r = imcPersona(per);
  if (!r) {
    if (!per.talla?.trim() && !per.peso?.trim()) return null;
    return <p className="an-note">Escribe la talla y el peso para calcular el IMC.</p>;
  }
  return (
    <section className={"imc" + (r.nivel ? " imc-" + r.nivel : "")} aria-label="Índice de masa corporal">
      <div className="imc-cifra">
        <b>{r.valor.toLocaleString("es-EC")}</b>
        <span>
          <small>IMC</small>
          {r.rango}
        </span>
      </div>
      {r.nivel && (
        <div className="imc-escala" aria-hidden="true">
          {RANGOS_IMC.slice(0, 5).map((x) => (
            <i key={x.nivel} className={"e-" + x.nivel} />
          ))}
          <b style={{ left: `${r.posicion * 100}%` }} />
        </div>
      )}
      {r.factor && (
        <p className="imc-factor">
          <b>Factor de riesgo a tener presente:</b> {r.factor}
        </p>
      )}
      <p className="an-note">{NOTA_IMC}</p>
    </section>
  );
}
