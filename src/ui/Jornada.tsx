/**
 * Jornada: "Fin de gestión" (resumen del día, copia de seguridad y registro)
 * y el aviso de inicio de jornada (cargar la copia para trabajar al día).
 */
import { useRef, useState } from "react";
import { ajustesIniciales } from "../domain/ajustes";
import { fmtFecha, hoyISO } from "../domain/fechas";
import { fechaHoyLarga } from "../domain/inicio";
import { agregarJornada, recordarInicio, resumenDia, ultimaJornada, type Jornada } from "../domain/jornada";
import { fmtUSD } from "../domain/oferta";
import { biblioteca, useBiblioteca } from "../store/biblioteca";
import { useFichas } from "../store/store";
import { BotonConfirmar } from "./comunes";
import { compartirCopia, descargarCopia, importarCopia, leerUltimaCopia, puedeCompartirArchivos } from "./copia";
import { useAjustesPerfil, useAviso, useEnLinea } from "./hooks";
import { ir } from "./router";

const CLAVE_INICIO = "tablero-inversiones:inicio-jornada";

function leerInicio(): string | null {
  try {
    return localStorage.getItem(CLAVE_INICIO);
  } catch {
    return null;
  }
}

function marcarInicio(hoy: string) {
  try {
    localStorage.setItem(CLAVE_INICIO, hoy);
  } catch {
    /* sin localStorage: se vuelve a mostrar */
  }
}

/** Aviso al empezar el día: cargar la copia de seguridad más reciente. */
export function InicioJornada() {
  const hoy = hoyISO();
  const avisar = useAviso();
  const { ajustes } = useAjustesPerfil();
  const [visible, setVisible] = useState(() => recordarInicio(leerInicio(), hoy));
  const input = useRef<HTMLInputElement>(null);
  if (!visible) return null;
  const ult = ultimaJornada(ajustes?.jornadas);
  const listo = () => {
    marcarInicio(hoy);
    setVisible(false);
  };
  return (
    <section className="inicio-jornada" aria-labelledby="t-inicio">
      <h2 id="t-inicio">
        <span aria-hidden="true">☀️</span> Antes de empezar
      </h2>
      <p>
        Carga tu copia de seguridad más reciente (la de ayer o la de tu otro dispositivo) para trabajar con la información
        al día.
      </p>
      {ult && (
        <p className="an-note">
          Último fin de gestión: {fmtFecha(ult.fecha)} · {ult.resumen.gestiones} gestiones ·{" "}
          {ult.copia ? "con copia de seguridad" : "sin copia de seguridad"}
        </p>
      )}
      <div className="actions">
        <button className="btn" onClick={() => input.current?.click()}>
          📥 Cargar copia
        </button>
        <button className="btn ghost" onClick={listo}>
          Ya está al día
        </button>
      </div>
      <input
        ref={input}
        type="file"
        hidden
        accept="application/json,.json"
        aria-label="Copia de seguridad para empezar el día"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (input.current) input.current.value = "";
          if (!f) return;
          const r = await importarCopia(f);
          avisar(r.msg);
          if (r.ok) listo();
        }}
      />
    </section>
  );
}

/** Guarda el fin de gestión del día en la Configuración. */
function registrarJornada(hoy: string, resumen: Jornada["resumen"], copia: boolean): Jornada {
  const ahora = Date.now();
  const base = biblioteca.getEstado().ajustes[0] ?? ajustesIniciales(ahora);
  const j: Jornada = { fecha: hoy, ts: ahora, resumen, copia };
  void biblioteca.guardar("ajustes", { ...base, creado: base.creado || ahora, jornadas: agregarJornada(base.jornadas, j) });
  return j;
}

/** Botón del Inicio y la hoja de fin de gestión. */
export function FinGestion() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button className="fin-gestion" onClick={() => setAbierto(true)}>
        <span aria-hidden="true">🏁</span>
        <span>
          <b>Fin de gestión</b>
          <small>Registra tu día y haz la copia de seguridad</small>
        </span>
        <span aria-hidden="true">›</span>
      </button>
      {abierto && <HojaFin cerrar={() => setAbierto(false)} />}
    </>
  );
}

function HojaFin({ cerrar }: { cerrar: () => void }) {
  const items = useFichas();
  const { contactos } = useBiblioteca();
  const { ajustes } = useAjustesPerfil();
  const avisar = useAviso();
  const enLinea = useEnLinea();
  const hoy = hoyISO();
  const r = resumenDia(items, contactos, hoy);
  const [compartible] = useState(puedeCompartirArchivos);
  const copiaHoy = () => {
    const u = leerUltimaCopia();
    return u !== null && hoyISO(new Date(u)) === hoy ? u : null;
  };
  const [copia, setCopia] = useState<number | null>(copiaHoy);
  const sinConexion = !!ajustes?.herramientas?.sinConexion;

  const enviar = async () => {
    const res = await compartirCopia();
    if (res === "ok") setCopia(copiaHoy());
    if (res === "error") avisar("No se pudo compartir; usa Descargar");
  };
  const descargar = async () => {
    await descargarCopia();
    setCopia(copiaHoy());
    avisar("Copia de seguridad descargada");
  };

  const finalizar = () => {
    const j = registrarJornada(hoy, r, copia !== null);
    avisar(`Gestión del día registrada${j.copia ? "" : " (sin copia de seguridad)"}. Mañana, carga tu copia antes de empezar.`);
    cerrar();
  };

  const datos: [number | string, string][] = [
    [r.gestiones, r.gestiones === 1 ? "gestión" : "gestiones"],
    [r.contactosRegistrados, "contactos en el historial"],
    [r.contactosNuevos + r.fichasNuevas, "nuevos (contactos y fichas)"],
    [r.cierres, r.cierres === 1 ? "cierre" : "cierres"],
    ...(r.prima ? ([[fmtUSD(r.prima), "en prima cerrada"]] as [string, string][]) : []),
    [r.reunionesManana, r.reunionesManana === 1 ? "reunión mañana" : "reuniones mañana"],
  ];

  return (
    <div className="hoja-fondo" role="dialog" aria-modal="true" aria-labelledby="t-fin">
      <section className="hoja">
        <div className="hoja-top">
          <h2 id="t-fin">🏁 Fin de gestión</h2>
          <button className="back" onClick={cerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <p className="an-note">{fechaHoyLarga(hoy)}</p>

        <div className="fin-datos" aria-label="Resumen del día">
          {datos.map(([n, l]) => (
            <div key={l}>
              <b>{n}</b>
              <span>{l}</span>
            </div>
          ))}
        </div>
        {r.pendientes > 0 && (
          <p className="an-status warn">
            Quedan {r.pendientes} por gestionar hoy.{" "}
            <button
              type="button"
              className="enlace"
              onClick={() => {
                cerrar();
                ir({ v: "gestion", modo: "uno" });
              }}
            >
              Volver al Centro de Gestión
            </button>{" "}
            o déjalos para mañana.
          </p>
        )}

        <h3 className="sub2">1. Copia de seguridad</h3>
        <p className={"conexion " + (enLinea ? "si" : "no")} role="status">
          {enLinea
            ? sinConexion
              ? "🟢 Ya tienes señal (estás en modo sin conexión): haz la copia ahora."
              : "🟢 Conectado a internet."
            : "🔴 Sin conexión: conéctate a una red WiFi o a tus datos móviles para hacer la copia de seguridad y no perder la información."}
        </p>
        <div className="envio">
          {compartible && (
            <button className="btn" disabled={!enLinea} onClick={() => void enviar()}>
              📤 Enviar copia (Drive, WhatsApp, correo)
            </button>
          )}
          <button className={"btn" + (compartible ? " ghost" : "")} onClick={() => void descargar()}>
            ⬇️ Descargar copia
          </button>
        </div>
        {copia && (
          <p className="an-status">
            ✓ Copia hecha a las {new Date(copia).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}.
            Guárdala donde la encuentres mañana (o en tu otro dispositivo).
          </p>
        )}

        <h3 className="sub2">2. Registrar el día</h3>
        {copia ? (
          <button className="btn finalizar" onClick={finalizar}>
            🏁 Finalizar gestión
          </button>
        ) : (
          <BotonConfirmar className="btn ghost finalizar" armadoTexto="¿Sin copia? Toca otra vez" onConfirm={finalizar}>
            Finalizar sin copia
          </BotonConfirmar>
        )}
      </section>
    </div>
  );
}
