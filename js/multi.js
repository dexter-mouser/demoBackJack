// Modo multijugador local: sala con código (semilla), mano por jugador y verificación final.
function crearCodigo(fecha = new Date()) {
  const dos = n => String(n).padStart(2, '0');
  return dos(fecha.getFullYear() % 100) + dos(fecha.getMonth() + 1) + dos(fecha.getDate()) + '-' + dos(fecha.getHours()) + dos(fecha.getMinutes()) + dos(fecha.getSeconds());
}

// Devuelve la fecha del código (AAMMDD-HHMMSS) o null si no es válido.
function validarCodigo(texto) {
  const partes = /^(\d\d)(\d\d)(\d\d)-(\d\d)(\d\d)(\d\d)$/.exec((texto || '').trim());
  if (!partes) return null;
  const [anio, mes, dia, hora, minuto, segundo] = partes.slice(1).map(Number);
  const fecha = new Date(2000 + anio, mes - 1, dia, hora, minuto, segundo);
  const real = fecha.getFullYear() === 2000 + anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia
    && fecha.getHours() === hora && fecha.getMinutes() === minuto && fecha.getSeconds() === segundo;
  return real ? fecha : null;
}

const fechaDelCodigo = codigo => { const fecha = validarCodigo(codigo); return fecha ? fecha.toLocaleString() : ''; };
const manoMulti = () => barajaDe(partidaMulti.codigo, partidaMulti.nombre).slice(0, partidaMulti.indice);

Object.assign(acciones, {
  irASala() { estadoSala = { texto: '', codigo: '', fecha: null, confirmado: false, mensaje: '' }; pantalla = 'sala'; dibujar(); },
  crearJuego() {
    estadoSala.texto = estadoSala.codigo = crearCodigo();
    estadoSala.fecha = validarCodigo(estadoSala.codigo);
    estadoSala.confirmado = false; estadoSala.mensaje = ''; dibujar();
  },
  unirseConCodigo() {
    const fecha = validarCodigo(estadoSala.texto);
    if (!fecha) { estadoSala.fecha = null; estadoSala.mensaje = 'Código no válido. Usa el formato AAMMDD-HHMMSS'; }
    else { estadoSala.codigo = estadoSala.texto.trim(); estadoSala.fecha = fecha; estadoSala.mensaje = ''; }
    estadoSala.confirmado = false; dibujar();
  },
  confirmarCodigo() { estadoSala.confirmado = seleccionar('#casillaConfirmar').checked; dibujar(); },
  entrarAPartida() {
    if (!estadoSala.fecha || !estadoSala.confirmado) return;
    cartasVistas.clear();
    partidaMulti = { codigo: estadoSala.codigo, nombre: perfil.nombre, indice: 2, estado: 'jugando', veredicto: null, mostrada: false };
    guardarMulti(); pantalla = 'multi'; dibujar();
  },
  continuarMulti() { cartasVistas.clear(); pantalla = partidaMulti.mostrada ? 'verificacion' : 'multi'; dibujar(); },
  multiPedir() { partidaMulti.indice++; if (valorMano(manoMulti()) > 21) partidaMulti.estado = 'eliminado'; guardarMulti(); dibujar(); },
  multiPlantarse() { partidaMulti.estado = 'plantado'; guardarMulti(); dibujar(); },
  mostrarTelefonos() { partidaMulti.mostrada = true; guardarMulti(); pantalla = 'verificacion'; dibujar(); },
  darVeredicto(veredicto) { partidaMulti.veredicto = veredicto; guardarMulti(); dibujar(); },
  terminarMulti() { partidaMulti = null; guardarMulti(); pantalla = 'menu'; dibujar(); },
  abandonar() {
    if (!confirmandoAbandono) {
      confirmandoAbandono = true;
      setTimeout(() => { confirmandoAbandono = false; if (pantalla === 'multi') dibujar(); }, 3000);
      dibujar(); return;
    }
    confirmandoAbandono = false; partidaMulti = null; guardarMulti(); pantalla = 'menu'; dibujar();
  },
});
