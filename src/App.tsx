import { useEffect } from 'react'
import { useEstadoStore } from './store/store'
import { AvisoProvider } from './ui/aviso'
import { Actualizacion } from './ui/Actualizacion'
import { BibliotecaVista } from './ui/Biblioteca'
import { AjustesVista } from './ui/Ajustes'
import { BaseDatos } from './ui/BaseDatos'
import { GestionVista } from './ui/Gestion'
import { Navegacion } from './ui/Navegacion'
import { Ficha, FichaNueva } from './ui/Ficha'
import { leerRuta, useHash } from './ui/router'
import { Tablero } from './ui/Tablero'

export default function App() {
  const hash = useHash()
  const { listo, errorGuardado } = useEstadoStore()
  const r = leerRuta(hash)
  const clave = r.v === 'ficha' ? 'f' + r.id : r.v === 'nueva' ? 'n' + r.tipo + (r.ref ?? '') + (r.contacto ?? '') : r.v === 'biblioteca' ? 'b' : r.v === 'ajustes' ? 'a' : r.v === 'gestion' ? 'g' : r.v === 'base' ? 'd' : 't'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [clave])

  if (!listo) return <p className="cargando" role="status">Cargando tus fichas…</p>

  return (
    <AvisoProvider>
      {errorGuardado && (
        <p className="banner err" role="alert">
          No se pudo guardar en este dispositivo. Tus cambios siguen en pantalla: exporta una copia de seguridad antes de cerrar la app.
        </p>
      )}
      <Actualizacion />
      {r.v === 'tablero' && <Tablero tab={r.tab} />}
      {r.v === 'ficha' && <Ficha key={clave} id={r.id} />}
      {r.v === 'nueva' && <FichaNueva key={clave} tipo={r.tipo} refId={r.ref} contactoId={r.contacto} />}
      {r.v === 'biblioteca' && <BibliotecaVista sec={r.sec} />}
      {r.v === 'ajustes' && <AjustesVista sec={r.sec} />}
      {r.v === 'gestion' && <GestionVista modo={r.modo} />}
      {r.v === 'base' && <BaseDatos />}
      {(r.v === 'tablero' || r.v === 'gestion' || r.v === 'base' || r.v === 'ajustes' || r.v === 'biblioteca') && (
        <Navegacion actual={r.v === 'tablero' ? 'inicio' : r.v === 'biblioteca' ? 'ajustes' : r.v} />
      )}
    </AvisoProvider>
  )
}
