// Estado de la interfaz, piezas SVG, vistas y dibujado de pantallas.
const acciones = {};               // Las acciones se registran en solo.js, multi.js y principal.js
const cartasVistas = new Set();    // Para animar solo las cartas nuevas
const cartasNuevas = [];
let ultimaPantalla, pantallaAnterior = 'menu';
let pantalla = perfil.nombre ? 'menu' : 'inicio';
let juego = null, zapato = [], confirmandoAbandono = false;
let estadoSala = { texto: '', codigo: '', fecha: null, confirmado: false, mensaje: '' };

const seleccionar = selector => document.querySelector(selector);
const escapar = texto => String(texto).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const esOscuro = () => (perfil.tema || (matchMedia('(prefers-color-scheme:dark)').matches ? 'oscuro' : 'claro')) === 'oscuro';

// ---------- Piezas SVG ----------
const icono = nombre => `<svg class="icono" aria-hidden="true"><use href="#icono-${nombre}"/></svg>`;

function dibujarCarta(carta, oculta, clave) {
  const id = clave + (oculta ? '#' : carta.rango + carta.palo);
  const clase = 'carta' + (cartasVistas.has(id) ? '' : ' nueva');
  cartasNuevas.push(id);
  if (oculta) return `<svg class="${clase}" viewBox="0 0 60 84" role="img" aria-label="Carta oculta"><rect x="1" y="1" width="58" height="82" rx="8" fill="var(--acento)"/><path d="M12 14h36M12 26h36M12 38h36M12 50h36M12 62h36M12 74h36" stroke="var(--fondo)" stroke-width="2" opacity=".45"/></svg>`;
  const i = PALOS.indexOf(carta.palo), color = (i === 1 || i === 2) ? 'var(--acento)' : 'var(--tinta)';
  return `<svg class="${clase}" viewBox="0 0 60 84" role="img" aria-label="${carta.rango} ${carta.palo}" style="color:${color}"><rect x=".5" y=".5" width="59" height="83" rx="8" fill="var(--papel)" stroke="var(--linea)"/><text x="7" y="21" font-size="18" font-weight="700" fill="currentColor">${carta.rango}</text><use href="#palo-${i}" x="6" y="25" width="12" height="12" fill="currentColor"/><use href="#palo-${i}" x="17" y="36" width="28" height="28" fill="currentColor"/></svg>`;
}

const dibujarFicha = valor => `<svg class="ficha" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="28" fill="var(--acento)"/><circle cx="30" cy="30" r="21" fill="none" stroke="var(--fondo)" stroke-width="3" stroke-dasharray="6 5"/><text x="30" y="36" text-anchor="middle" font-size="16" font-weight="700" fill="var(--fondo)">${valor}</text></svg>`;

const LOGOTIPO = `<svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="var(--acento)"/><use href="#palo-0" x="5" y="5" width="14" height="14" fill="#fff"/></svg>`;

const portada = () => `<svg class="portada" viewBox="0 0 300 200" role="img" aria-label="Dos cartas y dos fichas"><circle cx="150" cy="105" r="88" fill="var(--acento)" opacity=".12"/><circle cx="150" cy="105" r="100" fill="none" stroke="var(--acento)" stroke-width="2" stroke-dasharray="3 9" stroke-linecap="round" opacity=".5"/><g class="carta-a"><rect x="110" y="34" width="80" height="112" rx="10" fill="var(--papel)" stroke="var(--linea)" stroke-width="2"/><text x="120" y="60" font-size="24" font-weight="800" fill="var(--tinta)">A</text><use href="#palo-0" x="130" y="80" width="40" height="40" fill="var(--tinta)"/></g><g class="carta-b"><rect x="110" y="34" width="80" height="112" rx="10" fill="var(--papel)" stroke="var(--linea)" stroke-width="2"/><text x="120" y="60" font-size="24" font-weight="800" fill="var(--acento)">K</text><use href="#palo-1" x="130" y="80" width="40" height="40" fill="var(--acento)"/></g><circle cx="232" cy="150" r="26" fill="var(--acento)"/><circle cx="232" cy="150" r="19" fill="none" stroke="var(--fondo)" stroke-width="3" stroke-dasharray="6 5"/><text x="232" y="156" text-anchor="middle" font-size="16" font-weight="700" fill="var(--fondo)">25</text><circle cx="66" cy="158" r="20" fill="var(--tinta)"/><circle cx="66" cy="158" r="14" fill="none" stroke="var(--fondo)" stroke-width="3" stroke-dasharray="5 4"/><text x="66" y="164" text-anchor="middle" font-size="13" font-weight="700" fill="var(--fondo)">10</text></svg>`;

const distintivos = () => `<div class="distintivos"><span>${icono('usuario')}Un jugador</span><span>${icono('usuarios')}Con amigos</span><span>${icono('sin-conexion')}Sin internet</span></div>`;

const encabezado = () => `<header>${LOGOTIPO}<h1>Blackjack</h1>${perfil.nombre ? `<span class="jugador"><i></i>${escapar(perfil.nombre)}</span>` : ''}<button class="boton-tema" data-accion="cambiarTema" aria-label="Cambiar entre modo claro y oscuro">${icono(esOscuro() ? 'sol' : 'luna')}</button></header>`;

// ---------- Vistas ----------
const vistas = {
  inicio: () => `<main class="pila">${portada()}<div><p class="lema">Llega a 21</p><p class="tenue">Sin pasarte. Juega solo o con amigos, sin internet.</p></div>${distintivos()}<h2 style="font-size:20px">¿Cómo te llamas?</h2><input id="campoNombre" type="text" maxlength="14" autocomplete="off" placeholder="Tu nombre" value="${escapar(perfil.nombre)}"><h2 style="font-size:20px">Tu color</h2><p class="tenue">Se ve en la verificación final para que te reconozcan.</p><div class="muestras">${COLORES.map(c => `<button class="${c === perfil.color ? 'activo' : ''}" style="background:${c}" data-accion="elegirColor" data-valor="${c}" aria-label="Color ${c}"></button>`).join('')}<input type="color" id="colorLibre" value="${perfil.color}" aria-label="Elegir otro color"></div><button class="boton primario" data-accion="guardarPerfilYSeguir">${icono('visto')} Guardar y seguir</button><button class="boton" data-accion="verAyuda">${icono('ayuda')} Cómo jugar</button></main>`,

  menu: () => `<main class="pila">${portada()}<h2>Hola, ${escapar(perfil.nombre)}</h2><button class="boton primario" data-accion="jugarSolo">Un jugador</button>${partidaMulti ? `<button class="boton acento" data-accion="continuarMulti">Continuar multijugador</button>` : `<button class="boton" data-accion="irASala">Multijugador</button>`}<button class="boton" data-accion="verAyuda">${icono('ayuda')} Cómo jugar</button><button class="boton" data-accion="editarPerfil">Cambiar nombre o color</button><p class="tenue">Tus datos se guardan solo en este dispositivo.</p></main>`,

  solo() {
    const j = juego;
    const comprometido = j.manos.reduce((suma, m) => suma + m.apuesta, 0) + j.seguro;
    const disponible = progreso.fichas - comprometido;
    const resumen = `<div class="fila-cabecera"><span>Fichas <b>${progreso.fichas}</b></span><span>${progreso.ganadas} ganadas · ${progreso.perdidas} perdidas · ${progreso.empates} empates</span></div>`;

    if (j.fase === 'apuesta') {
      const sinRepetir = !progreso.ultimaApuesta || progreso.ultimaApuesta > progreso.fichas;
      return `<main class="pila">${resumen}<div class="panel" style="text-align:center"><p class="tenue">Tu apuesta</p><div class="cifra">${j.apuesta}</div></div><div class="fichas">${[10, 25, 50, 100].map(v => `<button class="boton-ficha" data-accion="sumarApuesta" data-valor="${v}" ${j.apuesta + v > progreso.fichas ? 'disabled' : ''} aria-label="Sumar ${v}">${dibujarFicha(v)}</button>`).join('')}</div><div class="cuadricula"><button class="boton" data-accion="repetirApuesta" ${sinRepetir ? 'disabled' : ''}>Repetir ${progreso.ultimaApuesta || ''}</button><button class="boton" data-accion="apostarTodo" ${progreso.fichas < 10 ? 'disabled' : ''}>Todo</button><button class="boton ancho" data-accion="quitarApuesta" ${j.apuesta ? '' : 'disabled'}>Quitar apuesta</button></div>${progreso.fichas < 10 ? `<button class="boton acento" data-accion="reiniciarFichas">Reiniciar fichas</button>` : ''}</main><div class="barra pila"><button class="boton acento" data-accion="repartir" ${j.apuesta ? '' : 'disabled'}>Repartir</button><button class="boton" data-accion="irAlMenu">Menú</button></div>`;
    }

    const mesaCrupier = `<div class="panel"><div class="fila-cabecera"><span>Crupier</span><b>${j.revelado ? valorMano(j.crupier) : valorCarta(j.crupier[0])}</b></div><div class="mano-cartas">${j.crupier.map((c, i) => dibujarCarta(c, !j.revelado && i === 1, 'c' + i)).join('')}</div></div>`;
    const mesaManos = j.manos.map((m, i) => `<div class="panel ${j.fase === 'turno' && i === j.indice ? 'activo' : ''}"><div class="fila-cabecera"><span>${j.manos.length > 1 ? 'Mano ' + (i + 1) : 'Tú'} · apuesta ${m.apuesta}</span><b>${valorMano(m.cartas)}</b></div><div class="mano-cartas">${m.cartas.map((c, k) => dibujarCarta(c, false, 'm' + i + '-' + k)).join('')}</div>${j.resultados ? `<p class="mensaje">${j.resultados[i]}</p>` : ''}</div>`).join('');

    let controles;
    if (j.fase === 'seguro') {
      controles = `<p class="mensaje">El crupier muestra un As. ¿Quieres seguro por ${Math.floor(j.manos[0].apuesta / 2)}?</p><div class="cuadricula"><button class="boton acento" data-accion="decidirSeguro" data-valor="1">${icono('escudo')} Seguro</button><button class="boton" data-accion="decidirSeguro" data-valor="0">Sin seguro</button></div>`;
    } else if (j.fase === 'turno') {
      const m = j.manos[j.indice], dosCartas = m.cartas.length === 2;
      const puedeDoblar = dosCartas && disponible >= m.apuesta;
      const puedeDividir = dosCartas && valorCarta(m.cartas[0]) === valorCarta(m.cartas[1]) && j.manos.length < 4 && disponible >= m.apuesta;
      const puedeRendirse = j.manos.length === 1 && !j.dividido && dosCartas;
      controles = `<div class="cuadricula"><button class="boton acento" data-accion="pedirCarta">${icono('mas')} Pedir</button><button class="boton primario" data-accion="plantarse">${icono('plantarse')} Plantarse</button><button class="boton" data-accion="doblar" ${puedeDoblar ? '' : 'disabled'}>${icono('doblar')} Doblar</button><button class="boton" data-accion="dividir" ${puedeDividir ? '' : 'disabled'}>${icono('dividir')} Dividir</button><button class="boton ancho" data-accion="rendirse" ${puedeRendirse ? '' : 'disabled'}>${icono('bandera')} Rendirse</button></div>`;
    } else {
      controles = `<p class="mensaje">${j.mensaje}</p><button class="boton acento" data-accion="nuevaMano">Nueva mano</button><button class="boton" data-accion="irAlMenu">Menú</button>`;
    }
    return `<main class="pila">${resumen}${mesaCrupier}${mesaManos}</main><div class="barra pila">${controles}</div>`;
  },

  sala() {
    const fecha = estadoSala.fecha;
    return `<main class="pila"><h2>Sala</h2><button class="boton primario" data-accion="crearJuego">${icono('mas')} Crear juego</button><label class="tenue" for="campoCodigo">Código de la sala</label><input id="campoCodigo" type="text" inputmode="numeric" maxlength="13" autocomplete="off" placeholder="260928-154210" value="${escapar(estadoSala.texto)}"><button class="boton" data-accion="unirseConCodigo">Unirme con código</button>${estadoSala.mensaje ? `<p class="mensaje">${estadoSala.mensaje}</p>` : ''}${fecha ? `<div class="panel"><p class="tenue">Juego creado</p><b>${escapar(fecha.toLocaleString())}</b><div>Código: <b>${estadoSala.codigo}</b></div></div><label class="fila"><input type="checkbox" id="casillaConfirmar" data-accion="confirmarCodigo" ${estadoSala.confirmado ? 'checked' : ''}> Todos tenemos el mismo código</label>` : ''}</main><div class="barra pila"><button class="boton acento" data-accion="entrarAPartida" ${fecha && estadoSala.confirmado ? '' : 'disabled'}>Entrar</button><button class="boton" data-accion="irAlMenu">Volver</button></div>`;
  },

  multi() {
    const cartas = manoMulti(), total = valorMano(cartas), terminada = partidaMulti.estado !== 'jugando';
    const aviso = partidaMulti.estado === 'eliminado' ? 'Te pasaste de 21' : partidaMulti.estado === 'plantado' ? 'Plantado en ' + total : '';
    return `<main class="pila"><div class="panel"><p class="tenue">Sala ${partidaMulti.codigo}</p><b>${escapar(fechaDelCodigo(partidaMulti.codigo))}</b></div><div class="panel"><div class="fila-cabecera"><span>${escapar(partidaMulti.nombre)}</span><b>${total}</b></div><div class="mano-cartas">${cartas.map((c, k) => dibujarCarta(c, false, 'p' + k)).join('')}</div></div><p class="mensaje">${aviso}</p></main><div class="barra pila">${terminada ? `<button class="boton acento" data-accion="mostrarTelefonos">Ya estamos todos plantados</button>` : `<div class="cuadricula"><button class="boton acento" data-accion="multiPedir">${icono('mas')} Pedir</button><button class="boton primario" data-accion="multiPlantarse">${icono('plantarse')} Plantarse</button></div>`}<button class="boton" data-accion="abandonar">${confirmandoAbandono ? 'Toca de nuevo para abandonar' : 'Abandonar'}</button></div>`;
  },

  verificacion() {
    const cartas = manoMulti(), total = valorMano(cartas), eliminado = partidaMulti.estado === 'eliminado';
    return `<main class="pila"><div class="franja"><div style="font-size:28px;font-weight:800">${escapar(partidaMulti.nombre)}</div><div>${eliminado ? 'Eliminado: se pasó de 21' : 'Plantado'}</div></div><div class="panel"><div class="fila-cabecera"><span>Total</span><span class="cifra" style="color:var(--tinta)">${total}</span></div><div class="mano-cartas grande">${cartas.map((c, k) => dibujarCarta(c, false, 'v' + k)).join('')}</div></div><div class="panel"><p class="tenue">Sala</p><b>${partidaMulti.codigo}</b><div>${escapar(fechaDelCodigo(partidaMulti.codigo))}</div></div>${partidaMulti.veredicto ? `<p class="mensaje">Resultado: ${partidaMulti.veredicto === 'gano' ? 'Ganó' : 'Perdió'}</p>` : ''}</main><div class="barra pila">${partidaMulti.veredicto ? `<button class="boton primario" data-accion="terminarMulti">Terminar</button>` : `<div class="cuadricula"><button class="boton acento" data-accion="darVeredicto" data-valor="gano" ${eliminado ? 'disabled' : ''}>Gané</button><button class="boton" data-accion="darVeredicto" data-valor="perdio">Perdí</button></div>`}</div>`;
  },

  ayuda() {
    const seccion = (ic, titulo, texto) => `<div class="panel"><div class="fila">${icono(ic)}<b>${titulo}</b></div><p style="margin-top:6px">${texto}</p></div>`;
    const accion = (ic, titulo, texto) => `<div class="fila">${icono(ic)}<p><b style="color:var(--tinta)">${titulo}.</b> ${texto}</p></div>`;
    return `<main class="pila ayuda"><h2>Cómo jugar</h2>${seccion('visto', 'Objetivo', 'Suma más que el crupier sin pasarte de 21. Si te pasas, pierdes al instante.')}${seccion('doblar', 'Valores', 'De 2 a 10 valen su número. J, Q y K valen 10. El As vale 11 o 1, según te convenga.')}<div class="panel"><b>Acciones</b>${accion('mas', 'Pedir', 'recibes otra carta')}${accion('plantarse', 'Plantarse', 'te quedas con tu mano')}${accion('doblar', 'Doblar', 'con tus dos primeras cartas, doblas la apuesta, recibes una carta y te plantas')}${accion('dividir', 'Dividir', 'con dos cartas del mismo valor, separas dos manos con una apuesta igual en cada una')}${accion('escudo', 'Seguro', 'si el crupier muestra un As, apuestas la mitad; paga 2 a 1 si tiene blackjack')}${accion('bandera', 'Rendirse', 'recuperas la mitad de tu apuesta y termina la mano')}</div>${seccion('visto', 'Blackjack', 'Un As y una carta de 10 suman 21 con dos cartas y pagan 3 a 2. El crupier se planta en 17.')}${seccion('usuarios', 'Multijugador', '1. Uno crea el juego y comparte el código. 2. Los demás lo escriben en Unirme con código, cada uno con un nombre distinto. 3. Marcan la casilla de confirmación y pulsan Entrar. 4. Cada quien pide o se planta en su teléfono; quien pasa de 21 queda eliminado. 5. Con todos plantados, enseñan el teléfono con su color y cada uno pulsa Gané o Perdí.')}</main><div class="barra"><button class="boton primario" data-accion="volver">Volver</button></div>`;
  },
};

// ---------- Dibujado ----------
function dibujar() {
  const raiz = document.documentElement;
  raiz.style.setProperty('--acento', perfil.color);
  perfil.tema ? raiz.setAttribute('data-tema', perfil.tema) : raiz.removeAttribute('data-tema');
  const contenido = vistas[pantalla]();
  seleccionar('#aplicacion').innerHTML = encabezado() + `<div class="${pantalla !== ultimaPantalla ? 'entrada' : ''}">${contenido}</div>`;
  ultimaPantalla = pantalla;
  cartasNuevas.forEach(id => cartasVistas.add(id));
  cartasNuevas.length = 0;
}
