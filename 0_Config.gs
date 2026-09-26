/**
 * 0_Config.gs
 * Configuración global del Framework
 * -------------------------------------------------
 * Punto único de configuración de la app: nombre, spreadsheet
 * usado como base de datos y catálogo de "tablas" (hojas).
 */

var CONFIG = {

  APP_NAME: 'MiApp',

  APP_TAGLINE: 'Framework MVC · Google Apps Script',

  // ID del Spreadsheet que actúa como base de datos.
  // Dejalo vacío ('') para usar la hoja activa del proyecto.
  SPREADSHEET_ID: '',

  // Catálogo de tablas (hojas). Agregá una entrada por cada
  // hoja que necesites, ej: USERS: 'USERS'
  DB: {
    // USERS: 'USERS'
  }

};

function getConfig() {
  return CONFIG;
}

globalThis.CONFIG = CONFIG;
