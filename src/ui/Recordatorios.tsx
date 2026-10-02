/**
 * Aviso del Inicio: recordatorio 2 de las reuniones, con máximo una hora de
 * anticipación. Muestra las que toca enviar ya y las que se habilitan más
 * tarde hoy. Sirve para fichas y para contactos del Centro de Gestión.
 */
import { registrarContactoRapido } from "../domain/crm";
import { hoyISO } from "../domain/fechas";
import { gestionables, type Gestionable } from "../domain/gestion";
import { enlaceSMS, reunionDe, textoRecordatorio2 } from "../domain/mensajes";
import { numeroWhatsApp } from "../domain/ficha";
import { estadoRecordatorios, horaDe, lugarTexto, marcarRecordatorio } from "../domain/reunion";
import type { ContactoNuevo } from "../domain/contactos";
import type { Canal } from "../domain/tipos";
import { biblioteca, useBiblioteca } from "../store/biblioteca";
import { store, useFichas } from "../store/store";
import { useAhora, useAjustesPerfil, useAviso, useEnlaces } from "./hooks";
import { ir } from "./router";

function marcar(g: Gestionable, canal: Canal, ahora: number) {
  if (g.tipo === "ficha") {
    store.actualizar(g.id, (x) => ({
      ...registrarContactoRapido(x, canal, hoyISO(), ahora, "Recordatorio 2 de reunión").ficha,
      ...marcarRecordatorio(x, 2, ahora),
    }));
    return;
  }
  const c = biblioteca.getEstado().contactos.find((x) => x.id === g.id);
  if (c) void biblioteca.guardar("contactos", { ...c, ...marcarRecordatorio(c as unknown as Record<string, unknown>, 2, ahora) } as ContactoNuevo);
}

export function RecordatoriosReunion() {
  const items = useFichas();
  const { contactos } = useBiblioteca();
  const { perfil } = useAjustesPerfil();
  const enl = useEnlaces();
  const avisar = useAviso();
  const ahora = useAhora();
  const hoy = hoyISO();

  const lista = gestionables(items, contactos)
    .map((g) => ({ g, r: reunionDe(g.ficha, hoy), e: estadoRecordatorios(g.ficha, ahora) }))
    .filter((x) => x.r && x.r.dias === 0 && x.e.desdeR2 !== null && x.e.r2 === null && (x.e.minutos ?? -1) >= 0)
    .sort((a, b) => a.e.desdeR2! - b.e.desdeR2!);
  const ya = lista.filter((x) => x.e.tocaR2);
  const luego = lista.filter((x) => !x.e.tocaR2);
  if (!lista.length) return null;

  return (
    <section className={"recordatorios-hoy" + (ya.length ? " urgente" : "")} aria-label="Recordatorios de reunión">
      <h2>
        <span aria-hidden="true">⏰</span> Recordatorio 2 de tus reuniones
      </h2>
      {ya.map(({ g, r, e }) => {
        const texto = textoRecordatorio2(g.ficha, hoy, perfil) ?? "";
        const wa = numeroWhatsApp(g.ficha);
        const sms = enlaceSMS(g.ficha, texto);
        return (
          <article key={g.id} className="rec-hoy" aria-label={`Recordatorio para ${g.nombre}`}>
            <div>
              <b>{g.nombre}</b>
              <small>
                Reunión a las {r!.hora} · {e.minutos! <= 0 ? "ya empieza" : `en ${e.minutos} min`}
                {lugarTexto(g.ficha) && ` · ${lugarTexto(g.ficha)}`}
              </small>
            </div>
            <div className="rec-hoy-acc">
              {wa && (
                <a
                  className="btn wa-btn small"
                  {...enl.wa(wa, texto)}
                  rel="noopener noreferrer"
                  aria-label={`Enviar recordatorio 2 por WhatsApp a ${g.nombre}`}
                  onClick={() => {
                    marcar(g, "WhatsApp", Date.now());
                    avisar(`Recordatorio 2 enviado a ${g.nombre}`);
                  }}
                >
                  💬 Enviar
                </a>
              )}
              {sms && (
                <a
                  className="btn sms-btn small"
                  href={sms}
                  aria-label={`Enviar recordatorio 2 por SMS a ${g.nombre}`}
                  onClick={() => {
                    marcar(g, "SMS", Date.now());
                    avisar(`Recordatorio 2 enviado a ${g.nombre}`);
                  }}
                >
                  ✉️ SMS
                </a>
              )}
              {!wa && !sms && g.tipo === "ficha" && (
                <button type="button" className="btn ghost small" onClick={() => ir({ v: "ficha", id: g.id })}>
                  Sin número: abrir ficha
                </button>
              )}
            </div>
          </article>
        );
      })}
      {luego.length > 0 && (
        <p className="an-note">
          Más tarde hoy: {luego.map(({ g, e }) => `${g.nombre} (envíalo desde las ${horaDe(e.desdeR2!)})`).join(" · ")}
        </p>
      )}
    </section>
  );
}
