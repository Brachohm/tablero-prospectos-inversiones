import { enlaceCorreo, enlaceWhatsApp } from "./herramientas";
import { enlaceSMS } from "./mensajes";
import { sinEmojis, tieneEmojis } from "./texto";
import { ficha } from "./test-utils";

describe("sin emojis al enviar", () => {
  it("quita emojis (también con tonos, banderas, uniones y teclas) y arregla espacios", () => {
    expect(sinEmojis("Hola Ana 👋🏽, ¿cómo estás? 😊")).toBe("Hola Ana, ¿cómo estás?");
    expect(sinEmojis("🎯 Lo que buscas: tranquilidad\n✅ Cubre 👨‍👩‍👧 familia 🇪🇨")).toBe("Lo que buscas: tranquilidad\nCubre familia");
    expect(sinEmojis("Paso 1️⃣ listo ❤️")).toBe("Paso 1 listo");
    expect(sinEmojis("Ñandú, ¿sí? ¡Él aquí! $1.200 · 90% → bien")).toBe("Ñandú, ¿sí? ¡Él aquí! $1.200 · 90% → bien");
    expect(tieneEmojis("hola 😊")).toBe(true);
    expect(tieneEmojis("hola")).toBe(false);
  });

  it("WhatsApp, SMS y correo salen sin emojis", () => {
    expect(enlaceWhatsApp("593991234567", "Hola 😊 Ana", false).href).toBe("https://wa.me/593991234567?text=Hola%20Ana");
    expect(enlaceWhatsApp("593991234567", "Hola 😊", true).href).toBe("https://web.whatsapp.com/send?phone=593991234567&text=Hola");
    expect(enlaceSMS(ficha("nuevo", { whatsapp: "0991234567" }), "Hola 🙌 Ana")).toBe("sms:0991234567?body=Hola%20Ana");
    expect(enlaceCorreo("app", "", "a@x.com", "Informe 📄", "Gracias 🙏").href).toBe("mailto:a%40x.com?subject=Informe&body=Gracias");
  });
});
