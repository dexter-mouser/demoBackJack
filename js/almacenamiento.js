// Lectura y escritura en localStorage, con valores por defecto si falla.
const almacen = {
  leer(clave, porDefecto) {
    try { const texto = localStorage.getItem(clave); return texto ? JSON.parse(texto) : porDefecto; }
    catch (error) { return porDefecto; }
  },
  guardar(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (error) { }
  },
};

const COLORES = ['#2563eb', '#dc2626', '#16a34a', '#ea580c', '#9333ea', '#db2777'];
const CLAVES = { perfil: 'blackjack:perfil', solo: 'blackjack:solo', multi: 'blackjack:multi' };

let perfil = almacen.leer(CLAVES.perfil, { nombre: '', color: COLORES[0], tema: '' });
let progreso = almacen.leer(CLAVES.solo, { fichas: 1000, ganadas: 0, perdidas: 0, empates: 0, ultimaApuesta: 0 });
let partidaMulti = almacen.leer(CLAVES.multi, null);

const guardarPerfil = () => almacen.guardar(CLAVES.perfil, perfil);
const guardarProgreso = () => almacen.guardar(CLAVES.solo, progreso);
const guardarMulti = () => almacen.guardar(CLAVES.multi, partidaMulti);
