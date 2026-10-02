/**
 * Post reunión: informe en PDF para descargar y mensaje para WhatsApp o correo.
 *  - Primera reunión: resumen de la ficha, protección hoy, riesgos de su
 *    trabajo y estrategia recomendada; con la segunda reunión agendada y la
 *    solicitud de documentos (cambio de seguro).
 *  - Segunda reunión: la propuesta trabajada y las respuestas a las
 *    objeciones que planteó.
 * Más la calificación de la asesoría.
 */
import { useEffect, useId, useState } from "react";
import { registrarContactoRapido } from "../domain/crm";
import { hoyISO } from "../domain/fechas";
import { numeroWhatsApp, txt } from "../domain/ficha";
import { asuntoPostReunion, informe, NOTA_INFORME, textoPostReunion } from "../domain/informe";
import {
  asuntoPropuesta,
  NOTA_PROPUESTA,
  objecionesDe,
  propuesta,
  textoPropuesta,
} from "../domain/propuesta";
import { OBJECIONES_REUNION } from "../config/objeciones";
import { reunionesDe } from "../domain/ficha";
import { useBiblioteca } from "../store/biblioteca";
import { fmtUSD } from "../domain/oferta";
import { reunionDe } from "../domain/mensajes";
import type { Canal, Prospecto } from "../domain/tipos";
import { FormReunion } from "./Reunion";
import { fotoParaPDF, useFotoPerfil } from "./adjuntos";
import { lugarTexto } from "../domain/reunion";
import { useAjustesPerfil, useArgumentos, useAviso, useEnlaces } from "./hooks";

function descargar(f: File) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(f);
  a.download = f.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function PostReunion({
  p,
  actualizar,
}: {
  p: Prospecto;
  actualizar: (fn: (p: Prospecto) => Prospecto) => void;
}) {
  const enl = useEnlaces();
  const { perfil } = useAjustesPerfil();
  const avisar = useAviso();
  const hoy = hoyISO();
  const id = useId();
  const [ocupado, setOcupado] = useState(false);
  const { planes, docs } = useBiblioteca();
  const { todos: argumentos } = useArgumentos();
  // Tras la segunda reunión, el informe es la propuesta; se puede elegir cuál.
  const [n, setN] = useState<1 | 2>(reunionesDe(p).length >= 2 ? 2 : 1);
  const inf1 = informe(p, perfil, hoy, planes, argumentos);
  const inf2 = propuesta(p, perfil, hoy, planes, argumentos, docs);
  const inf = n === 2 ? inf2 : inf1;
  const oferta = inf.oferta;
  const texto = n === 2 ? textoPropuesta(inf2) : textoPostReunion(inf1);
  const r = reunionDe(p, hoy);
  // La propuesta no necesita otra reunión agendada.
  const agendada = n === 2 || !!(r && r.dias >= 0);
  const objs = objecionesDe(p);
  const enviado = n === 2 ? p.postReunion2 : p.postReunion;
  const wa = numeroWhatsApp(p);

  // Precarga jsPDF para que la descarga sea inmediata.
  useEffect(() => {
    void import("jspdf");
  }, []);

  const registrar = (canal: Canal) =>
    actualizar((x) => ({
      ...registrarContactoRapido(
        x,
        canal,
        hoy,
        Date.now(),
        n === 2 ? "Propuesta (segunda reunión)" : "Informe post reunión",
      ).ficha,
      [n === 2 ? "postReunion2" : "postReunion"]: { fecha: hoy, canal },
    }));

  // Su foto va en el membrete del PDF (si la subió en Configuración → Perfil).
  const fotoYo = useFotoPerfil();
  const pdf = async () => {
    const { informePDF } = await import("./informePdf");
    return informePDF(inf, await fotoParaPDF(fotoYo));
  };

  const soloDescargar = async () => {
    setOcupado(true);
    try {
      descargar(await pdf());
      avisar("Informe descargado");
    } catch {
      avisar("No se pudo generar el PDF");
    } finally {
      setOcupado(false);
    }
  };

  const correo = txt(p, "correo");
  const enlaceCorreo = enl.correo(
    correo,
    n === 2 ? asuntoPropuesta(inf2) : asuntoPostReunion(inf1),
    n === 2 ? textoPropuesta(inf2, false) : textoPostReunion(inf1, false),
  );
  /** Correo: abre el correo listo y descarga el PDF para adjuntarlo. */
  const porCorreo = async () => {
    registrar("Correo");
    avisar("Se abrió tu correo y se descargó el PDF: adjúntalo antes de enviar");
    try {
      descargar(await pdf());
    } catch {
      /* el correo se abre igual */
    }
  };

  const calif =
    typeof p.calificacion?.valor === "number" ? p.calificacion.valor : 0;
  const marcarObjecion = (id: string) =>
    actualizar((x) => {
      const xs = objecionesDe(x);
      return {
        ...x,
        objeciones2: xs.includes(id) ? xs.filter((y) => y !== id) : [...xs, id],
      };
    });

  return (
    <section
      className="miss post-reunion"
      aria-labelledby="t-post"
      id="post-reunion"
    >
      <div className="mh">
        <span className="mnum" aria-hidden="true">
          📝
        </span>
        <h2 id="t-post">Post reunión</h2>
        {enviado?.fecha && <span className="mp">Enviado</span>}
      </div>
      <div className="seg-informe" role="group" aria-label="Qué informe">
        <button type="button" aria-pressed={n === 1} onClick={() => setN(1)}>
          1ª reunión: resumen
        </button>
        <button type="button" aria-pressed={n === 2} onClick={() => setN(2)}>
          2ª reunión: propuesta
        </button>
      </div>
      {n === 1 ? (
        <>
          <p className="an-note">
            Resumen de la ficha, su protección hoy, los riesgos de su trabajo y
            la estrategia recomendada. Sin productos ni tarifas: es el
            compromiso para la segunda reunión.
          </p>

          {agendada && r ? (
            <p className="an-status reunion-aviso">
              Segunda reunión: {r.cuando}
              {r.hora && ` a las ${r.hora}`}
              {lugarTexto(p) && ` · ${lugarTexto(p)}`}
            </p>
          ) : (
            <>
              <FormReunion
                datos={p}
                titulo="Agenda la segunda reunión"
                alGuardar={(cambios) => {
                  actualizar((x) => ({ ...x, ...cambios }));
                  avisar("Segunda reunión agendada: ya puedes enviar el informe");
                }}
              />
              <p className="an-status warn">
                Agenda la segunda reunión: el mensaje le dice que ya está
                agendada.
              </p>
            </>
          )}

          <div className="informe-vista" aria-label="Vista previa del informe">
            <div className="iv-nivel">
              <b>{inf1.nivel}%</b>
              <small>protección hoy</small>
            </div>
            <b>{inf1.estrategia.titulo}</b>
            <span className="tag">{inf1.estrategia.tipo}</span>
            {inf1.riesgos ? (
              <small>
                Riesgos de su trabajo ({inf1.riesgos.ocupacion}) incluidos.
              </small>
            ) : (
              <small className="falta">
                Escribe su ocupación en los datos para sumar los riesgos de su
                trabajo.
              </small>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="an-note">
            La propuesta trabajada y preguntas frecuentes pensadas para lo que
            planteó. Marca sus objeciones: el informe no las nombra, las
            responde como preguntas frecuentes.
          </p>
          <h3 className="sub2">Objeciones que planteó</h3>
          <div
            className="ideas"
            role="group"
            aria-label="Objeciones que planteó"
          >
            {OBJECIONES_REUNION.map((o) => (
              <button
                key={o.id}
                type="button"
                className="chip"
                aria-pressed={objs.includes(o.id)}
                onClick={() => marcarObjecion(o.id)}
              >
                {o.l}
              </button>
            ))}
          </div>
          <div className="f" style={{ marginTop: 10 }}>
            <label htmlFor={id + "otra"}>
              <span>Otra objeción (con sus palabras)</span>
            </label>
            <input
              id={id + "otra"}
              value={String(p.objecionOtra ?? "")}
              onChange={(e) =>
                actualizar((x) => ({ ...x, objecionOtra: e.target.value }))
              }
            />
          </div>
          {inf2.comparativo && (
            <p className={"an-status comparativo-vista " + inf2.comparativo.tipo}>
              💲 Hoy paga {fmtUSD(inf2.comparativo.hoy)} → {fmtUSD(inf2.comparativo.nuevo)} al mes: <b>{inf2.comparativo.titular}</b>
            </p>
          )}
          {inf2.pendiente && (
            <p className="an-status warn">
              Aún no hay propuesta: llena el pre-cierre ("Ya va a contratar") o
              usa un plan al comparar coberturas.
            </p>
          )}
          <div className="informe-vista" aria-label="Vista previa del informe">
            {inf2.productos.map((x) => (
              <b key={x.nombre}>
                {x.nombre}
                {x.mensual !== null ? ` · ${fmtUSD(x.mensual)} al mes` : ""}
              </b>
            ))}
            {inf2.objeciones.length > 0 && (
              <span className="tag">
                {inf2.objeciones.length} preguntas frecuentes
              </span>
            )}
            <small>
              {[
                inf2.gana.length ? `${inf2.gana.length} cosas que gana` : "",
                inf2.productos.some((x) => x.destacados.length || x.bondades.length)
                  ? `resumen gráfico y ${inf2.productos.reduce((a, x) => a + x.bondades.length, 0)} bondades de los planes`
                  : "",
                inf2.riesgos ? "riesgos de su trabajo" : "",
              ]
                .filter(Boolean)
                .join(" · ") || "Propuesta y siguientes pasos."}
            </small>
          </div>
        </>
      )}

      <div className="oferta-vista" aria-label="Nuestra oferta para usted">
        <small>Nuestra oferta para usted · al final del informe, en grande</small>
        <b>🎁 {oferta.nombre}</b>
        <span>{oferta.sueno}</span>
        <small>
          {[
            oferta.prueba.length ? `${oferta.prueba.length} razones` : "",
            `${oferta.esfuerzo.length} cosas que haces por él`,
            oferta.bonos.length ? `${oferta.bonos.length} bonos` : "",
            "garantía y por qué ahora",
            n === 2 && oferta.inversion !== null ? `${fmtUSD(oferta.inversion)} al mes` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </small>
        {!oferta.plan && (
          <small className="falta">
            Sin plan de la Biblioteca: elige uno en el pre-cierre para sumar sus coberturas y beneficios.
          </small>
        )}
      </div>

      <details className="msj-vista">
        <summary>Mensaje que lo acompaña</summary>
        <p className="paso-txt">{texto}</p>
      </details>

      <div
        className="envio envio-informe tres"
        role="group"
        aria-label="Enviar el informe"
      >
        <button
          className="btn ghost"
          disabled={ocupado}
          onClick={() => void soloDescargar()}
        >
          📄 Descargar PDF
        </button>
        {wa && agendada ? (
          <a
            className="btn wa-btn"
            {...enl.wa(wa, texto)}
            rel="noopener noreferrer"
            onClick={() => registrar("WhatsApp")}
          >
            💬 WhatsApp
          </a>
        ) : (
          <button className="btn wa-btn" disabled>
            💬 WhatsApp
          </button>
        )}
        {correo && agendada ? (
          <a
            className="btn sms-btn"
            {...enlaceCorreo}
            rel="noopener noreferrer"
            onClick={() => void porCorreo()}
          >
            📧 Correo
          </a>
        ) : (
          <button className="btn sms-btn" disabled>
            📧 Correo
          </button>
        )}
      </div>
      <p className="an-note">
        Descarga el PDF y adjúntalo en el chat o en el correo que se abre con el
        mensaje (por correo se descarga solo).
      </p>
      {(!wa || !correo) && (
        <p className="an-note">
          {!wa && !correo
            ? 'Escribe su número en "WhatsApp" y su correo en los datos para enviarle el informe.'
            : !wa
              ? 'Escribe su número en "WhatsApp" para enviarle el mensaje.'
              : 'Escribe su correo en los datos para enviarlo por correo.'}
        </p>
      )}

      <h3 className="sub2">Calificación que te dio</h3>
      <div
        className="estrellas"
        role="group"
        aria-label="Calificación de la asesoría"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={calif >= n}
            aria-label={`${n} de 5`}
            onClick={() =>
              actualizar((x) => ({
                ...x,
                calificacion: { valor: n, fecha: hoy },
              }))
            }
          >
            ★
          </button>
        ))}
        <small>{calif ? `${calif} de 5` : "Cuando te responda"}</small>
      </div>
      <p className="an-note">{n === 2 ? NOTA_PROPUESTA : NOTA_INFORME}</p>
    </section>
  );
}
