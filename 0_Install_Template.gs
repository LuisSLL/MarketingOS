/**
 * 0_Install_Template.gs
 * Instalador del Spreadsheet TEMPLATE
 * -------------------------------------------------
 * Ejecutar UNA VEZ desde el editor de Apps Script, función
 * "instalarTemplate". Crea un Spreadsheet nuevo con las 11 tabs
 * que se clonan para cada cliente (sección 11 del README).
 *
 * Al terminar, copiá el ID que imprime en el Logger y pegalo en
 * CONFIG.TEMPLATE_ID (0_Config.gs).
 *
 * Es SEGURO volver a ejecutarla: cada corrida crea un Spreadsheet
 * nuevo (no pisa el anterior), así que si te equivocás simplemente
 * la corrés de nuevo y usás el ID más reciente.
 */

function instalarTemplate() {

  var nombreTemplate = (typeof CONFIG !== 'undefined' ? CONFIG.APP_NAME : 'MarketingOS') + '_TEMPLATE';
  var ss = SpreadsheetApp.create(nombreTemplate);

  // Definición de tabs: [ nombre, [encabezados] ]
  var tabs = [
    ['USERS',     ['ID', 'EMAIL', 'PASSWORD_HASH', 'NOMBRE', 'ROL', 'ACTIVO', 'CREADO', 'ULTIMO_LOGIN']],
    ['Leads',     ['ID', 'NOMBRE', 'EMAIL', 'TELEFONO', 'ORIGEN', 'ESTADO', 'CREADO']],
    ['Sales',     ['ID', 'LEAD_ID', 'MONTO', 'MONEDA', 'ESTADO', 'FECHA']],
    ['Campaigns', ['ID', 'NOMBRE', 'CANAL', 'ESTADO', 'PRESUPUESTO', 'INICIO', 'FIN']],
    ['AdSets',    ['ID', 'CAMPAIGN_ID', 'NOMBRE', 'PRESUPUESTO', 'ESTADO']],
    ['Ads',       ['ID', 'ADSET_ID', 'NOMBRE', 'TIPO', 'ESTADO', 'CREATIVO_URL']],
    ['Budgets',   ['ID', 'CAMPAIGN_ID', 'MONTO', 'PERIODO']],
    ['Reports',   ['ID', 'CAMPAIGN_ID', 'IMPRESIONES', 'CLICS', 'CONVERSIONES', 'GASTO', 'FECHA']],
    ['Clients',   ['ID', 'NOMBRE', 'EMAIL', 'TELEFONO', 'ESTADO', 'CREADO']],
    ['Tasks',     ['ID', 'TITULO', 'ASIGNADO_A', 'ESTADO', 'VENCE', 'CREADO']],
    ['Tokens',    ['token', 'email', 'expira']]
  ];

  tabs.forEach(function (tab) {
    var nombre = tab[0];
    var headers = tab[1];
    var sheet = ss.insertSheet(nombre);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  });

  // La tab "Settings" no es una tabla: son 3 valores clave/valor que
  // 14_Ctrl_Clientes.gs completa al crear cada cliente (B1/B2/B3).
  var settings = ss.insertSheet('Settings');
  settings.getRange('A1').setValue('token');
  settings.getRange('A2').setValue('owner_email');
  settings.getRange('A3').setValue('vence');
  settings.getRange('A1:A3').setFontWeight('bold');

  // Google crea una "Sheet1" por defecto al hacer SpreadsheetApp.create();
  // la borramos porque ya tenemos las 11 tabs reales.
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1) ss.deleteSheet(sheet1);

  Logger.log('✅ TEMPLATE creado: ' + nombreTemplate);
  Logger.log('📋 ID del Spreadsheet: ' + ss.getId());
  Logger.log('🔗 URL: ' + ss.getUrl());

  // Se guarda automáticamente: CONFIG.TEMPLATE_ID lo lee de acá,
  // no hace falta copiar/pegar el ID a mano en 0_Config.gs.
  PropertiesService.getScriptProperties().setProperty('TEMPLATE_ID', ss.getId());
  Logger.log('✅ Guardado en Script Properties como TEMPLATE_ID. CONFIG.TEMPLATE_ID ya lo va a detectar solo.');

  return ss.getId();
}
