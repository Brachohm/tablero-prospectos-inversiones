/** Panel "Análisis para la propuesta": se calcula en el dispositivo, sin conexión. */
import { sinEmojis } from "../domain/texto";
import { CAUSA_L, comparativo, NIVEL_INFO, textoResumen, vista } from "../domain/analisis";
import { hoyISO } from "../domain/fechas";
import { esCambio } from "../domain/ficha";
import type { Prospecto } from "../domain/tipos";
import { fichaPct } from "../domain/xp";
import { useAviso } from "./hooks";

function Lista({ items, vacio }: { items: string[]; vacio: string }) {
  return (
    <ul className="an-list">
      {items.length ? items.map((x, i) => <li key={i}>{x}</li>) : <li className="none">{vacio}</li>}
    </ul>
  );
}

export function Analisis({ p, actualizar }: { p: Prospecto; actualizar: (fn: (p: Prospecto) => Prospecto) => void }) {
  const avisar = useAviso();
  const hoy = hoyISO();
  const v = vista(p, hoy);
  const ck = esCambio(p);
  const pct = fichaPct(p);
  const hechos = v.local.recs.filter((r) => p.rec?.[r.id]).length;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(sinEmojis(textoResumen(p, hoy)));
      avisar("Resumen copiado");
    } catch {
      avisar("No se pudo copiar");
    }
  };

  const ni = NIVEL_INFO[v.veredicto.nivel];

  return (
    <section className="an-card" aria-label="Análisis para la propuesta" id="analisis">
      <div className="mh">
        <span className="mnum" aria-hidden="true">
          🔍
        </span>
        <h2>Análisis para la propuesta</h2>
        <span className="mp">{pct}% recabado</span>
      </div>
      <div className="mbar">
        <i style={{ width: pct + "%" }} />
      </div>

      <div className="an-sec sinc">
        <h3>
          <i />
          Recomendación sincera
        </h3>
        <div className={"an-verdict v-" + v.veredicto.nivel}>
          <span className="vl">
            {ni.ic} {ni.l}
          </span>
          <b>{v.veredicto.titulo}</b>
          <p>{v.veredicto.razon}</p>
        </div>
      </div>

      {ck && v.causa && (
        <div className="an-sec causa">
          <h3>
            <i />
            ¿De qué se trata realmente?
          </h3>
          <div className="pill-causa">{CAUSA_L[v.causa.tipo]}</div>
          <p className="an-p">{v.causa.explicacion}</p>
          <p className="an-note">
            Producto = rendimiento, costos o servicio. Uso = cómo lo usa o si conoce su inversión. Contratación = plan mal
            elegido para su perfil o mal explicado al inicio.
          </p>
        </div>
      )}

      <div className="an-sec costo">
        <h3>
          <i />
          {ck ? "Costo de oportunidad: lo que está en juego" : "Costo de oportunidad: no tenerlo"}
        </h3>
        <Lista items={v.costo} vacio="Completa la ficha para ver lo que está en juego." />
      </div>

      {ck && (
        <div className="an-sec noc">
          <h3>
            <i />
            Señales para no cambiar
          </h3>
          <Lista items={v.nocambiar} vacio="" />
        </div>
      )}

      <div className="an-sec busca">
        <h3>
          <i />
          Lo que busca
        </h3>
        <Lista items={v.busca} vacio="Aún no hay datos suficientes en la ficha." />
      </div>
      <div className="an-sec evita">
        <h3>
          <i />
          Lo que quiere evitar
        </h3>
        <Lista items={v.evita} vacio="Aún no hay datos suficientes en la ficha." />
      </div>

      {ck && (
        <div className="an-sec cmp">
          <h3>
            <i />
            Comparativo (borrador): hoy vs propuesta
          </h3>
          {comparativo(p).map((r) => (
            <div className="cmp-row" key={r[0]}>
              <b>{r[0]}</b>
              <div>
                <small>Hoy</small>
                {r[1] || "—"}
              </div>
              <div>
                <small>Propuesta</small>
                {r[2]}
              </div>
            </div>
          ))}
          <p className="an-note">Las celdas “validar” se completan con el material oficial de la aseguradora.</p>
        </div>
      )}

      <div className="an-sec rec">
        <h3>
          <i />
          No olvides considerar
          <small>
            {hechos}/{v.local.recs.length} revisados
          </small>
        </h3>
        <div className="checks">
          {v.local.recs.map((r) => {
            const on = !!p.rec?.[r.id];
            return (
              <label key={r.id} className={"ck" + (on ? " on" : "")}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => actualizar((x) => ({ ...x, rec: { ...x.rec, [r.id]: e.target.checked } }))}
                />
                <span>
                  <b>{r.t}</b>
                  <small>{r.d}</small>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="an-sec falta">
        <h3>
          <i />
          Información que falta
        </h3>
        <Lista items={v.local.vacios} vacio="Lo esencial está completo." />
        <p className="an-note">Pregúntalo en tu próximo contacto.</p>
      </div>

      <div className="an-actions">
        <button type="button" className="btn ghost small" onClick={copiar}>
          Copiar resumen
        </button>
      </div>
      <p className="an-note" style={{ marginTop: 12 }}>
        Se calcula con las reglas de la ficha, en tu dispositivo: nada se envía a internet. Es una lectura de apoyo,
        no una decisión: todo lo que dependa de la aseguradora (costos, rescates, fondos, rendimientos) valídalo
        con el material oficial.
      </p>
    </section>
  );
}
