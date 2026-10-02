/**
 * Base de datos: cargar un Excel o CSV, reconocer las columnas (nombre, edad,
 * ciudad, contacto, correo), filtrar y agregar los contactos al Centro de
 * Gestión. Abajo, toda la base guardada, con filtros y los contactos soltados.
 */
import { useId, useRef, useState } from "react";
import { ORIGENES } from "../config/ficha";
import { origenContacto } from "../domain/contactos";
import { etapaDe, txt } from "../domain/ficha";
import {
  CAMPOS_IMPORT,
  ciudades,
  contactosDesde,
  clavesExistentes,
  detectarColumnas,
  esDuplicado,
  filtrarRegistros,
  FILTRO_VACIO,
  registros,
  type Celda,
  type FiltroBase,
  type Mapeo,
  type Registro,
} from "../domain/importar";
import { hoyISO } from "../domain/fechas";
import { biblioteca, useBiblioteca } from "../store/biblioteca";
import { store, useFichas } from "../store/store";
import { useAviso } from "./hooks";
import { ir } from "./router";

export function BaseDatos() {
  return (
    <main className="wrap page-top base">
      <header className="gest-top">
        <h1>Base de datos</h1>
        <p>Carga tu Excel, filtra y pásalos al Centro de Gestión. Todo queda solo en este dispositivo.</p>
      </header>
      <Importar />
      <TuBase />
    </main>
  );
}

function Filtros({ f, set, lista }: { f: FiltroBase; set: (f: FiltroBase) => void; lista: string[] }) {
  const id = useId();
  return (
    <div className="filtros-base">
      <div className="f">
        <label htmlFor={id + "q"}>
          <span>Buscar</span>
        </label>
        <input id={id + "q"} type="search" value={f.texto} placeholder="Nombre, número o correo" onChange={(e) => set({ ...f, texto: e.target.value })} />
      </div>
      <div className="two">
        <div className="f">
          <label htmlFor={id + "c"}>
            <span>Ciudad</span>
          </label>
          <select id={id + "c"} value={f.ciudad} onChange={(e) => set({ ...f, ciudad: e.target.value })}>
            <option value="">Todas</option>
            {lista.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="f edades">
          <span>Edad</span>
          <div>
            <input aria-label="Edad mínima" inputMode="numeric" placeholder="desde" value={f.edadMin} onChange={(e) => set({ ...f, edadMin: e.target.value.replace(/\D/g, "") })} />
            <input aria-label="Edad máxima" inputMode="numeric" placeholder="hasta" value={f.edadMax} onChange={(e) => set({ ...f, edadMax: e.target.value.replace(/\D/g, "") })} />
          </div>
        </div>
      </div>
      <div className="chips" role="group" aria-label="Con datos">
        <button className="chip" aria-pressed={f.conContacto} onClick={() => set({ ...f, conContacto: !f.conContacto })}>
          Con celular
        </button>
        <button className="chip" aria-pressed={f.conCorreo} onClick={() => set({ ...f, conCorreo: !f.conCorreo })}>
          Con correo
        </button>
      </div>
    </div>
  );
}

function Importar() {
  const avisar = useAviso();
  const fichas = useFichas();
  const { contactos } = useBiblioteca();
  const input = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState("");
  const [filas, setFilas] = useState<Celda[][] | null>(null);
  const [encabezado, setEncabezado] = useState(0);
  const [mapeo, setMapeo] = useState<Mapeo>({});
  const [f, setF] = useState<FiltroBase>(FILTRO_VACIO);
  const [leyendo, setLeyendo] = useState(false);
  const hoy = hoyISO();

  const cargar = async (file: File | undefined) => {
    if (input.current) input.current.value = "";
    if (!file) return;
    setLeyendo(true);
    try {
      const { leerHoja } = await import("./excel");
      const rows = await leerHoja(file);
      const d = detectarColumnas(rows);
      setFilas(rows);
      setEncabezado(d.fila);
      setMapeo(d.mapeo);
      setArchivo(file.name);
      setF(FILTRO_VACIO);
      if (d.mapeo.nombre === undefined) avisar("No encontré la columna del nombre: elígela abajo");
    } catch {
      avisar("No se pudo leer ese archivo. Usa .xlsx o .csv");
    } finally {
      setLeyendo(false);
    }
  };

  const regs = filas ? registros(filas, encabezado, mapeo, hoy) : [];
  const existentes = clavesExistentes(contactos, fichas);
  const filtrados = filtrarRegistros(regs, f);
  const nuevos = filtrados.filter((r) => !esDuplicado(r, existentes));
  const columnas = filas?.[encabezado]?.map((c, i) => String(c ?? "").trim() || `Columna ${i + 1}`) ?? [];

  const agregar = async () => {
    const lista = contactosDesde(nuevos);
    const n = biblioteca.importar({ contactos: lista });
    await biblioteca.esperarEscrituras();
    avisar(`${n} contactos agregados al Centro de Gestión`);
    setFilas(null);
    setArchivo("");
  };

  return (
    <section className="miss" aria-labelledby="t-importar">
      <h2 className="sub-h" id="t-importar">
        📥 Cargar Excel
      </h2>
      <p className="an-note">
        Columnas que busco: <b>nombre, edad, ciudad, contacto (celular) y correo</b>. Si la edad viene como fecha de
        nacimiento, la calculo.
      </p>
      <div className="actions">
        <button className="btn" disabled={leyendo} onClick={() => input.current?.click()}>
          {leyendo ? "Leyendo…" : archivo ? "Cargar otro archivo" : "Elegir Excel o CSV"}
        </button>
      </div>
      <input
        ref={input}
        type="file"
        hidden
        aria-label="Archivo de Excel o CSV"
        accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        onChange={(e) => void cargar(e.target.files?.[0])}
      />

      {filas && (
        <>
          <p className="an-status" style={{ marginTop: 12 }}>
            {archivo}: {regs.length} contactos con nombre y celular o correo.
          </p>
          <details className="mapeo">
            <summary>Columnas reconocidas</summary>
            <div className="two">
              {CAMPOS_IMPORT.map((c) => (
                <div className="f" key={c.k}>
                  <label htmlFor={"map-" + c.k}>
                    <span>Columna de {c.l.toLowerCase()}</span>
                  </label>
                  <select
                    id={"map-" + c.k}
                    value={mapeo[c.k] ?? ""}
                    onChange={(e) => setMapeo({ ...mapeo, [c.k]: e.target.value === "" ? undefined : Number(e.target.value) })}
                  >
                    <option value="">— No está —</option>
                    {columnas.map((h, i) => (
                      <option key={i} value={i}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </details>
          <Filtros f={f} set={setF} lista={ciudades(regs)} />
          <p className="an-note">
            {filtrados.length} con este filtro · {filtrados.length - nuevos.length} ya están en tu base (no se repiten)
          </p>
          <TablaRegistros rs={filtrados.slice(0, 50)} duplicado={(r) => esDuplicado(r, existentes)} />
          {filtrados.length > 50 && <p className="an-note">Mostrando 50 de {filtrados.length}.</p>}
          <div className="actions">
            <button className="btn" disabled={!nuevos.length} onClick={() => void agregar()}>
              Agregar {nuevos.length} al Centro de Gestión
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function TablaRegistros({ rs, duplicado }: { rs: Registro[]; duplicado?: (r: Registro) => boolean }) {
  if (!rs.length) return <p className="an-note">Nada con este filtro.</p>;
  return (
    <ul className="reg-lista" aria-label="Contactos del archivo">
      {rs.map((r, i) => (
        <li key={i} className={duplicado?.(r) ? "dup" : ""}>
          <b>{r.nombre}</b>
          <span>{[r.edad && `${r.edad} años`, r.ciudad].filter(Boolean).join(" · ")}</span>
          <small>{[r.contacto, r.correo].filter(Boolean).join(" · ")}</small>
          {duplicado?.(r) && <em>Ya está</em>}
        </li>
      ))}
    </ul>
  );
}

type Estado = "Todos" | "En gestión" | "Soltados" | "Prospectos";

interface Fila extends Registro {
  id: string;
  tipo: "contacto" | "ficha";
  origen: string;
  estado: Exclude<Estado, "Todos">;
}

function TuBase() {
  const fichas = useFichas();
  const { contactos } = useBiblioteca();
  const avisar = useAviso();
  const [f, setF] = useState<FiltroBase>(FILTRO_VACIO);
  const [estado, setEstado] = useState<Estado>("Todos");
  const [origen, setOrigen] = useState("Todos");
  const [ver, setVer] = useState(30);

  const filas: Fila[] = [
    ...contactos
      .filter((c) => !c.fichaId)
      .map((c) => ({
        id: c.id,
        tipo: "contacto" as const,
        nombre: c.nombre,
        edad: c.edad,
        ciudad: c.ciudad ?? "",
        contacto: c.celular,
        correo: c.correo,
        origen: origenContacto(c),
        estado: (c.soltado ? "Soltados" : "En gestión") as Fila["estado"],
      })),
    ...fichas.map((p) => ({
      id: p.id,
      tipo: "ficha" as const,
      nombre: txt(p, "nombre"),
      edad: txt(p, "edad"),
      ciudad: txt(p, "ciudad"),
      contacto: txt(p, "whatsapp"),
      correo: txt(p, "correo"),
      origen: txt(p, "origen") || "Otro",
      estado: (p.soltado ? "Soltados" : "Prospectos") as Fila["estado"],
    })),
  ];
  const vis = filtrarRegistros(filas, f)
    .filter((x) => (estado === "Todos" || x.estado === estado) && (origen === "Todos" || x.origen === origen))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const recuperar = (x: Fila) => {
    if (x.tipo === "ficha") store.actualizar(x.id, (p) => ({ ...p, soltado: undefined }));
    else {
      const c = contactos.find((y) => y.id === x.id);
      if (c) void biblioteca.guardar("contactos", { ...c, soltado: undefined });
    }
    avisar(`${x.nombre} volvió al Centro de Gestión`);
  };

  return (
    <section className="miss" aria-labelledby="t-tubase">
      <h2 className="sub-h" id="t-tubase">
        🗂️ Tu base ({filas.length})
      </h2>
      <div className="chips" role="group" aria-label="Estado">
        {(["Todos", "En gestión", "Prospectos", "Soltados"] as Estado[]).map((e) => (
          <button key={e} className="chip" aria-pressed={estado === e} onClick={() => setEstado(e)}>
            {e} {e === "Todos" ? filas.length : filas.filter((x) => x.estado === e).length}
          </button>
        ))}
      </div>
      <div className="f" style={{ marginTop: 10 }}>
        <label htmlFor="base-origen">
          <span>Origen</span>
        </label>
        <select id="base-origen" value={origen} onChange={(e) => setOrigen(e.target.value)}>
          <option>Todos</option>
          {ORIGENES.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>
      <Filtros f={f} set={setF} lista={ciudades(filas)} />
      <p className="an-note">{vis.length} con este filtro</p>
      <ul className="reg-lista" aria-label="Tu base">
        {vis.slice(0, ver).map((x) => (
          <li key={x.tipo + x.id}>
            <b>{x.nombre || "Sin nombre"}</b>
            <span>{[x.edad && `${x.edad} años`, x.ciudad, x.origen].filter(Boolean).join(" · ")}</span>
            <small>{[x.contacto, x.correo].filter(Boolean).join(" · ")}</small>
            <em className={"est " + (x.estado === "Soltados" ? "solt" : "")}>
              {x.tipo === "ficha" && x.estado !== "Soltados" ? etapaDe(fichas.find((p) => p.id === x.id)!) : x.estado}
            </em>
            <div className="reg-acc">
              {x.estado === "Soltados" && (
                <button className="btn ghost small" onClick={() => recuperar(x)}>
                  Recuperar
                </button>
              )}
              {x.tipo === "ficha" && (
                <button className="btn ghost small" onClick={() => ir({ v: "ficha", id: x.id })}>
                  Abrir ficha
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {vis.length > ver && (
        <button className="btn ghost small" style={{ marginTop: 10 }} onClick={() => setVer(ver + 50)}>
          Ver más ({vis.length - ver})
        </button>
      )}
    </section>
  );
}
