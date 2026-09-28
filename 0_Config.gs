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
    LOGS: 'LOGS',
    CLIENTS: 'Clients',
    SUBSCRIPTIONS: 'Subscriptions',
    PAYMENTS: 'Payments'
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

/**
 * ID del Spreadsheet TEMPLATE (11 tabs: Leads, Sales, Campaigns,
 * AdSets, Ads, Budgets, Reports, Clients, Tasks, Settings, Tokens)
 * que se clona para cada cliente nuevo.
 *
 * Se autodetecta: instalarTemplate() (0_Install_Template.gs) lo
 * guarda en Script Properties apenas lo crea, y CONFIG.TEMPLATE_ID
 * lo lee de ahí automáticamente. No hace falta copiar/pegar el ID
 * a mano.
 */
Object.defineProperty(CONFIG, 'TEMPLATE_ID', {
  get: function () {
    return PropertiesService.getScriptProperties().getProperty('TEMPLATE_ID') || '';
  },
  enumerable: true,
  configurable: true
});

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
