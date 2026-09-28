# Blackjack local

Aplicación web de blackjack hecha con HTML, CSS y JavaScript puro. El juego funciona sin backend ni internet; el estado del usuario se guarda en el navegador con `localStorage`.

## Estructura del proyecto

- `index.html`: punto de entrada de la aplicación.
- `assets/css/styles.css`: estilos visuales de la interfaz.
- `assets/js/app.js`: lógica del juego, renderizado y estado.
- `README.md`: documentación del proyecto.

## Cómo probarlo

1. Abre `index.html` directamente en el navegador, o bien sirve la carpeta con un servidor local.
2. Introduce tu nombre y elige un color.
3. Selecciona entre modo un jugador o multijugador.

## Funcionalidades

- Modo un jugador con apuesta, fichas, doblar, dividir y rendirse.
- Modo multijugador local usando un código generado a partir de la fecha y hora.
- Persistencia de perfil y estadísticas en `localStorage`.
- Diseño adaptado a móvil con pantallas y botones para la experiencia del juego.

## Reglas básicas

- El objetivo es llegar a 21 sin pasarse.
- Las cartas del 2 al 10 valen su número.
- J, Q y K valen 10.
- El As vale 11 o 1 según convenga.
- Si el crupier o la mano del jugador supera 21, pierde.

## Nota de desarrollo

La lógica principal está en `assets/js/app.js` y la hoja de estilos central en `assets/css/styles.css`. El HTML solo sirve como contenedor y carga los recursos necesarios.

## Ejecutar localmente con servidor Python

```bash
cd c:\VSCODE\DemoBlack-jack
python -m http.server 8000
```

Luego abre en el navegador:

```text
http://localhost:8000
```


## 7. Arquitectura de código

Un solo proyecto estático, sin dependencias, que se abre desde cualquier dispositivo.

```
blackjack/
├── index.html
├── README.md
└── js/
    ├── storage.js   # leer y guardar en localStorage (con try/catch)
    ├── rng.js       # generador con semilla y barajado
    ├── engine.js    # baraja, valor de la mano, reglas (sin tocar el DOM)
    ├── solo.js      # flujo del modo un jugador
    ├── multi.js     # flujo del modo multijugador
    ├── ui.js        # dibuja pantallas y lee los botones
    └── main.js      # arranque y navegación entre pantallas
```

Principios:

- **`engine.js` no conoce el DOM.** Solo recibe datos y devuelve datos, así se puede probar con facilidad.
- **Un único objeto de estado** que `ui.js` dibuja. Cada acción cambia el estado, lo guarda y vuelve a dibujar.
- Navegación con una variable `pantalla` y una función `mostrar(pantalla)`, sin librerías.
- Cargar los archivos con `<script>` normales. Los módulos ES (`import`) no funcionan si se abre `index.html` directamente desde el archivo (`file://`) en algunos navegadores.

### Funciones principales

| Módulo | Funciones |
|---|---|
| `rng.js` | `xmur3(texto)`, `mulberry32(numero)`, `barajar(cartas, rng)` |
| `engine.js` | `crearBaraja()`, `barajaDe(codigo, nombre)`, `valorMano(mano)`, `seHaPasado(mano)`, `esBlackjack(mano)` |
| `solo.js` | `repartir()`, `pedir()`, `plantarse()`, `doblar()`, `turnoCrupier()`, `resolver()` |
| `multi.js` | `crearCodigo()`, `validarCodigo(texto)`, `crearJuego(nombre)`, `unirse(nombre, codigo)`, `entrar()`, `pedir()`, `plantarse()`, `mostrarTelefonos()`, `darVeredicto(gano)` |
| `storage.js` | `leer(clave, porDefecto)`, `guardar(clave, valor)`, `borrar(clave)` |

## 8. Casos límite

- **Nombre vacío o repetido:** exigir al menos un carácter. En multijugador, dos jugadores con el mismo nombre tendrían la misma baraja, así que se recomienda avisar.
- **Código mal escrito al unirse:** rechazar los códigos con formato inválido o fecha imposible y, si es válido, mostrar la fecha y hora resultantes para que el grupo las compare de inmediato.
- **Entrar sin código o sin confirmar:** el botón Entrar permanece deshabilitado.
- **Recarga a mitad de partida:** se restaura el estado guardado, sin repartir de nuevo.
- **Sin fichas (un jugador):** ofrecer reiniciar la partida.
- **Pasarse de 21 en multijugador:** el jugador queda eliminado, sigue mostrando su mano y el veredicto queda como Perdí.
- **Acabarse la baraja (un jugador):** volver a barajar cuando queden menos de 20 cartas.

## 9. Diseño (pendiente)

Lo que ya está decidido, sin CSS todavía:

- **Prioridad al celular:** pantalla vertical, botones grandes y fáciles de tocar con el pulgar, acciones en la parte inferior.
- El recuadro de fecha y hora y la pantalla de mostrar teléfonos deben verse claros a distancia.
- Etiqueta `viewport` correcta y uso de áreas seguras del teléfono.

## 10. Plan de trabajo

1. `engine.js` y `rng.js` (lógica pura).
2. `storage.js` y el flujo de nombre.
3. Modo un jugador completo.
4. Modo multijugador: sala, partida, mostrar teléfonos y veredicto.
5. Diseño CSS pensado para celular.
6. Extras opcionales: dividir pares, seguro y rendirse.
