// Modo un jugador: zapato de 6 mazos, crupier, apuestas y reglas tradicionales.
const crearZapato = () => { let mazos = []; for (let i = 0; i < 6; i++) mazos = mazos.concat(crearBaraja()); return barajar(mazos, Math.random); };
const robarCarta = () => { if (!zapato.length) zapato = crearZapato(); return zapato.pop(); };
const manoActiva = () => juego.manos[juego.indice];

const nuevoJuego = () => ({
  fase: 'apuesta',                 // apuesta | seguro | turno | fin
  apuesta: progreso.ultimaApuesta && progreso.ultimaApuesta <= progreso.fichas ? progreso.ultimaApuesta : 0,
  manos: [], crupier: [], seguro: 0, indice: 0, resultados: null, dividido: false, revelado: false, mensaje: '',
});

// El crupier revisa si tiene blackjack; si no, empieza el turno del jugador.
function revisarBlackjack() {
  if (valorMano(juego.crupier) === 21 || valorMano(juego.manos[0].cartas) === 21) terminarMano();
  else juego.fase = 'turno';
}

function siguienteMano() {
  while (juego.indice < juego.manos.length && juego.manos[juego.indice].terminada) juego.indice++;
  if (juego.indice >= juego.manos.length) terminarMano();
  dibujar();
}

function terminarMano(rendido) {
  juego.revelado = true; juego.fase = 'fin';
  let neto = 0;
  const resultados = [];
  const blackjackNatural = !juego.dividido && juego.manos[0].cartas.length === 2 && valorMano(juego.manos[0].cartas) === 21;
  if (rendido) {
    neto = -Math.floor(juego.manos[0].apuesta / 2);
    resultados.push('Te rindes: pierdes ' + (-neto));
    progreso.perdidas++;
  } else {
    if (juego.manos.some(m => valorMano(m.cartas) <= 21) && !blackjackNatural)
      while (valorMano(juego.crupier) < 17) juego.crupier.push(robarCarta());   // el crupier se planta en 17
    const totalCrupier = valorMano(juego.crupier);
    const crupierBlackjack = totalCrupier === 21 && juego.crupier.length === 2;
    juego.manos.forEach(m => {
      const total = valorMano(m.cartas);
      const esBlackjack = !juego.dividido && m.cartas.length === 2 && total === 21;
      let ganancia;
      if (total > 21) ganancia = -m.apuesta;
      else if (esBlackjack && !crupierBlackjack) ganancia = Math.floor(m.apuesta * 1.5);
      else if (crupierBlackjack) ganancia = esBlackjack ? 0 : -m.apuesta;
      else if (totalCrupier > 21 || total > totalCrupier) ganancia = m.apuesta;
      else if (total < totalCrupier) ganancia = -m.apuesta;
      else ganancia = 0;
      neto += ganancia;
      if (ganancia > 0) progreso.ganadas++; else if (ganancia < 0) progreso.perdidas++; else progreso.empates++;
      resultados.push(ganancia > 0 ? (esBlackjack && !crupierBlackjack ? '¡Blackjack! +' : 'Ganas +') + ganancia : ganancia < 0 ? 'Pierdes ' + (-ganancia) : 'Empate: recuperas tu apuesta');
    });
    if (juego.seguro) neto += crupierBlackjack ? juego.seguro * 2 : -juego.seguro;
  }
  progreso.fichas += neto;
  guardarProgreso();
  juego.resultados = resultados;
  juego.mensaje = neto > 0 ? 'Ganaste ' + neto + ' fichas' : neto < 0 ? 'Perdiste ' + (-neto) + ' fichas' : 'Sin cambios en tus fichas';
}

Object.assign(acciones, {
  jugarSolo() { juego = nuevoJuego(); pantalla = 'solo'; dibujar(); },
  nuevaMano() { juego = nuevoJuego(); dibujar(); },
  sumarApuesta(valor) { juego.apuesta += +valor; dibujar(); },
  repetirApuesta() { juego.apuesta = progreso.ultimaApuesta; dibujar(); },
  apostarTodo() { juego.apuesta = progreso.fichas; dibujar(); },
  quitarApuesta() { juego.apuesta = 0; dibujar(); },
  reiniciarFichas() { progreso.fichas = 1000; guardarProgreso(); juego = nuevoJuego(); dibujar(); },

  repartir() {
    if (!juego.apuesta || juego.apuesta > progreso.fichas) return;
    cartasVistas.clear();
    if (zapato.length < 52) zapato = crearZapato();
    progreso.ultimaApuesta = juego.apuesta; guardarProgreso();
    juego.manos = [{ cartas: [robarCarta(), robarCarta()], apuesta: juego.apuesta }];
    juego.crupier = [robarCarta(), robarCarta()];
    juego.indice = 0; juego.seguro = 0; juego.revelado = false; juego.resultados = null; juego.dividido = false;
    if (juego.crupier[0].rango === 'A' && progreso.fichas - juego.apuesta >= Math.floor(juego.apuesta / 2)) juego.fase = 'seguro';
    else revisarBlackjack();
    dibujar();
  },
  decidirSeguro(acepta) {
    if (acepta === '1') juego.seguro = Math.floor(juego.manos[0].apuesta / 2);
    revisarBlackjack(); dibujar();
  },
  pedirCarta() { const m = manoActiva(); m.cartas.push(robarCarta()); if (valorMano(m.cartas) >= 21) m.terminada = true; siguienteMano(); },
  plantarse() { manoActiva().terminada = true; siguienteMano(); },
  doblar() { const m = manoActiva(); m.apuesta *= 2; m.cartas.push(robarCarta()); m.terminada = true; siguienteMano(); },
  dividir() {
    const m = manoActiva(), nueva = { cartas: [m.cartas.pop()], apuesta: m.apuesta };
    juego.dividido = true;
    m.cartas.push(robarCarta()); nueva.cartas.push(robarCarta());
    juego.manos.splice(juego.indice + 1, 0, nueva);
    if (m.cartas[0].rango === 'A') { m.terminada = true; nueva.terminada = true; }   // con ases solo se recibe una carta
    else { if (valorMano(m.cartas) === 21) m.terminada = true; if (valorMano(nueva.cartas) === 21) nueva.terminada = true; }
    siguienteMano();
  },
  rendirse() { terminarMano(true); dibujar(); },
});
