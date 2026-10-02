/**
 * "Tus datos": todo vive solo en este dispositivo. La copia de seguridad
 * (JSON) sirve para respaldar y para pasar las fichas entre el celular y la
 * computadora; al restaurar, por ficha gana la versión más reciente.
 */
import { useEffect, useRef, useState } from "react";
import { exportarCSV } from "../domain/csv";
import { diasHasta, hoyISO } from "../domain/fechas";
import { pedirPersistencia } from "../store/almacen";
import { useFichas } from "../store/store";
import {
  compartirCopia,
  descargarCopia,
  descargarTexto as descargar,
  importarCopia,
  leerUltimaCopia as leerUltima,
  leerUltimaCopia,
  puedeCompartirArchivos,
} from "./copia";
import { useAviso } from "./hooks";

export function Respaldo() {
  const items = useFichas();
  const avisar = useAviso();
  const archivo = useRef<HTMLInputElement>(null);
  const [protegido, setProtegido] = useState<boolean | null>(null);
  const [ultima, setUltima] = useState<number | null>(leerUltima);
  const [compartible] = useState(puedeCompartirArchivos);

  useEffect(() => {
    void pedirPersistencia().then(setProtegido);
  }, []);

  const hoy = hoyISO();
  const diasSinCopia = ultima ? -diasHasta(hoyISO(new Date(ultima)), hoy) : null;
  const recordar = items.length > 0 && (diasSinCopia === null || diasSinCopia >= 7);
  const exportarJSON = async () => {
    if (!items.length) return avisar("Aún no hay fichas para respaldar");
    await descargarCopia();
    setUltima(leerUltimaCopia());
    avisar("Copia de seguridad descargada");
  };

  const compartir = async () => {
    if (!items.length) return avisar("Aún no hay fichas para enviar");
    const r = await compartirCopia();
    if (r === "ok") setUltima(leerUltimaCopia());
    if (r === "error") avisar("No se pudo compartir; usa Descargar");
  };

  const exportarCsv = () => {
    if (!items.length) return avisar("Aún no hay fichas para exportar");
    descargar(`prospectos-saludsa-${hoy}.csv`, exportarCSV(items), "text/csv;charset=utf-8");
  };

  const importar = async (f: File | undefined) => {
    if (!f) return;
    const r = await importarCopia(f);
    if (archivo.current) archivo.current.value = "";
    avisar(r.msg);
  };

  return (
    <section className="respaldo" aria-labelledby="t-respaldo">
      <h2 id="t-respaldo">Tus datos</h2>
      <p>
        Se guardan solo en este dispositivo y nunca salen a internet
        {protegido === true && "; el navegador no los borrará para liberar espacio"}
        {protegido === false && ". El navegador podría borrarlos si le falta espacio: haz copias seguido"}.{" "}
        {ultima
          ? `Última copia de seguridad: ${diasSinCopia === 0 ? "hoy" : `hace ${diasSinCopia} días`}.`
          : "Aún no has hecho una copia de seguridad."}
      </p>
      {recordar && (
        <p className="an-status warn" style={{ marginBottom: 10 }}>
          Haz una copia de seguridad: es tu respaldo si pierdes o cambias el celular.
        </p>
      )}
      <div className="actions">
        {compartible && (
          <button className="btn small" onClick={() => void compartir()}>
            Enviar a mi otro dispositivo
          </button>
        )}
        <button className={"btn small" + (compartible ? " ghost" : "")} onClick={() => void exportarJSON()}>
          Descargar copia de seguridad
        </button>
        <button className="btn ghost small" onClick={() => archivo.current?.click()}>
          Restaurar copia
        </button>
        <button className="btn ghost small" onClick={exportarCsv}>
          Exportar CSV
        </button>
      </div>
      <details className="pasar">
        <summary>¿Cómo paso mis fichas del celular a la computadora (o al revés)?</summary>
        <ol>
          <li>
            En el dispositivo donde están las fichas, toca <b>{compartible ? "Enviar a mi otro dispositivo" : "Descargar copia de seguridad"}</b>
            {compartible ? " y mándatela por WhatsApp, correo o Drive." : " y pasa el archivo al otro dispositivo (correo, WhatsApp, Drive o cable)."}
          </li>
          <li>
            En el otro dispositivo, abre la app, toca <b>Restaurar copia</b> y elige ese archivo.
          </li>
          <li>Se juntan las fichas: de cada una queda la versión editada más recientemente. No se borra nada.</li>
          <li>
            La copia lleva también tus contactos nuevos, tu configuración (perfil y mensajes) y tus planes y argumentos de
            la Biblioteca. Los PDF y los adjuntos de los mensajes no viajan en la copia: cárgalos de nuevo en el otro
            dispositivo.
          </li>
        </ol>
        <p>
          Una ficha que eliminaste en un dispositivo vuelve a aparecer si restauras una copia hecha antes de eliminarla:
          bórrala de nuevo.
        </p>
      </details>
      <input
        ref={archivo}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label="Archivo de copia de seguridad"
        onChange={(e) => void importar(e.target.files?.[0])}
      />
    </section>
  );
}
