// Acciones generales, eventos y arranque de la aplicación.
Object.assign(acciones, {
  cambiarTema() { perfil.tema = esOscuro() ? 'claro' : 'oscuro'; guardarPerfil(); dibujar(); },
  elegirColor(color) { perfil.nombre = seleccionar('#campoNombre').value.trim(); perfil.color = color; dibujar(); },
  guardarPerfilYSeguir() {
    const nombre = seleccionar('#campoNombre').value.trim();
    if (!nombre) { seleccionar('#campoNombre').focus(); return; }
    perfil.nombre = nombre; guardarPerfil(); pantalla = 'menu'; dibujar();
  },
  editarPerfil() { pantalla = 'inicio'; dibujar(); },
  irAlMenu() { pantalla = 'menu'; dibujar(); },
  verAyuda() { pantallaAnterior = pantalla; pantalla = 'ayuda'; dibujar(); },
  volver() { pantalla = pantallaAnterior; dibujar(); },
});

// Un solo escuchador de clics: cada botón indica su acción en data-accion.
seleccionar('#aplicacion').addEventListener('click', evento => {
  const boton = evento.target.closest('[data-accion]');
  if (boton && !boton.disabled && acciones[boton.dataset.accion]) acciones[boton.dataset.accion](boton.dataset.valor);
});

seleccionar('#aplicacion').addEventListener('input', evento => {
  if (evento.target.id === 'campoCodigo') estadoSala.texto = evento.target.value;
  if (evento.target.id === 'colorLibre') {
    perfil.color = evento.target.value;
    document.documentElement.style.setProperty('--acento', perfil.color);
  }
});

dibujar();
