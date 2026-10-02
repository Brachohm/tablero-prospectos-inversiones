/**
 * Sincronizar herramientas: deja listos WhatsApp (app del celular o WhatsApp
 * Web en la computadora) y el correo del asesor según su dominio. Desde ese
 * momento todos los envíos de la app abren esas herramientas.
 */
import { useState } from "react";
import { ajustesIniciales, herramientasDe, type Ajustes } from "../domain/ajustes";
import { hoyISO, fmtFecha } from "../domain/fechas";
import {
  bandejaCorreo,
  bandejaWhatsApp,
  nombreProveedor,
  proveedorEfectivo,
  proveedorPorDominio,
  PROVEEDORES,
  usaWeb,
  type Herramientas as H,
  type ModoWhatsApp,
} from "../domain/herramientas";
import { biblioteca } from "../store/biblioteca";
import { esCelular, useAviso } from "./hooks";

function guardarH(guardados: Ajustes | undefined, h: H) {
  const base = guardados ?? ajustesIniciales(Date.now());
  void biblioteca.guardar("ajustes", { ...base, creado: base.creado || Date.now(), herramientas: h });
}

export function Herramientas({ guardados, pendiente }: { guardados: Ajustes | undefined; pendiente: boolean }) {
  const avisar = useAviso();
  const [abierto, setAbierto] = useState(false);
  const h = herramientasDe(guardados);
  const celularG = guardados?.perfil.celular?.trim() ?? "";
  const correoG = guardados?.perfil.correo?.trim() ?? "";
  const celular = esCelular();
  const web = usaWeb(h.modoWhatsApp, celular, h.sinConexion);
  const proveedor = proveedorEfectivo(h, correoG, celular);
  const hoy = hoyISO();
  const listo = !!h.whatsappListo && !!h.correoListo;
  const faltaDato = !celularG || !correoG;
  const set = (x: Partial<H>) => guardarH(guardados, { ...h, ...x });
  const wa = bandejaWhatsApp(web, celularG);
  const mail = bandejaCorreo(proveedor, correoG);

  return (
    <section className="miss herramientas" aria-labelledby="t-herr">
      <div className="mh">
        <span className="mnum" aria-hidden="true">
          🔄
        </span>
        <h2 id="t-herr">Herramientas de envío</h2>
        <span className="mp">{listo ? "Listas ✓" : "Por sincronizar"}</span>
      </div>
      <p className="an-note">
        Los mensajes salen por <b>{web ? "WhatsApp Web" : "la app de WhatsApp"}</b> y los correos por{" "}
        <b>{nombreProveedor(proveedor)}</b>. La app no entra a tus cuentas: abre cada herramienta con el mensaje listo y
        tú tocas “Enviar”.
        {celular && !h.sinConexion && " En el celular se abren las apps de WhatsApp y de correo."}
      </p>

      <label className="interruptor">
        <input
          type="checkbox"
          role="switch"
          checked={!!h.sinConexion}
          onChange={(e) => {
            set({ sinConexion: e.target.checked });
            avisar(e.target.checked ? "Modo sin conexión activado" : "Modo sin conexión desactivado");
          }}
        />
        <span>
          <b>Modo sin conexión</b>
          <small>
            Trabaja sin internet: usa las apps de WhatsApp y de correo del celular (envían cuando vuelva la señal). Para
            finalizar la gestión, conéctate a WiFi o datos y haz la copia de seguridad.
          </small>
        </span>
      </label>

      <div className="two">
        <div className="f">
          <label htmlFor="h-wa">
            <span>WhatsApp</span>
          </label>
          <select id="h-wa" disabled={!!h.sinConexion} value={h.modoWhatsApp} onChange={(e) => set({ modoWhatsApp: e.target.value as ModoWhatsApp })}>
            <option value="auto">Automático</option>
            <option value="web">WhatsApp Web</option>
            <option value="app">App del celular</option>
          </select>
          {h.modoWhatsApp === "auto" && <small className="an-note">Web en computadora, app en el celular.</small>}
        </div>
        <div className="f">
          <label htmlFor="h-correo">
            <span>Correo</span>
          </label>
          <select id="h-correo" disabled={!!h.sinConexion} value={h.proveedor} onChange={(e) => set({ proveedor: e.target.value as H["proveedor"] })}>
            <option value="auto">
              Automático{correoG ? `: ${nombreProveedor(proveedorPorDominio(correoG)).split(" /")[0]}` : ""}
            </option>
            {PROVEEDORES.map((x) => (
              <option key={x.id} value={x.id}>
                {x.l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {faltaDato || pendiente ? (
        <p className="an-status warn">
          {faltaDato ? "Escribe tu celular y tu correo y" : "Tienes cambios sin guardar:"} toca “Guardar y actualizar” para
          sincronizar.
        </p>
      ) : (
        <button type="button" className="btn sincronizar" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
          🔄 Sincronizar
        </button>
      )}

      {abierto && !faltaDato && !pendiente && (
        <ol className="sinc-pasos" aria-label="Sincronizar herramientas">
          <li className={h.whatsappListo ? "ok" : ""}>
            <div>
              <b>{web ? "WhatsApp Web" : "WhatsApp"}</b>
              <small>
                {h.whatsappListo
                  ? `Activo desde el ${fmtFecha(h.whatsappListo)}`
                  : web
                    ? "Ábrelo e inicia sesión con el código QR de tu celular. Deja esa pestaña abierta."
                    : "Se abre un chat contigo mismo para probar."}
              </small>
            </div>
            <a
              className="btn small wa-btn"
              href={wa.href}
              target={wa.target}
              rel="noopener noreferrer"
              onClick={() => {
                set({ whatsappListo: hoy });
                avisar("WhatsApp activado");
              }}
            >
              {h.whatsappListo ? "Abrir" : "Activar"}
            </a>
          </li>
          <li className={h.correoListo ? "ok" : ""}>
            <div>
              <b>{nombreProveedor(proveedor)}</b>
              <small>
                {h.correoListo
                  ? `Activo desde el ${fmtFecha(h.correoListo)} · ${correoG}`
                  : proveedor === "app"
                    ? "Se abre tu app de correo con un mensaje de prueba."
                    : `Ábrelo e inicia sesión con ${correoG}. Deja esa pestaña abierta.`}
              </small>
            </div>
            <a
              className="btn small sms-btn"
              href={mail.href}
              target={mail.target}
              rel="noopener noreferrer"
              onClick={() => {
                set({ correoListo: hoy });
                avisar("Correo activado");
              }}
            >
              {h.correoListo ? "Abrir" : "Activar"}
            </a>
          </li>
          {listo && <li className="ok final">✓ Listas para la gestión</li>}
        </ol>
      )}
    </section>
  );
}
