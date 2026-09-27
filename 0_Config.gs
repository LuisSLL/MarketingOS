/**
 * 0_Config.gs
 * Configuración global del Framework
 * -------------------------------------------------
 * Punto único de configuración de la app: nombre, spreadsheet
 * usado como base de datos y catálogo de "tablas" (hojas).
 */

var CONFIG = {

  APP_NAME: 'MarketingOS',

  APP_TAGLINE: 'Bolivia Saas',

  // ID del Spreadsheet que actúa como base de datos MASTER.
  SPREADSHEET_ID: '1nmagQxWkjN55le_3OWifJXhk7xuzVs68aJXB1I6ldFk',

  // Catálogo de tablas (hojas) del MASTER.
  DB: {
    USERS: 'USERS',
    SESSIONS: 'SESSIONS',
    LOGS: 'LOGS'
  },

  // Seguridad
  AUTH: {
    SALT: 'marketingos_salt_2026',
    SESSION_HOURS: 8
  },

  // Roles del sistema
  ROLES: {
    SUPER_ADMIN: 1,
    ADMIN: 2,
    CLIENTE: 4
  }

};

function getConfig() {
  return CONFIG;
}

/**
 * URL oficial de la Web App.
 * Evita que la redirección caiga en el iframe de googleusercontent.com.
 */
function getWebAppUrl() {
  return ScriptApp.getService().getUrl();
}

globalThis.CONFIG = CONFIG;
