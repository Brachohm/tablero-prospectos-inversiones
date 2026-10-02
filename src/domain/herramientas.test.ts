import { errorPerfil } from "./ajustes";
import {
  bandejaCorreo,
  bandejaWhatsApp,
  enlaceCorreo,
  enlaceWhatsApp,
  firma,
  proveedorDe,
  proveedorPorDominio,
  usaWeb,
} from "./herramientas";

describe("herramientas de envío", () => {
  it("elige el correo según el dominio", () => {
    expect(proveedorPorDominio("bracho@gmail.com")).toBe("gmail");
    expect(proveedorPorDominio("b@hotmail.com")).toBe("outlook");
    expect(proveedorPorDominio("b@outlook.es")).toBe("outlook");
    expect(proveedorPorDominio("b@yahoo.com.ec")).toBe("yahoo");
    expect(proveedorPorDominio("b@saludsa.com.ec")).toBe("app");
    // Un dominio de empresa puede usar Microsoft 365 o Google Workspace: se elige a mano.
    expect(proveedorDe({ modoWhatsApp: "auto", proveedor: "office" }, "b@empresa.com")).toBe("office");
  });

  it("arma el correo en Gmail, Outlook, Yahoo o la app", () => {
    expect(enlaceCorreo("gmail", "yo@gmail.com", "ana@x.com", "Hola", "Texto")).toEqual({
      href: "https://mail.google.com/mail/?view=cm&fs=1&authuser=yo%40gmail.com&to=ana%40x.com&su=Hola&body=Texto",
      target: "correo",
    });
    expect(enlaceCorreo("outlook", "", "ana@x.com", "A", "B").href).toBe(
      "https://outlook.live.com/mail/0/deeplink/compose?to=ana%40x.com&subject=A&body=B",
    );
    expect(enlaceCorreo("office", "", "a@x.com", "A", "B").href).toMatch(/^https:\/\/outlook\.office\.com\/mail\/deeplink\/compose\?to=/);
    expect(enlaceCorreo("yahoo", "", "a@x.com", "A", "B").href).toMatch(/^https:\/\/compose\.mail\.yahoo\.com\//);
    expect(enlaceCorreo("app", "", "a@x.com", "A", "B")).toEqual({ href: "mailto:a%40x.com?subject=A&body=B" });
    expect(bandejaCorreo("gmail", "yo@gmail.com").href).toBe("https://mail.google.com/mail/?authuser=yo%40gmail.com");
  });

  it("WhatsApp Web en computadora y la app en el celular (en automático)", () => {
    expect(usaWeb("auto", false)).toBe(true);
    expect(usaWeb("auto", true)).toBe(false);
    expect(usaWeb("app", false)).toBe(false);
    expect(usaWeb("web", false)).toBe(true);
    expect(enlaceWhatsApp("593991234567", "Hola Ana", true)).toEqual({
      href: "https://web.whatsapp.com/send?phone=593991234567&text=Hola%20Ana",
      target: "whatsapp",
    });
    expect(enlaceWhatsApp("593991234567", "", false).href).toBe("https://wa.me/593991234567");
    expect(bandejaWhatsApp(false, "099 111 2233").href).toMatch(/^https:\/\/wa\.me\/593991112233\?text=Prueba/);
  });

  it("firma y validación del perfil", () => {
    expect(firma({ nombreCompleto: "Bradley H.", apodo: "Brad", rol: "asesor de SaludSA", celular: "0991234567", correo: "b@gmail.com" })).toBe(
      "Bradley H.\nasesor de SaludSA\nWhatsApp: 0991234567\nb@gmail.com",
    );
    const base = { nombreCompleto: "", apodo: "Brad", rol: "" };
    expect(errorPerfil({ ...base, celular: "0991" })).toBe("Revisa tu número de celular");
    expect(errorPerfil({ ...base, correo: "brad@" })).toBe("Revisa tu correo electrónico");
    expect(errorPerfil({ ...base, celular: "099 123 4567", correo: "brad@gmail.com" })).toBe("");
  });
});
