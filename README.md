# Blackjack

Juego de blackjack para el navegador, hecho con HTML, CSS y JavaScript puro. Funciona sin servidor y sin internet: todo se guarda en el `localStorage` del dispositivo. Está pensado principalmente para **celular**.

## Características

- **Un jugador** contra el crupier, con fichas y estadísticas que se guardan solas.
- **Multijugador local**: cada jugador usa su propio teléfono con un código de sala compartido y, al final, todos enseñan el teléfono para definir el ganador.
- **Reglas tradicionales**: pedir, plantarse, doblar, dividir (hasta 4 manos), seguro y rendirse.
- **Modo claro y oscuro**, con botón para cambiarlo.
- **Color personal** para cada jugador, visible en la verificación final.
- Cartas, fichas e iconos dibujados en **SVG**, sin fuentes externas ni imágenes.
- Guía **Cómo jugar** dentro de la aplicación.

## Cómo abrirlo en VS Code

1. Abre la carpeta `blackjack` con **Archivo > Abrir carpeta**.
2. Abre `index.html` de una de estas formas:
   - Con la extensión **Live Server**: clic derecho sobre `index.html` y **Open with Live Server**.
   - Sin extensiones: doble clic sobre `index.html` para abrirlo en el navegador. Funciona porque los scripts son clásicos (sin módulos `import`).
3. Para probarlo en el celular con Live Server, conecta el teléfono a la misma red y abre la dirección IP de tu computador con el puerto que indica la extensión.

## Estructura

```
blackjack/
├── index.html               # Página, sprite SVG y carga de scripts
├── README.md
├── css/
│   └── estilos.css          # Estilos, tema claro y oscuro, animaciones
├── js/
│   ├── almacenamiento.js    # localStorage: perfil, progreso y partida multijugador
│   ├── aleatorio.js         # Aleatoriedad con semilla: hashTexto, generadorConSemilla, barajar
│   ├── motor.js             # Cartas y reglas de valor (sin DOM)
│   ├── interfaz.js          # Estado de pantalla, piezas SVG, vistas y dibujar()
│   ├── solo.js              # Modo un jugador
│   ├── multi.js             # Modo multijugador
│   └── principal.js         # Acciones generales, eventos y arranque
└── docs/
    └── arquitectura.md      # Documento de diseño original
```

El orden de los scripts en `index.html` importa, porque comparten el mismo ámbito global: `almacenamiento`, `aleatorio`, `motor`, `interfaz`, `solo`, `multi` y `principal`.

## Cómo funciona

- **Un solo objeto de estado por modo**: `progreso` y `juego` en un jugador; `partidaMulti` en multijugador.
- **`dibujar()`** genera el HTML de la pantalla actual (`vistas[pantalla]`) y lo coloca en `#aplicacion`.
- **`acciones`** es un objeto con todas las acciones. Cada botón lleva `data-accion="nombre"` (y a veces `data-valor`), y un único escuchador de clics llama a `acciones[nombre]`. Las acciones se registran con `Object.assign` en `solo.js`, `multi.js` y `principal.js`.
- **Animaciones**: solo las cartas nuevas caen a la mesa (`cartasVistas` recuerda las que ya se dibujaron). Se desactivan con `prefers-reduced-motion`.

## Reglas

| Regla | Valor |
|---|---|
| Baraja (un jugador) | 6 mazos, se vuelve a barajar cuando quedan menos de 52 cartas |
| Valor de las cartas | 2 a 10 su número, J, Q y K valen 10, el As vale 11 o 1 |
| Crupier | Se planta en 17 (también en 17 blando) |
| Blackjack | As y carta de 10 con dos cartas, paga 3 a 2 |
| Doblar | Con las dos primeras cartas, si hay fichas suficientes |
| Dividir | Con dos cartas del mismo valor, hasta 4 manos; con ases solo se recibe una carta por mano |
| Seguro | Se ofrece si el crupier muestra un As, cuesta la mitad de la apuesta y paga 2 a 1 |
| Rendirse | Solo como primera decisión y sin haber dividido; se pierde la mitad de la apuesta |

## Multijugador local

Los teléfonos **no se comunican entre sí**. Lo que une la partida es un código de sala que los jugadores comparten en persona.

1. Un jugador pulsa **Crear juego**. Se genera un código con la fecha y hora, por ejemplo `260928-154210`.
2. Los demás escriben ese código en **Unirme con código**, cada uno con un **nombre distinto**.
3. Todos comparan el recuadro de fecha y hora, marcan **Todos tenemos el mismo código** y pulsan **Entrar**.
4. Cada jugador pide carta o se planta en su teléfono. Quien se pasa de 21 queda eliminado. No se declara ganador automáticamente.
5. Cuando todos están plantados, pulsan **Ya estamos todos plantados** y enseñan el teléfono, que muestra las cartas abiertas y una franja con su color.
6. Cada jugador pulsa **Gané** o **Perdí**.

La baraja de cada jugador sale de `barajaDe(codigo, nombre)`: el mismo código y el mismo nombre dan siempre las mismas cartas, así que recargar la página no cambia la mano.

**Límites conocidos**: cada jugador tiene su propia baraja, por lo que dos jugadores pueden recibir la misma carta. El sistema se basa en la verificación entre jugadores al enseñar los teléfonos, y alguien con conocimientos técnicos podría editar su `localStorage`.

## Datos guardados

| Clave de `localStorage` | Contenido |
|---|---|
| `blackjack:perfil` | Nombre, color y tema (claro, oscuro o vacío para seguir al sistema) |
| `blackjack:solo` | Fichas, ganadas, perdidas, empates y última apuesta |
| `blackjack:multi` | Partida multijugador en curso: código, nombre, cartas pedidas, estado y veredicto |

Para empezar de cero, borra estas claves desde las herramientas del navegador o usa **Abandonar** y **Reiniciar fichas** dentro del juego.

## Personalizar

| Qué cambiar | Dónde |
|---|---|
| Fichas iniciales | `progreso` en `js/almacenamiento.js` y `reiniciarFichas` en `js/solo.js` |
| Valores de las fichas de apuesta | Lista `[10, 25, 50, 100]` en la vista `solo` de `js/interfaz.js` |
| Número de mazos | Bucle de `crearZapato` en `js/solo.js` |
| Colores disponibles | `COLORES` en `js/almacenamiento.js` |
| Paleta clara y oscura | Variables `--fondo`, `--tinta`, `--papel`, `--linea` en `css/estilos.css` |

## Convenciones

- Todo el código (variables, constantes, funciones y clases CSS) está en español.
- Un archivo por responsabilidad. `motor.js` y `aleatorio.js` no tocan el DOM.
- Los datos y textos de la interfaz salen de las vistas en `interfaz.js`.

## Próximos pasos

- Pantalla de estadísticas.
- Historial de manos.
- Instalación como aplicación (PWA) para usarla sin abrir el navegador.
- Pruebas automáticas para `motor.js`, `aleatorio.js` y las reglas de `solo.js`.
