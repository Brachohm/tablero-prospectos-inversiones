/** Barra de navegación inferior: Inicio, Centro de Gestión, Base de datos y Configuración. */
import { ir, type Ruta } from "./router";

const ITEMS: { id: string; ic: string; l: string; ruta: Ruta }[] = [
  { id: "inicio", ic: "🏠", l: "Inicio", ruta: { v: "tablero", tab: "prospectos" } },
  { id: "gestion", ic: "🎯", l: "Gestión", ruta: { v: "gestion", modo: "uno" } },
  { id: "base", ic: "🗂️", l: "Base de datos", ruta: { v: "base" } },
  { id: "ajustes", ic: "⚙️", l: "Configuración", ruta: { v: "ajustes", sec: "perfil" } },
];

export function Navegacion({ actual }: { actual: string }) {
  return (
    <nav className="nav-inf" aria-label="Secciones">
      {ITEMS.map((x) => (
        <button
          key={x.id}
          type="button"
          aria-current={actual === x.id ? "page" : undefined}
          onClick={() => actual !== x.id && ir(x.ruta, { reemplazar: true })}
        >
          <span aria-hidden="true">{x.ic}</span>
          {x.l}
        </button>
      ))}
    </nav>
  );
}
