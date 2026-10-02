import { useState } from "react";
import { ETAPA_CERRADO, ETAPA_VENTA, ETAPAS, TIPOS } from "../config/ficha";
import { agenda, clientes, posventaHecha, referidosDe, renovacionCliente, type ItemAgenda } from "../domain/crm";
import { fmtFecha, hoyISO } from "../domain/fechas";
import { etapaDe, tipoDe, txt, vendido } from "../domain/ficha";
import { faltaCierre } from "../domain/cierre";
import { contactoVencido, filtrar, ordenar, type FiltroTipo } from "../domain/lista";
import type { Prospecto } from "../domain/tipos";
import { fichaPct, fichaXp, insignias, resumenTablero } from "../domain/xp";
import { useFichas } from "../store/store";
import { Anillo } from "./comunes";
import { BotonesContacto } from "./Contacto";
import { Objetivo } from "./Objetivo";
import { FinGestion, InicioJornada } from "./Jornada";
import { useAjustesPerfil } from "./hooks";
import { herramientasDe } from "../domain/ajustes";
import { BotonesRecordatorio } from "./Mensajes";
import { recordatorioReunion } from "../domain/mensajes";
import { NuevoContactoRapido, Saludos } from "./Contactos";
import { cola, gestionables } from "../domain/gestion";
import { fechaHoyLarga, fraseDelDia, saludoHora } from "../domain/inicio";
import { ir, type TabTablero } from "./router";
import { useBiblioteca } from "../store/biblioteca";
import { RecordatoriosReunion } from "./Recordatorios";

export function Tablero({ tab }: { tab: TabTablero }) {
  const items = useFichas();
  const { contactos } = useBiblioteca();
  const { perfil, ajustes } = useAjustesPerfil();
  const herr = herramientasDe(ajustes);
  const [hora] = useState(() => new Date().getHours());
  const hoy = hoyISO();
  const r = resumenTablero(items);
  const c = cola(gestionables(items, contactos), hoy);

  const abrir = (id: string) => ir({ v: "ficha", id });

  return (
    <main className="wrap">
      <InicioJornada />
      <section className="hero" aria-label="Tu progreso">
        <p className="hoy-fecha">{fechaHoyLarga(hoy)}</p>
        <h1>
          {saludoHora(hora)}, {perfil.apodo} <span aria-hidden="true">👋</span>
        </h1>
        <p className="frase">“{fraseDelDia(hoy)}”</p>
        <div className="lvl">
          <span className="lvl-badge">
            Nv. {r.nivel.indice + 1} · {r.nivel.nombre}
          </span>
          <div
            className="xpbar"
            role="progressbar"
            aria-label="Experiencia hacia el siguiente nivel"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={r.nivel.pct}
          >
            <i style={{ width: r.nivel.pct + "%" }} />
          </div>
        </div>
        <p className="xpnote">
          {r.xp} XP ·{" "}
          {r.nivel.siguiente ? `te faltan ${r.nivel.faltan} para ${r.nivel.siguiente.nombre}` : "nivel máximo"}
        </p>
        <div className="stats">
          <div className="stat">
            <b>{r.prospectos}</b>
            <span>Prospectos</span>
          </div>
          <div className="stat">
            <b>{r.cierres}</b>
            <span>Cierres</span>
          </div>
          <div className="stat">
            <b>{r.tasa}%</b>
            <span>Tasa de cierre</span>
          </div>
        </div>
      </section>

      <RecordatoriosReunion />

      <button className="cta-gestion" onClick={() => ir({ v: "gestion", modo: "uno" })}>
        <span className="ico" aria-hidden="true">
          🎯
        </span>
        <span>
          <b>Centro de Gestión</b>
          <small>
            {c.pendientes.length
              ? `${c.pendientes.length} por gestionar hoy` + (c.hechos.length ? ` · ${c.hechos.length} hechos` : "")
              : c.hechos.length
                ? `¡Gestionaste ${c.hechos.length} hoy! No quedan pendientes.`
                : "Agrega contactos o carga tu base de datos para empezar."}
          </small>
        </span>
        <span className="go">Empezar ›</span>
      </button>

      <NuevoContactoRapido />

      <FinGestion />

      {!herr.sinConexion && !(herr.whatsappListo && herr.correoListo) && (
        <button className="aviso-sinc" onClick={() => ir({ v: "ajustes", sec: "perfil" })}>
          <span aria-hidden="true">🔄</span>
          <span>
            <b>Sincroniza tus herramientas</b>
            <small>Tu WhatsApp y tu correo, listos para la gestión</small>
          </span>
          <span aria-hidden="true">›</span>
        </button>
      )}

      <Objetivo items={items} hoy={hoy} />

      <Agenda items={items} hoy={hoy} abrir={abrir} />

      <Saludos hoy={hoy} />

      <div className="badges" aria-label="Insignias">
        {insignias(items).map((b) => (
          <div key={b.id} className={"badge" + (b.on ? " on" : "")}>
            <span className="ic" aria-hidden="true">
              {b.ic}
            </span>
            {b.t}
            <span className="sr">{b.on ? " (lograda)" : " (pendiente)"}</span>
          </div>
        ))}
      </div>

      <h2 className="sec">Tus fichas</h2>
      <div className="tabs" role="tablist" aria-label="Lista">
        <button
          role="tab"
          className="tab"
          aria-selected={tab === "prospectos"}
          onClick={() => ir({ v: "tablero", tab: "prospectos" }, { reemplazar: true })}
        >
          Prospectos
        </button>
        <button
          role="tab"
          className="tab"
          aria-selected={tab === "clientes"}
          onClick={() => ir({ v: "tablero", tab: "clientes" }, { reemplazar: true })}
        >
          Cerrados {r.cierres}
        </button>
      </div>

      {tab === "prospectos" ? (
        <ListaProspectos items={items.filter((p) => !vendido(p))} hoy={hoy} abrir={abrir} />
      ) : (
        <ListaClientes items={items} hoy={hoy} abrir={abrir} />
      )}

      <p className="foot">Solo tú ves estas fichas. Copias de seguridad y exportar: Configuración → Datos.</p>
    </main>
  );
}

const ICONO_AGENDA: Record<ItemAgenda["motivo"], string> = {
  contacto: "🔔",
  posventa: "🤝",
  renovacion: "📅",
  renovacionActual: "⏳",
  reunion: "🗓️",
  seguimiento: "🔁",
};

function textoDias(d: number): string {
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  if (d === -1) return "Ayer";
  return d < 0 ? `Hace ${-d} días` : `En ${d} días`;
}

function Agenda({ items, hoy, abrir }: { items: readonly Prospecto[]; hoy: string; abrir: (id: string) => void }) {
  const { perfil } = useAjustesPerfil();
  const a = agenda(items, hoy);
  const porId = new Map(items.map((p) => [p.id, p] as const));
  const total = a.vencidos.length + a.hoy.length + a.semana.length;
  const grupo = (titulo: string, lista: ItemAgenda[], cls = "") =>
    lista.length > 0 && (
      <div className={"ag-g " + cls}>
        <h3>{titulo}</h3>
        {lista.map((x) => {
          const p = porId.get(x.id);
          const titulo2 =
            x.motivo === "contacto"
              ? "Contactar"
              : x.motivo === "posventa"
                ? "Seguimiento a cliente"
                : x.motivo === "reunion"
                  ? "Reunión"
                  : x.motivo === "seguimiento"
                    ? "Seguimiento"
                    : x.motivo === "renovacion"
                      ? "Renovación" + (x.estimada ? " (estimada)" : "")
                      : "Renueva su póliza actual";
          return (
            <div key={x.id + x.motivo} className="ag-fila">
              <button className="ag-it" onClick={() => abrir(x.id)}>
                <span className="ic" aria-hidden="true">
                  {ICONO_AGENDA[x.motivo]}
                </span>
                <span>
                  <b>{(p && txt(p, "nombre")) || "Sin nombre"}</b>
                  <small>
                    {titulo2}
                    {x.detalle && x.motivo !== "renovacion" && x.motivo !== "renovacionActual" ? ` · ${x.detalle}` : ""}
                  </small>
                </span>
                <span className="d">{textoDias(x.dias)}</span>
              </button>
              {p && x.motivo === "reunion" ? (
                <BotonesRecordatorio p={p} texto={recordatorioReunion(p, hoy, perfil) ?? ""} />
              ) : (
                p && <BotonesContacto p={p} />
              )}
            </div>
          );
        })}
      </div>
    );
  return (
    <section className="agenda" aria-label="Agenda">
      <h2>
        <span aria-hidden="true">📋</span> Hoy
        <small>{total ? `${total} ${total === 1 ? "pendiente" : "pendientes"} esta semana` : ""}</small>
      </h2>
      {grupo("Vencidos", a.vencidos, "venc")}
      {grupo("Hoy", a.hoy)}
      {grupo("Esta semana", a.semana)}
      {grupo("Renovaciones próximas", a.proximas)}
      {total + a.proximas.length === 0 && (
        <p className="ag-vacio">Nada pendiente por ahora. Buen momento para prospectar o pedir un referido.</p>
      )}
    </section>
  );
}

function ListaProspectos({ items, hoy, abrir }: { items: Prospecto[]; hoy: string; abrir: (id: string) => void }) {
  const [tipo, setTipo] = useState<FiltroTipo>("Todos");
  const [etapa, setEtapa] = useState("Todos");
  const porTipo = filtrar(items, { tipo, etapa: "Todos" });
  const vis = ordenar(filtrar(items, { tipo, etapa }));
  const etapas = ["Todos", ...ETAPAS.filter((e) => e !== ETAPA_CERRADO && e !== ETAPA_VENTA)];
  const tipos: [FiltroTipo, string][] = [
    ["Todos", "Todos"],
    ["nuevo", "Contratar"],
    ["cambio", "Cambio de seguro"],
  ];
  return (
    <>
      <div className="bar">
        <div className="chips" role="group" aria-label="Filtrar por tipo">
          {tipos.map(([k, l]) => (
            <button key={k} className="chip" aria-pressed={tipo === k} onClick={() => setTipo(k)}>
              {l} {filtrar(items, { tipo: k, etapa: "Todos" }).length}
            </button>
          ))}
        </div>
      </div>
      <div className="bar" style={{ marginTop: 0 }}>
        <div className="chips" role="group" aria-label="Filtrar por etapa">
          {etapas.map((e) => (
            <button key={e} className="chip" aria-pressed={etapa === e} onClick={() => setEtapa(e)}>
              {e} {e === "Todos" ? porTipo.length : porTipo.filter((p) => etapaDe(p) === e).length}
            </button>
          ))}
        </div>
      </div>
      <div className="list">
        {vis.length === 0 ? (
          <div className="empty">
            <b>{items.length ? "Nada con este filtro" : "Tu primera ficha te espera"}</b>
            {items.length
              ? "Cambia el filtro."
              : "Las fichas se abren desde el Centro de Gestión, con “Pasar a reunión”."}
          </div>
        ) : (
          vis.map((p) => {
            const et = etapaDe(p);
            const t = tipoDe(p);
            const prox = txt(p, "prox");
            const vence = contactoVencido(p, hoy);
            const pct = fichaPct(p);
            return (
              <button key={p.id} className="pcard" onClick={() => abrir(p.id)}>
                <Anillo pct={pct} />
                <div>
                  <h3>{txt(p, "nombre") || "Sin nombre"}</h3>
                  <div className="tags">
                    <span className={"tag t-" + t}>{TIPOS[t].n}</span>
                    <span className={"tag " + et}>{et}</span>
                  </div>
                  <p>
                    {prox ? (
                      <span className={vence ? "due" : ""}>
                        {vence ? "⚠ " : ""}Contactar {fmtFecha(prox)}
                      </span>
                    ) : (
                      "Sin próximo contacto"
                    )}
                  </p>
                </div>
                <div className="xp">{fichaXp(p)} XP</div>
              </button>
            );
          })
        )}
      </div>
    </>
  );
}

function ListaClientes({
  items,
  hoy,
  abrir,
}: {
  items: readonly Prospecto[];
  hoy: string;
  abrir: (id: string) => void;
}) {
  const cs = clientes(items)
    .map((p) => ({ p, ren: renovacionCliente(p, hoy) }))
    .sort((a, b) => (a.ren?.fecha ?? "9999").localeCompare(b.ren?.fecha ?? "9999"));
  if (!cs.length)
    return (
      <div className="list" style={{ marginTop: 14 }}>
        <div className="empty">
          <b>Aún no tienes ventas cerradas</b>
          Cuando marques "Venta exitosa" en una ficha, aparece aquí con su plan, sus documentos y su renovación.
        </div>
      </div>
    );
  return (
    <div className="list" style={{ marginTop: 14 }}>
      {cs.map(({ p, ren }) => {
        const pv = posventaHecha(p);
        const refs = referidosDe(items, p.id).length;
        const falta = faltaCierre(p);
        return (
          <button key={p.id} className="pcard" onClick={() => abrir(p.id)}>
            <Anillo pct={Math.round((pv.hechos / pv.total) * 100)} label={`Posventa ${pv.hechos} de ${pv.total}`} />
            <div>
              <h3>{txt(p, "nombre") || "Sin nombre"}</h3>
              <div className="tags">
                <span className={"tag t-" + tipoDe(p)}>{txt(p, "cli_plan") || txt(p, "plan") || "Plan por definir"}</span>
                {refs > 0 && <span className="tag Cerrado">{refs === 1 ? "1 referido" : `${refs} referidos`}</span>}
                {falta.length > 0 ? (
                  <span className="tag falta-doc">Venta exitosa · faltan {falta.length}</span>
                ) : (
                  <span className="tag Cerrado">Cerrado</span>
                )}
              </div>
              <p>
                {ren ? `Renueva ${fmtFecha(ren.fecha)}${ren.estimada ? " (estimada)" : ""}` : "Sin fecha de vigencia"}
              </p>
            </div>
            <div className="xp">
              {pv.hechos}/{pv.total}
            </div>
          </button>
        );
      })}
    </div>
  );
}
