/**
 * 10_Helpers.gs
 * Funciones de utilidad global
 */

// --- UTILIDADES DE RUTA (WebApp) ---

const WebApp = {
  url: function(routeName) {
    const baseUrl = ScriptApp.getService().getUrl();
    return routeName ? `${baseUrl}?p=${routeName}` : baseUrl;
  },

  asset: function(path) {
    const baseUrl = ScriptApp.getService().getUrl();
    return `${baseUrl}?asset=${path}`;
  }
};

globalThis.WebApp = WebApp;

// --- SERIALIZACIÓN JSON PARA TEMPLATES (<?!= json_encode(...) ?>) ---

function json_encode(obj) {
  return JSON.stringify(obj);
}

globalThis.json_encode = json_encode;

// --- FORMATEO DE DATOS ---

function formatDate(date) {
  if (!date || !(date instanceof Date)) return date;
  const day = ('0' + date.getDate()).slice(-2);
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(date) {
  if (!date || !(date instanceof Date)) return date;
  const hours = ('0' + date.getHours()).slice(-2);
  const minutes = ('0' + date.getMinutes()).slice(-2);
  return formatDate(date) + ' - ' + hours + ':' + minutes;
}

function formatCurrency(amount) {
  if (amount === undefined || amount === null || amount === '') return '$ 0.00';
  return '$ ' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

globalThis.formatDate = formatDate;
globalThis.formatDateTime = formatDateTime;
globalThis.formatCurrency = formatCurrency;

// --- TEMA (DARK / LIGHT) ---

function getTheme() {
  var props = PropertiesService.getScriptProperties();
  return props.getProperty('theme') || 'light';
}

function setTheme(theme) {
  if (theme !== 'dark' && theme !== 'light') theme = 'light';
  var props = PropertiesService.getScriptProperties();
  props.setProperty('theme', theme);
  return theme;
}

globalThis.getTheme = getTheme;
globalThis.setTheme = setTheme;
