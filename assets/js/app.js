// Blackjack local con dos modos: un jugador y multijugador.
// El estado se guarda en localStorage y la lógica funciona sin backend.

const selector = (expresion) => document.querySelector(expresion);
const PALOS = ['♠', '♥', '♦', '♣'];
const RANGOS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const COLORES = ['#2563eb', '#dc2626', '#16a34a', '#ea580c', '#9333ea', '#db2777'];

// Acceso seguro a localStorage con valores por defecto.
const ALMACENAMIENTO = {
  get(clave, valorPorDefecto) {
    try {
      const valor = localStorage.getItem(clave);
      return valor ? JSON.parse(valor) : valorPorDefecto;
    } catch (error) {
      return valorPorDefecto;
    }
  },
  set(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch (error) {
      // Si falla el almacenamiento no bloquea el juego.
    }
  }
};

// Estado persistente del perfil y estadísticas.
let perfil = ALMACENAMIENTO.get('bj:perfil', { nombre: '', color: COLORES[0], tema: '' });
let solo = ALMACENAMIENTO.get('bj:solo', { f: 1000, g: 0, p: 0, e: 0, last: 0 });
let multijugador = ALMACENAMIENTO.get('bj:multi', null);

// Estado temporal de la sesión actual.
const CARTAS_VISITADAS = new Set();
const CARTAS_NUEVAS = [];
let ultimaPantalla = '';
let pantallaAnterior = 'modo';
let pantallaActual = perfil.nombre ? 'modo' : 'inicio';
let juego = null;
let mazo = [];
let sala = { texto: '', codigo: '', valido: null, marcado: false, mensaje: '' };
let dobleConfirmacionSalida = false;

// Escapa texto para evitar inyección por HTML en los templates.
const escaparHTML = (texto) => String(texto).replace(/[&<>\"]/g, (caracter) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;'
}[caracter]));

const guardarMultijugador = () => ALMACENAMIENTO.set('bj:multi', multijugador);
const guardarSolo = () => ALMACENAMIENTO.set('bj:solo', solo);
const guardarPerfil = () => ALMACENAMIENTO.set('bj:perfil', perfil);

// Generación de baraja y aleatoriedad determinista para multijugador local.
const construirBaraja = () => Array.from({ length: 52 }, (_, indice) => ({
  rango: RANGOS[indice % 13],
  palo: PALOS[Math.floor(indice / 13)]
}));

function hashXmur3(texto) {
  let hash = 1779033703 ^ texto.length;
  for (let indice = 0; indice < texto.length; indice++) {
    hash = Math.imul(hash ^ texto.charCodeAt(indice), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    return (hash ^= hash >>> 16) >>> 0;
  };
}

function generadorPseudoaleatorio(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let valor = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    valor = (valor + Math.imul(valor ^ (valor >>> 7), 61 | valor)) ^ valor;
    return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296;
  };
}

function barajarCartas(cartas, generador) {
  const copia = [...cartas];
  for (let indice = copia.length - 1; indice > 0; indice--) {
    const posicion = Math.floor(generador() * (indice + 1));
    [copia[indice], copia[posicion]] = [copia[posicion], copia[indice]];
  }
  return copia;
}

const barajaPorCodigo = (codigo, nombre) => barajarCartas(
  construirBaraja(),
  generadorPseudoaleatorio(hashXmur3(`${codigo}|${nombre.trim().toLowerCase()}`)())
);

const valorCarta = (carta) => {
  if (carta.rango === 'A') return 11;
  if ('JQK'.includes(carta.rango) || carta.rango === '10') return 10;
  return Number(carta.rango);
};

function calcularValorMano(mano) {
  let total = 0;
  let ases = 0;

  mano.forEach((carta) => {
    total += valorCarta(carta);
    if (carta.rango === 'A') ases++;
  });

  while (total > 21 && ases) {
    total -= 10;
    ases--;
  }

  return total;
}

function crearCodigoSala(fechaActual = new Date()) {
  const formatear = (numero) => String(numero).padStart(2, '0');
  return formatear(fechaActual.getFullYear() % 100)
    + formatear(fechaActual.getMonth() + 1)
    + formatear(fechaActual.getDate())
    + '-' + formatear(fechaActual.getHours())
    + formatear(fechaActual.getMinutes())
    + formatear(fechaActual.getSeconds());
}

function infoCodigoSala(texto) {
  const coincidencia = /^(\d\d)(\d\d)(\d\d)-(\d\d)(\d\d)(\d\d)$/.exec((texto || '').trim());
  if (!coincidencia) return null;

  const [a, b, c, h, i, j] = coincidencia.slice(1).map(Number);
  const fechaObjeto = new Date(2000 + a, b - 1, c, h, i, j);

  return fechaObjeto.getFullYear() === 2000 + a
    && fechaObjeto.getMonth() === b - 1
    && fechaObjeto.getDate() === c
    && fechaObjeto.getHours() === h
    && fechaObjeto.getMinutes() === i
    && fechaObjeto.getSeconds() === j
    ? fechaObjeto
    : null;
}

const obtenerFechaLegible = (codigo) => {
  const fechaObjeto = infoCodigoSala(codigo);
  return fechaObjeto ? fechaObjeto.toLocaleString() : '';
};

// Render de íconos, fichas y cartas SVG.
const icono = (nombre) => `<svg class="ic" aria-hidden="true"><use href="#i-${nombre}"/></svg>`;

function renderizarCarta(carta, ocultar, clave) {
  const id = clave + (ocultar ? '#' : carta.rango + carta.palo);
  const clase = 'cd' + (CARTAS_VISITADAS.has(id) ? '' : ' new');
  CARTAS_NUEVAS.push(id);

  if (ocultar) {
    return `<svg class="${clase}" viewBox="0 0 60 84" role="img" aria-label="Carta oculta"><rect x="1" y="1" width="58" height="82" rx="8" fill="var(--ac)"/><path d="M12 14h36M12 26h36M12 38h36M12 50h36M12 62h36M12 74h36" stroke="var(--bg)" stroke-width="2" opacity=".45"/></svg>`;
  }

  const indice = PALOS.indexOf(carta.palo);
  const color = (indice === 1 || indice === 2) ? 'var(--ac)' : 'var(--ink)';

  return `<svg class="${clase}" viewBox="0 0 60 84" role="img" aria-label="${carta.rango} ${carta.palo}" style="color:${color}"><rect x=".5" y=".5" width="59" height="83" rx="8" fill="var(--card)" stroke="var(--line)"/><text x="7" y="21" font-size="18" font-weight="700" fill="currentColor">${carta.rango}</text><use href="#s${indice}" x="6" y="25" width="12" height="12" fill="currentColor"/><use href="#s${indice}" x="17" y="36" width="28" height="28" fill="currentColor"/></svg>`;
}

const renderizarFicha = (valor) => `<svg class="chip" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="28" fill="var(--ac)"/><circle cx="30" cy="30" r="21" fill="none" stroke="var(--bg)" stroke-width="3" stroke-dasharray="6 5"/><text x="30" y="36" text-anchor="middle" font-size="16" font-weight="700" fill="var(--bg)">${valor}</text></svg>`;
const modoOscuroActivo = () => (perfil.tema || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light')) === 'dark';

const LOGO = `<svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="var(--ac)"/><use href="#s0" x="5" y="5" width="14" height="14" fill="#fff"/></svg>`;
const hero = () => `<svg class="hero" viewBox="0 0 300 200" role="img" aria-label="Dos cartas y dos fichas"><circle cx="150" cy="105" r="88" fill="var(--ac)" opacity=".12"/><circle cx="150" cy="105" r="100" fill="none" stroke="var(--ac)" stroke-width="2" stroke-dasharray="3 9" stroke-linecap="round" opacity=".5"/><g class="c1"><rect x="110" y="34" width="80" height="112" rx="10" fill="var(--card)" stroke="var(--line)" stroke-width="2"/><text x="120" y="60" font-size="24" font-weight="800" fill="var(--ink)">A</text><use href="#s0" x="130" y="80" width="40" height="40" fill="var(--ink)"/></g><g class="c2"><rect x="110" y="34" width="80" height="112" rx="10" fill="var(--card)" stroke="var(--line)" stroke-width="2"/><text x="120" y="60" font-size="24" font-weight="800" fill="var(--ac)">K</text><use href="#s1" x="130" y="80" width="40" height="40" fill="var(--ac)"/></g><circle cx="232" cy="150" r="26" fill="var(--ac)"/><circle cx="232" cy="150" r="19" fill="none" stroke="var(--bg)" stroke-width="3" stroke-dasharray="6 5"/><text x="232" y="156" text-anchor="middle" font-size="16" font-weight="700" fill="var(--bg)">25</text><circle cx="66" cy="158" r="20" fill="var(--ink)"/><circle cx="66" cy="158" r="14" fill="none" stroke="var(--bg)" stroke-width="3" stroke-dasharray="5 4"/><text x="66" y="164" text-anchor="middle" font-size="13" font-weight="700" fill="var(--bg)">10</text></svg>`;
const destacada = () => `<div class="feat"><span>${icono('user')}Un jugador</span><span>${icono('users')}Con amigos</span><span>${icono('wifi')}Sin internet</span></div>`;

// Vistas principales renderizadas con plantillas HTML.
const cabecera = () => `<header>${LOGO}<h1>Blackjack</h1>${perfil.nombre ? `<span class="who"><i></i>${escaparHTML(perfil.nombre)}</span>` : ''}<button class="tb" data-a="tema" aria-label="Cambiar entre modo claro y oscuro">${icono(modoOscuroActivo() ? 'sun' : 'moon')}</button></header>`;

const VISTAS = {
  inicio: () => `<main class="stack">${hero()}<div><p class="tag">Llega a 21</p><p class="mut">Sin pasarte. Juega solo o con amigos, sin internet.</p></div>${destacada()}<h2 style="font-size:20px">¿Cómo te llamas?</h2><input id="n" type="text" maxlength="14" autocomplete="off" placeholder="Tu nombre" value="${escaparHTML(perfil.nombre)}"><h2 style="font-size:20px">Tu color</h2><p class="mut">Se ve en la verificación final para que te reconozcan.</p><div class="sw">${COLORES.map((color) => `<button class="${color === perfil.color ? 'on' : ''}" style="background:${color}" data-a="col" data-v="${color}" aria-label="Color ${color}"></button>`).join('')}<input type="color" id="cc" value="${perfil.color}" aria-label="Elegir otro color"></div><button class="b p" data-a="ok">${icono('check')} Guardar y seguir</button><button class="b" data-a="ayuda">${icono('help')} Cómo jugar</button></main>`,

  modo: () => `<main class="stack">${hero()}<h2>Hola, ${escaparHTML(perfil.nombre)}</h2><button class="b p" data-a="solo">Un jugador</button>${multijugador ? `<button class="b a" data-a="cont">Continuar multijugador</button>` : `<button class="b" data-a="sala">Multijugador</button>`}<button class="b" data-a="ayuda">${icono('help')} Cómo jugar</button><button class="b" data-a="perfil">Cambiar nombre o color</button><p class="mut">Tus datos se guardan solo en este dispositivo.</p></main>`,

  solo() {
    const estado = juego;
    const apostado = estado.hands.reduce((suma, mano) => suma + mano.bet, 0) + estado.ins;
    const disponible = solo.f - apostado;
    const cabeceraSolo = `<div class="hd"><span>Fichas <b>${solo.f}</b></span><span>${solo.g} ganadas · ${solo.p} perdidas · ${solo.e} empates</span></div>`;

    if (estado.ph === 'bet') {
      return `<main class="stack">${cabeceraSolo}<div class="panel" style="text-align:center"><p class="mut">Tu apuesta</p><div class="big">${estado.bet}</div></div><div class="chips">${[10, 25, 50, 100].map((valor) => `<button class="chipb" data-a="add" data-v="${valor}" ${estado.bet + valor > solo.f ? 'disabled' : ''} aria-label="Sumar ${valor}">${renderizarFicha(valor)}</button>`).join('')}</div><div class="g"><button class="b" data-a="rep" ${(!solo.last || solo.last > solo.f) ? 'disabled' : ''}>Repetir ${solo.last || ''}</button><button class="b" data-a="todo" ${solo.f < 10 ? 'disabled' : ''}>Todo</button><button class="b wide" data-a="quit" ${estado.bet ? '' : 'disabled'}>Quitar apuesta</button></div>${solo.f < 10 ? `<button class="b a" data-a="rein">Reiniciar fichas</button>` : ''}</main><div class="bar stack"><button class="b a" data-a="deal" ${estado.bet ? '' : 'disabled'}>Repartir</button><button class="b" data-a="menu">Menú</button></div>`;
    }

    const crupier = `<div class="panel"><div class="hd"><span>Crupier</span><b>${estado.rev ? calcularValorMano(estado.d) : valorCarta(estado.d[0])}</b></div><div class="hand">${estado.d.map((carta, indice) => renderizarCarta(carta, !estado.rev && indice === 1, 'd' + indice)).join('')}</div></div>`;
    const manos = estado.hands.map((mano, indice) => `<div class="panel ${estado.ph === 'play' && indice === estado.i ? 'on' : ''}"><div class="hd"><span>${estado.hands.length > 1 ? 'Mano ' + (indice + 1) : 'Tú'} · apuesta ${mano.bet}</span><b>${calcularValorMano(mano.c)}</b></div><div class="hand">${mano.c.map((carta, clave) => renderizarCarta(carta, 0, 'h' + indice + '-' + clave)).join('')}</div>${estado.res ? `<p class="msg">${estado.res[indice]}</p>` : ''}</div>`).join('');

    let controles;
    if (estado.ph === 'ins') {
      controles = `<p class="msg">El crupier muestra un As. ¿Quieres seguro por ${Math.floor(estado.hands[0].bet / 2)}?</p><div class="g"><button class="b a" data-a="ins" data-v="1">${icono('shield')} Seguro</button><button class="b" data-a="ins" data-v="0">Sin seguro</button></div>`;
    } else if (estado.ph === 'play') {
      const manoActual = estado.hands[estado.i];
      const tieneDosCartas = manoActual.c.length === 2;
      controles = `<div class="g"><button class="b a" data-a="hit">${icono('plus')} Pedir</button><button class="b p" data-a="stand">${icono('stand')} Plantarse</button><button class="b" data-a="dbl" ${tieneDosCartas && disponible >= manoActual.bet ? '' : 'disabled'}>${icono('x2')} Doblar</button><button class="b" data-a="split" ${tieneDosCartas && valorCarta(manoActual.c[0]) === valorCarta(manoActual.c[1]) && estado.hands.length < 4 && disponible >= manoActual.bet ? '' : 'disabled'}>${icono('split')} Dividir</button><button class="b wide" data-a="sur" ${estado.hands.length === 1 && !estado.sp && tieneDosCartas ? '' : 'disabled'}>${icono('flag')} Rendirse</button></div>`;
    } else {
      controles = `<p class="msg">${estado.msg}</p><button class="b a" data-a="nueva">Nueva mano</button><button class="b" data-a="menu">Menú</button>`;
    }

    return `<main class="stack">${cabeceraSolo}${crupier}${manos}</main><div class="bar stack">${controles}</div>`;
  },

  sala: () => {
    const dato = sala.valido;
    return `<main class="stack"><h2>Sala</h2><button class="b p" data-a="crear">${icono('plus')} Crear juego</button><label class="mut" for="cod">Código de la sala</label><input id="cod" type="text" inputmode="numeric" maxlength="13" autocomplete="off" placeholder="260928-154210" value="${escaparHTML(sala.texto)}"><button class="b" data-a="unir">Unirme con código</button>${sala.mensaje ? `<p class="msg">${sala.mensaje}</p>` : ''}${dato ? `<div class="panel"><p class="mut">Juego creado</p><b>${escaparHTML(dato.toLocaleString())}</b><div>Código: <b>${sala.codigo}</b></div></div><label class="row"><input type="checkbox" id="chk" data-a="chk" ${sala.marcado ? 'checked' : ''}> Todos tenemos el mismo código</label>` : ''}</main><div class="bar stack"><button class="b a" data-a="entrar" ${dato && sala.marcado ? '' : 'disabled'}>Entrar</button><button class="b" data-a="menu">Volver</button></div>`;
  },

  multi: () => {
    const manoActual = obtenerManoMultijugador();
    const total = calcularValorMano(manoActual);
    const fin = multijugador.est !== 'jugando';
    return `<main class="stack"><div class="panel"><p class="mut">Sala ${multijugador.cod}</p><b>${escaparHTML(obtenerFechaLegible(multijugador.cod))}</b></div><div class="panel"><div class="hd"><span>${escaparHTML(multijugador.n)}</span><b>${total}</b></div><div class="hand">${manoActual.map((carta, indice) => renderizarCarta(carta, 0, 'm' + indice)).join('')}</div></div><p class="msg">${multijugador.est === 'eliminado' ? 'Te pasaste de 21' : multijugador.est === 'plantado' ? 'Plantado en ' + total : ''}</p></main><div class="bar stack">${fin ? `<button class="b a" data-a="mostrar">Ya estamos todos plantados</button>` : `<div class="g"><button class="b a" data-a="mpedir">${icono('plus')} Pedir</button><button class="b p" data-a="mplant">${icono('stand')} Plantarse</button></div>`}<button class="b" data-a="aband">${dobleConfirmacionSalida ? 'Toca de nuevo para abandonar' : 'Abandonar'}</button></div>`;
  },

  show: () => {
    const manoActual = obtenerManoMultijugador();
    const total = calcularValorMano(manoActual);
    const eliminado = multijugador.est === 'eliminado';
    return `<main class="stack"><div class="band"><div style="font-size:28px;font-weight:800">${escaparHTML(multijugador.n)}</div><div>${eliminado ? 'Eliminado: se pasó de 21' : 'Plantado'}</div></div><div class="panel"><div class="hd"><span>Total</span><span class="big" style="color:var(--ink)">${total}</span></div><div class="hand lg">${manoActual.map((carta, indice) => renderizarCarta(carta, 0, 's' + indice)).join('')}</div></div><div class="panel"><p class="mut">Sala</p><b>${multijugador.cod}</b><div>${escaparHTML(obtenerFechaLegible(multijugador.cod))}</div></div>${multijugador.ver ? `<p class="msg">Resultado: ${multijugador.ver === 'g' ? 'Ganó' : 'Perdió'}</p>` : ''}</main><div class="bar stack">${multijugador.ver ? `<button class="b p" data-a="fin">Terminar</button>` : `<div class="g"><button class="b a" data-a="ver" data-v="g" ${eliminado ? 'disabled' : ''}>Gané</button><button class="b" data-a="ver" data-v="p">Perdí</button></div>`}</div>`;
  }
};

VISTAS.ayuda = () => {
  const bloque = (iconoNombre, titulo, texto) => `<div class="panel"><div class="row">${icono(iconoNombre)}<b>${titulo}</b></div><p style="margin-top:6px">${texto}</p></div>`;
  const linea = (iconoNombre, titulo, texto) => `<div class="row">${icono(iconoNombre)}<p><b style="color:var(--ink)">${titulo}.</b> ${texto}</p></div>`;

  return `<main class="stack help"><h2>Cómo jugar</h2>${bloque('check', 'Objetivo', 'Suma más que el crupier sin pasarte de 21. Si te pasas, pierdes al instante.')}${bloque('x2', 'Valores', 'De 2 a 10 valen su número. J, Q y K valen 10. El As vale 11 o 1, según te convenga.')}${bloque('plus', 'Acciones', `${linea('plus', 'Pedir', 'recibes otra carta')}${linea('stand', 'Plantarse', 'te quedas con tu mano')}${linea('x2', 'Doblar', 'con tus dos primeras cartas, doblas la apuesta, recibes una carta y te plantas')}${linea('split', 'Dividir', 'con dos cartas del mismo valor, separas dos manos con una apuesta igual en cada una')}${linea('shield', 'Seguro', 'si el crupier muestra un As, apuestas la mitad; paga 2 a 1 si tiene blackjack')}${linea('flag', 'Rendirse', 'recuperas la mitad de tu apuesta y termina la mano')}`)}${bloque('check', 'Blackjack', 'Un As y una carta de 10 suman 21 con dos cartas y pagan 3 a 2. El crupier se planta en 17.')}${bloque('users', 'Multijugador', '1. Uno crea el juego y comparte el código. 2. Los demás lo escriben en Unirme con código, cada uno con un nombre distinto. 3. Marcan la casilla de confirmación y pulsan Entrar. 4. Cada quien pide o se planta en su teléfono; quien pasa de 21 queda eliminado. 5. Con todos plantados, enseñan el teléfono con su color y cada uno pulsa Gané o Perdí.')}</main><div class="bar"><button class="b p" data-a="back">Volver</button></div>`;
};

const obtenerManoMultijugador = () => barajaPorCodigo(multijugador.cod, multijugador.n).slice(0, multijugador.idx);

function renderizarPantalla() {
  const raiz = document.documentElement;
  raiz.style.setProperty('--ac', perfil.color);

  if (perfil.tema) {
    raiz.setAttribute('data-theme', perfil.tema);
  } else {
    raiz.removeAttribute('data-theme');
  }

  const contenido = VISTAS[pantallaActual]();
  selector('#app').innerHTML = cabecera() + `<div class="${pantallaActual !== ultimaPantalla ? 'enter' : ''}">${contenido}</div>`;
  ultimaPantalla = pantallaActual;
  CARTAS_NUEVAS.forEach((identificador) => CARTAS_VISITADAS.add(identificador));
  CARTAS_NUEVAS.length = 0;
}

// Lógica del modo un jugador.
const crearMazo = () => {
  let mazoLocal = [];
  for (let indice = 0; indice < 6; indice++) {
    mazoLocal = mazoLocal.concat(construirBaraja());
  }
  return barajarCartas(mazoLocal, Math.random);
};

const sacarCarta = () => {
  if (!mazo.length) mazo = crearMazo();
  return mazo.pop();
};

const manoActual = () => juego.hands[juego.i];

function revisarEstadoDeTurno() {
  if (calcularValorMano(juego.d) === 21 || calcularValorMano(juego.hands[0].c) === 21) {
    finalizarPartida();
  } else {
    juego.ph = 'play';
  }
}

function avanzarTurno() {
  while (juego.i < juego.hands.length && juego.hands[juego.i].done) juego.i++;
  if (juego.i >= juego.hands.length) finalizarPartida();
  renderizarPantalla();
}

function finalizarPartida(seRinde = false) {
  juego.rev = true;
  juego.ph = 'end';
  let gananciaNeta = 0;
  const resultados = [];
  const blackjackInicial = !juego.sp && juego.hands[0].c.length === 2 && calcularValorMano(juego.hands[0].c) === 21;

  if (seRinde) {
    gananciaNeta = -Math.floor(juego.hands[0].bet / 2);
    resultados.push('Te rindes: pierdes ' + (-gananciaNeta));
    solo.p++;
  } else {
    if (juego.hands.some((mano) => calcularValorMano(mano.c) <= 21) && !blackjackInicial) {
      while (calcularValorMano(juego.d) < 17) juego.d.push(sacarCarta());
    }

    const valorCrupier = calcularValorMano(juego.d);
    const blackjackCrupier = valorCrupier === 21 && juego.d.length === 2;

    juego.hands.forEach((mano) => {
      const valorMano = calcularValorMano(mano.c);
      const blackjackMano = !juego.sp && mano.c.length === 2 && valorMano === 21;
      let cambio;

      if (valorMano > 21) {
        cambio = -mano.bet;
      } else if (blackjackMano && !blackjackCrupier) {
        cambio = Math.floor(mano.bet * 1.5);
      } else if (blackjackCrupier) {
        cambio = blackjackMano ? 0 : -mano.bet;
      } else if (valorCrupier > 21 || valorMano > valorCrupier) {
        cambio = mano.bet;
      } else if (valorMano < valorCrupier) {
        cambio = -mano.bet;
      } else {
        cambio = 0;
      }

      gananciaNeta += cambio;
      cambio > 0 ? solo.g++ : cambio < 0 ? solo.p++ : solo.e++;
      resultados.push(cambio > 0 ? (blackjackMano && !blackjackCrupier ? '¡Blackjack! +' : 'Ganas +') + cambio : cambio < 0 ? 'Pierdes ' + (-cambio) : 'Empate: recuperas tu apuesta');
    });

    if (juego.ins) gananciaNeta += blackjackCrupier ? juego.ins * 2 : -juego.ins;
  }

  solo.f += gananciaNeta;
  guardarSolo();
  juego.res = resultados;
  juego.msg = gananciaNeta > 0 ? 'Ganaste ' + gananciaNeta + ' fichas' : gananciaNeta < 0 ? 'Perdiste ' + (-gananciaNeta) + ' fichas' : 'Sin cambios en tus fichas';
}

const nuevaPartida = () => ({
  ph: 'bet',
  bet: solo.last && solo.last <= solo.f ? solo.last : 0,
  hands: [],
  d: [],
  ins: 0,
  i: 0,
  res: null,
  sp: 0,
  rev: false,
  msg: ''
});

// Acciones del usuario y eventos del navegador.
const ACCIONES = {
  tema() {
    perfil.tema = modoOscuroActivo() ? 'light' : 'dark';
    guardarPerfil();
    renderizarPantalla();
  },

  col(valor) {
    perfil.nombre = selector('#n').value.trim();
    perfil.color = valor;
    renderizarPantalla();
  },

  ok() {
    const nombre = selector('#n').value.trim();
    if (!nombre) {
      selector('#n').focus();
      return;
    }

    perfil.nombre = nombre;
    guardarPerfil();
    pantallaActual = 'modo';
    renderizarPantalla();
  },

  perfil() {
    pantallaActual = 'inicio';
    renderizarPantalla();
  },

  menu() {
    pantallaActual = 'modo';
    renderizarPantalla();
  },

  ayuda() {
    pantallaAnterior = pantallaActual;
    pantallaActual = 'ayuda';
    renderizarPantalla();
  },

  back() {
    pantallaActual = pantallaAnterior;
    renderizarPantalla();
  },

  solo() {
    juego = nuevaPartida();
    pantallaActual = 'solo';
    renderizarPantalla();
  },

  nueva() {
    juego = nuevaPartida();
    renderizarPantalla();
  },

  add(valor) {
    juego.bet += Number(valor);
    renderizarPantalla();
  },

  rep() {
    juego.bet = solo.last;
    renderizarPantalla();
  },

  todo() {
    juego.bet = solo.f;
    renderizarPantalla();
  },

  quit() {
    juego.bet = 0;
    renderizarPantalla();
  },

  rein() {
    solo.f = 1000;
    guardarSolo();
    juego = nuevaPartida();
    renderizarPantalla();
  },

  deal() {
    if (!juego.bet || juego.bet > solo.f) return;
    CARTAS_VISITADAS.clear();
    if (mazo.length < 52) mazo = crearMazo();
    solo.last = juego.bet;
    guardarSolo();

    juego.hands = [{ c: [sacarCarta(), sacarCarta()], bet: juego.bet }];
    juego.d = [sacarCarta(), sacarCarta()];
    juego.i = 0;
    juego.ins = 0;
    juego.rev = false;
    juego.res = null;
    juego.sp = 0;

    if (juego.d[0].rango === 'A' && solo.f - juego.bet >= Math.floor(juego.bet / 2)) {
      juego.ph = 'ins';
    } else {
      revisarEstadoDeTurno();
    }

    renderizarPantalla();
  },

  ins(valor) {
    if (valor === '1') juego.ins = Math.floor(juego.hands[0].bet / 2);
    revisarEstadoDeTurno();
    renderizarPantalla();
  },

  hit() {
    const manoSeleccionada = manoActual();
    manoSeleccionada.c.push(sacarCarta());
    if (calcularValorMano(manoSeleccionada.c) >= 21) manoSeleccionada.done = 1;
    avanzarTurno();
  },

  stand() {
    manoActual().done = 1;
    avanzarTurno();
  },

  dbl() {
    const manoSeleccionada = manoActual();
    manoSeleccionada.bet *= 2;
    manoSeleccionada.c.push(sacarCarta());
    manoSeleccionada.done = 1;
    avanzarTurno();
  },

  split() {
    const manoSeleccionada = manoActual();
    const nuevaMano = { c: [manoSeleccionada.c.pop()], bet: manoSeleccionada.bet };
    juego.sp = 1;
    manoSeleccionada.c.push(sacarCarta());
    nuevaMano.c.push(sacarCarta());
    juego.hands.splice(juego.i + 1, 0, nuevaMano);

    if (manoSeleccionada.c[0].rango === 'A') {
      manoSeleccionada.done = 1;
      nuevaMano.done = 1;
    } else {
      if (calcularValorMano(manoSeleccionada.c) === 21) manoSeleccionada.done = 1;
      if (calcularValorMano(nuevaMano.c) === 21) nuevaMano.done = 1;
    }

    avanzarTurno();
  },

  sur() {
    finalizarPartida(true);
    renderizarPantalla();
  },

  // Multijugador local sin servidor.
  sala() {
    sala = { texto: '', codigo: '', valido: null, marcado: false, mensaje: '' };
    pantallaActual = 'sala';
    renderizarPantalla();
  },

  crear() {
    sala.texto = sala.codigo = crearCodigoSala();
    sala.valido = infoCodigoSala(sala.codigo);
    sala.marcado = false;
    sala.mensaje = '';
    renderizarPantalla();
  },

  unir() {
    const codigoValido = infoCodigoSala(sala.texto);
    if (!codigoValido) {
      sala.valido = null;
      sala.mensaje = 'Código no válido. Usa el formato AAMMDD-HHMMSS';
    } else {
      sala.codigo = sala.texto.trim();
      sala.valido = codigoValido;
      sala.mensaje = '';
    }
    sala.marcado = false;
    renderizarPantalla();
  },

  chk() {
    sala.marcado = selector('#chk').checked;
    renderizarPantalla();
  },

  entrar() {
    if (!sala.valido || !sala.marcado) return;
    CARTAS_VISITADAS.clear();
    multijugador = { cod: sala.codigo, n: perfil.nombre, idx: 2, est: 'jugando', ver: null, shown: 0 };
    guardarMultijugador();
    pantallaActual = 'multi';
    renderizarPantalla();
  },

  cont() {
    CARTAS_VISITADAS.clear();
    pantallaActual = multijugador.shown ? 'show' : 'multi';
    renderizarPantalla();
  },

  mpedir() {
    multijugador.idx++;
    if (calcularValorMano(obtenerManoMultijugador()) > 21) multijugador.est = 'eliminado';
    guardarMultijugador();
    renderizarPantalla();
  },

  mplant() {
    multijugador.est = 'plantado';
    guardarMultijugador();
    renderizarPantalla();
  },

  mostrar() {
    multijugador.shown = 1;
    guardarMultijugador();
    pantallaActual = 'show';
    renderizarPantalla();
  },

  ver(resultado) {
    multijugador.ver = resultado;
    guardarMultijugador();
    renderizarPantalla();
  },

  fin() {
    multijugador = null;
    guardarMultijugador();
    pantallaActual = 'modo';
    renderizarPantalla();
  },

  aband() {
    if (!dobleConfirmacionSalida) {
      dobleConfirmacionSalida = true;
      setTimeout(() => {
        dobleConfirmacionSalida = false;
        if (pantallaActual === 'multi') renderizarPantalla();
      }, 3000);
      renderizarPantalla();
      return;
    }

    dobleConfirmacionSalida = false;
    multijugador = null;
    guardarMultijugador();
    pantallaActual = 'modo';
    renderizarPantalla();
  }
};

selector('#app').addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-a]');
  if (boton && !boton.disabled && ACCIONES[boton.dataset.a]) {
    ACCIONES[boton.dataset.a](boton.dataset.v);
  }
});

selector('#app').addEventListener('input', (evento) => {
  if (evento.target.id === 'cod') sala.texto = evento.target.value;
  if (evento.target.id === 'cc') {
    perfil.color = evento.target.value;
    document.documentElement.style.setProperty('--ac', perfil.color);
  }
});

renderizarPantalla();
