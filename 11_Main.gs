/**
 * 11_Main.gs
 * Punto de entrada de la Web App
 */

function doGet(e) {
  try {
    if (!e) e = { parameter: {} };
    return Router.resolve(e, 'GET');
  } catch (error) {
    Logger.log('❌ doGet: ' + error.message);
    return View.renderStandalone('Error_500', { errorMessage: error.message });
  }
}

function doPost(e) {
  try {
    if (!e) e = { parameter: {} };
    return Router.resolve(e, 'POST');
  } catch (error) {
    Logger.log('❌ doPost: ' + error.message);
    return View.renderStandalone('Error_500', { errorMessage: error.message });
  }
}

/**
 * Wrapper global para login desde google.script.run.
 * (google.script.run solo llama funciones globales, no clases)
 */
function Auth_login(payload) {
  var ctrl = new Ctrl_Auth();
  return ctrl.autenticar(payload);
}

/**
 * Wrapper global para logout desde google.script.run.
 */
function Auth_logout(token) {
  var ctrl = new Ctrl_Auth();
  return ctrl.logout(token);
}

/**
 * Ejecuta un método de controlador por nombre ("Controlador@metodo").
 */
function ejecutarController(ruta, params) {
  try {
    if (!ruta) throw new Error('Ruta no especificada');
    var parts = ruta.split('@');
    if (parts.length !== 2) throw new Error('Formato inválido, usar "Controlador@metodo"');

    var controllerName = parts[0];
    var methodName = parts[1];
    var controllerClass = globalThis['Ctrl_' + controllerName];

    if (!controllerClass) throw new Error('Controlador "Ctrl_' + controllerName + '" no encontrado');
    var instance = new controllerClass();
    if (typeof instance[methodName] !== 'function') throw new Error('Método "' + methodName + '" no existe');

    return instance[methodName](params || {});
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

Logger.log('🚀 ' + (typeof CONFIG !== 'undefined' ? CONFIG.APP_NAME : 'App') + ' iniciada');
