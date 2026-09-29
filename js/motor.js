// Cartas y reglas de valor. No toca el DOM.
const PALOS = ['♠', '♥', '♦', '♣'];
const RANGOS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const crearBaraja = () =>
  Array.from({ length: 52 }, (_, i) => ({ rango: RANGOS[i % 13], palo: PALOS[Math.floor(i / 13)] }));

// Baraja de un jugador en multijugador: depende del código de sala y del nombre.
const barajaDe = (codigo, nombre) =>
  barajar(crearBaraja(), generadorConSemilla(hashTexto(codigo + '|' + nombre.trim().toLowerCase())()));

const valorCarta = carta =>
  carta.rango === 'A' ? 11 : ('JQK'.includes(carta.rango) || carta.rango === '10') ? 10 : +carta.rango;

// El As vale 11 o 1, lo que más convenga sin pasarse de 21.
function valorMano(cartas) {
  let total = 0, ases = 0;
  cartas.forEach(carta => { total += valorCarta(carta); if (carta.rango === 'A') ases++; });
  while (total > 21 && ases) { total -= 10; ases--; }
  return total;
}
