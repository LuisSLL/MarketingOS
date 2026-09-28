/**
 * 0_Install.gs
 * Instalador del Spreadsheet MASTER
 * -------------------------------------------------
 * Ejecutar UNA VEZ (o las veces que quieras: es idempotente,
 * Base_Model.createTable no toca una hoja que ya existe) desde
 * el editor de Apps Script, función "instalar".
 *
 * Crea las hojas de MASTER con sus encabezados y, si USERS está
 * vacía, siembra el usuario Super Admin inicial.
 */

function instalar() {

  // ==========================================
  // 1. TABLAS
  // ==========================================
  Base_Model.createTable(CONFIG.DB.USERS, [
    'ID', 'EMAIL', 'PASSWORD_HASH', 'NOMBRE', 'ROL', 'ACTIVO', 'CREADO', 'ULTIMO_LOGIN'
  ]);

  Base_Model.createTable(CONFIG.DB.SESSIONS, [
    'ID', 'USER_ID', 'TOKEN', 'CREADO', 'EXPIRA'
  ]);

  Base_Model.createTable(CONFIG.DB.LOGS, [
    'ID', 'USER_ID', 'ACCION', 'DETALLE', 'FECHA'
  ]);

  Base_Model.createTable(CONFIG.DB.CLIENTS, [
    'ID', 'NOMBRE', 'EMAIL', 'TELEFONO', 'CIUDAD', 'SPREADSHEET_ID', 'ESTADO', 'CREADO'
  ]);

  Base_Model.createTable(CONFIG.DB.SUBSCRIPTIONS, [
    'ID', 'CLIENT_ID', 'SPREADSHEET_ID', 'PLAN', 'MONTO', 'MONEDA', 'METODO_PAGO', 'TOKEN', 'ESTADO', 'VENCE', 'CREADO'
  ]);

  Base_Model.createTable(CONFIG.DB.PAYMENTS, [
    'ID', 'CLIENT_ID', 'SUBSCRIPTION_ID', 'MONTO', 'MONEDA', 'METODO', 'ESTADO', 'FECHA', 'NOTAS'
  ]);

  Logger.log('✅ Tablas de MASTER verificadas/creadas.');

  // ==========================================
  // 2. ADMIN INICIAL (solo si USERS está vacía)
  // ==========================================
  var usuarios = Base_Model.all(CONFIG.DB.USERS);

  if (usuarios.length === 0) {
    var ctrlAuth = new Ctrl_Auth();
    var passwordPorDefecto = 'admin123';
    var hash = ctrlAuth.hashPassword_(passwordPorDefecto);

    Base_Model.create(CONFIG.DB.USERS, {
      ID: 1,
      EMAIL: 'admin@marketingos.bo',
      PASSWORD_HASH: hash,
      NOMBRE: 'Super Admin',
      ROL: CONFIG.ROLES.SUPER_ADMIN,
      ACTIVO: true,
      CREADO: new Date(),
      ULTIMO_LOGIN: ''
    });

    Logger.log('✅ Admin inicial creado:');
    Logger.log('   Email:    admin@marketingos.bo');
    Logger.log('   Password: ' + passwordPorDefecto);
    Logger.log('   ⚠ Cambiá esta contraseña apenas puedas iniciar sesión.');
  } else {
    Logger.log('ℹ️ USERS ya tiene ' + usuarios.length + ' registro(s); no se creó ningún admin nuevo.');
  }

  Logger.log('🚀 Instalación de MASTER completa.');
}

/**
 * Migración no destructiva: si ya habías corrido instalar() antes de
 * que se agregaran columnas nuevas (TELEFONO, CIUDAD, PLAN, MONTO,
 * MONEDA, METODO_PAGO), esta función las agrega al final de la hoja
 * SIN tocar los datos existentes. Base_Model.createTable no sirve acá
 * porque no toca una hoja que ya existe.
 *
 * Ejecutar UNA VEZ, después de actualizar el código, si ya tenías
 * clientes/suscripciones cargados con el modelo viejo.
 */
function migrarModeloDatos() {
  var definiciones = [
    [CONFIG.DB.CLIENTS, ['ID', 'NOMBRE', 'EMAIL', 'TELEFONO', 'CIUDAD', 'SPREADSHEET_ID', 'ESTADO', 'CREADO']],
    [CONFIG.DB.SUBSCRIPTIONS, ['ID', 'CLIENT_ID', 'SPREADSHEET_ID', 'PLAN', 'MONTO', 'MONEDA', 'METODO_PAGO', 'TOKEN', 'ESTADO', 'VENCE', 'CREADO']],
    [CONFIG.DB.PAYMENTS, ['ID', 'CLIENT_ID', 'SUBSCRIPTION_ID', 'MONTO', 'MONEDA', 'METODO', 'ESTADO', 'FECHA', 'NOTAS']]
  ];

  definiciones.forEach(function (def) {
    var nombreHoja = def[0];
    var headersDeseados = def[1];
    var sheet = Base_Model.sheet(nombreHoja);

    if (!sheet) {
      Logger.log('ℹ️ ' + nombreHoja + ' no existe todavía; la crea instalar().');
      return;
    }

    var ultimaCol = sheet.getLastColumn();
    var headersActuales = ultimaCol > 0
      ? sheet.getRange(1, 1, 1, ultimaCol).getValues()[0]
      : [];

    var faltantes = headersDeseados.filter(function (h) {
      return headersActuales.indexOf(h) === -1;
    });

    if (faltantes.length === 0) {
      Logger.log('✅ ' + nombreHoja + ' ya tiene todas las columnas.');
      return;
    }

    var col = ultimaCol + 1;
    faltantes.forEach(function (h) {
      sheet.getRange(1, col).setValue(h).setFontWeight('bold');
      col++;
    });

    Logger.log('✅ ' + nombreHoja + ': agregadas columnas ' + faltantes.join(', '));
  });

  Logger.log('🚀 Migración de modelo de datos completa.');
}
