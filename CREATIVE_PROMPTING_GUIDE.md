# Guía de "Prompting Creativo": Cómo pedir funciones "Tremendas"

Entiendo perfectamente a lo que te refieres. Cuando pides "agrega una función", la IA tiende a ir a lo seguro: formularios, listas y botones estándar.

Para obtener resultados como el **3D Hero**, la **Slot Machine** o el **Magic Mirror**, no debes pedir una *funcionalidad*, debes pedir una **Experiencia** basada en una **Metáfora**.

Aquí tienes la "fórmula secreta" para pedir este tipo de componentes.

---

## 1. La Fórmula: Metáfora + Física + "Juice"

Para que algo se sienta "tremendo", debe cumplir estos 3 puntos. Úsalos en tu prompt:

### A. La Metáfora (El "Concepto")
No pidas "un selector de ropa". Pide algo que imite al mundo real o a un videojuego.
*   *Aburrido:* "Un botón para generar outfits aleatorios."
*   *Tremendo:* "Una **Máquina Tragamonedas (Slot Machine)** estilo casino, donde las prendas giran en rodillos y se detienen con un efecto de rebote."
*   *Aburrido:* "Mostrar el clima."
*   *Tremendo:* "Una **Ventana de Vidrio Empañado** que reaccione al clima real (gotas de lluvia resbalando, efecto de escarcha) y cambie el fondo dinámicamente."

### B. La Física (El "Movimiento")
El movimiento lineal es aburrido. Pide explícitamente **físicas**.
*   **Palabras clave:** "Spring physics" (resortes), "Inercia", "Rebote", "Drag & Drop elástico", "Efecto Parallax 3D", "Tilt (inclinación) al mover el mouse".
*   **Técnica:** "Usa `framer-motion` con `type: spring, stiffness: 300` para que se sienta orgánico."

### C. El "Juice" (Los Detalles)
Son los pequeños detalles que dan placer visual.
*   **Palabras clave:** "Partículas al hacer click", "Brillo (Glow) que sigue al mouse", "Efecto de vidrio (Glassmorphism)", "Sonidos de interfaz (Haptics visuales)", "Transiciones fluidas (Morphing)".

---

## 2. Plantilla de Prompt "God-Tier"

Copia y pega esto cuando quieras una nueva función loca:

> **Objetivo:** Quiero crear una nueva experiencia interactiva llamada **"[Nombre Creativo]"**.
>
> **El Concepto (Metáfora):**
> Quiero que funcione como **[Objeto del mundo real o Videojuego]**.
> *(Ejemplo: Como una baraja de cartas, como un radar, como un probador de espejos infinito).*
>
> **Interacciones y Físicas:**
> *   No quiero UI estática. Quiero que se sienta **viva**.
> *   Usa **Framer Motion** para animaciones complejas.
> *   Implementa **[Efecto específico: ej. Parallax 3D, Drag con inercia, Morphing layout]**.
>
> **Estética:**
> *   Usa nuestro sistema **Liquid Glass** al máximo (transparencias, brillos, bordes neón).
> *   Debe tener un factor "WOW" inmediato.
>
> **Ejemplo de lo que imagino:**
> [Describe la acción: "Cuando el usuario arrastra la prenda, esta debe deformarse como si fuera de goma y al soltarla debe rebotar en su lugar..."]

---

## 3. Ejemplos de Ideas para tu App (Para probar ahora)

Aquí tienes 3 ideas "Tremendas" que podrías pedir usando esta lógica:

### Idea A: "El Radar de Tendencias" (Para la sección Explorar)
*   **Concepto:** Un radar tipo sonar militar o sci-fi.
*   **Prompt:** "Crea un **Radar de Estilo** que gire constantemente. Cuando detecte una prenda 'en tendencia', debe aparecer como un punto brillante (blip) en el radar. Al pasar el mouse, el radar se detiene y despliega una tarjeta holográfica con la prenda."

### Idea B: "La Pasarela Infinita" (Para ver Outfits)
*   **Concepto:** Una pasarela de moda en 3D.
*   **Prompt:** "Crea una **Pasarela Virtual** donde los outfits no estén en una lista, sino que 'caminen' hacia el usuario desde el fondo de la pantalla (escala 0 a 1) con un efecto de profundidad 3D y desenfoque de movimiento."

### Idea C: "El Mezclador de ADN" (Para Style DNA)
*   **Concepto:** Tubos de ensayo o hélice de ADN.
*   **Prompt:** "Crea una visualización de **ADN de Estilo** interactiva. Quiero una doble hélice 3D que gire, donde cada 'gen' es un color o marca que uso mucho. El usuario puede girar la hélice con el dedo/mouse para explorar sus estadísticas."

---

## 4. Resumen Técnico para la IA

Si quieres que la IA entienda técnicamente cómo lograr esto, añade esta línea al final:

> *"Utiliza `useMotionValue` y `useTransform` de Framer Motion para interpolar valores basados en el scroll o la posición del mouse. No uses animaciones CSS simples, usa físicas de resorte (springs). Prioriza la interactividad sobre la simplicidad."*
