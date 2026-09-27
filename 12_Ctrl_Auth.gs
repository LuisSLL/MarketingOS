/**
 * 12_Ctrl_Auth.gs
 * Controlador de autenticación (patrón GASVEL)
 * -------------------------------------------------
 * - Sesión persistida en PropertiesService (servidor)
 * - Redirección con URL absoluta de la Web App
 * - Usa Base_Model de forma ESTÁTICA
 */

class Ctrl_Auth extends Base_Controller {

  // =====================================================
  // VISTA LOGIN
  // =====================================================

  /**
   * GET ?p=login
   * Muestra la pantalla de login (standalone, sin layout).
   */
  login(params) {
    try {
      params = params || {};
      var next = params.next || '';

      return View.renderStandalone('Login', {
        title: CONFIG.APP_NAME + ' · Login',
        nextRoute: next,
        scriptUrl: getWebAppUrl()
      });
    } catch (error) {
      Logger.log('❌ Ctrl_Auth@login: ' + error.message);
      return View.renderStandalone('Error_500', { errorMessage: error.message });
    }
  }

  /**
   * Autentica al usuario. Invocado desde google.script.run.
   * @param {Object} data { email, password, next }
   */
  autenticar(data) {
    Logger.log('==> [autenticar] Payload: ' + JSON.stringify({
      email: data ? data.email : null,
      passLength: data && data.password ? data.password.length : 0
    }));

    if (!data || !data.email || !data.password) {
      return { success: false, message: 'Email y contraseña son obligatorios.' };
    }

    var email = data.email.toString().trim().toLowerCase();
    var pass = data.password.toString();

    var user = Base_Model.all(CONFIG.DB.USERS).find(function(u) {
      return u.EMAIL && u.EMAIL.toString().trim().toLowerCase() === email;
    });

    if (!user) {
      Logger.log('⚠ Usuario no encontrado: ' + email);
      return { success: false, message: 'Usuario no encontrado o inactivo.' };
    }

    var activo = (user.ACTIVO === true || String(user.ACTIVO).toUpperCase() === 'TRUE');
    if (!activo) {
      Logger.log('⚠ Usuario inactivo: ' + email);
      return { success: false, message: 'Usuario no encontrado o inactivo.' };
    }

    var hashedInput = this.hashPassword_(pass);
    if (user.PASSWORD_HASH !== hashedInput) {
      Logger.log('❌ Hash no coincide para: ' + email);
      return { success: false, message: 'La contraseña es incorrecta.' };
    }

    // ====== SESIÓN EN PROPIEDADES DEL USUARIO (persistente) ======
    var userProps = PropertiesService.getUserProperties();
    userProps.setProperty('userEmail', email);
    userProps.setProperty('userId', String(user.ID));
    userProps.setProperty('userRol', String(user.ROL));

    var userData = {
      id: user.ID,
      nombre: user.NOMBRE,
      email: user.EMAIL,
      rol: user.ROL
    };

    // Registrar log
    this.registrarLog_(user.ID, 'LOGIN', 'Ingreso exitoso');

    // ====== URL ABSOLUTA DE REDIRECCIÓN ======
    var baseUrl = getWebAppUrl();
    var redirectUrl = baseUrl + '?p=dashboard';

    // Si vino un next válido
    var allowedNext = ['dashboard'];
    if (data.next && allowedNext.indexOf(data.next) !== -1) {
      redirectUrl = baseUrl + '?p=' + data.next;
    }

    Logger.log('✅ Login exitoso. Redirect: ' + redirectUrl);

    return {
      success: true,
      message: '¡Login exitoso!',
      user: userData,
      url: redirectUrl
    };
  }

  /**
   * Cierra la sesión: borra Properties y devuelve URL absoluta al login.
   */
  logout() {
    Logger.log('==> [logout] Limpiando PropertiesService...');
    var userProps = PropertiesService.getUserProperties();
    userProps.deleteAllProperties();

    return {
      success: true,
      url: getWebAppUrl() + '?p=login'
    };
  }

  // =====================================================
  // HELPERS PRIVADOS
  // =====================================================

  hashPassword_(password) {
    var raw = password + CONFIG.AUTH.SALT;
    var digest = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      raw,
      Utilities.Charset.UTF_8
    );
    return digest.map(function(b) {
      return ('0' + (b & 0xFF).toString(16)).slice(-2);
    }).join('');
  }

  registrarLog_(userId, accion, detalle) {
    try {
      var nuevoId = Base_Model.getNextId(CONFIG.DB.LOGS);
      Base_Model.create(CONFIG.DB.LOGS, {
        ID: nuevoId,
        USER_ID: userId,
        ACCION: accion,
        DETALLE: detalle,
        FECHA: new Date()
      });
    } catch (e) {
      Logger.log('⚠ No se pudo registrar log: ' + e.message);
    }
  }
}

globalThis.Ctrl_Auth = Ctrl_Auth;

// =====================================================
// PUENTES PARA google.script.run
// =====================================================

function login(data) {
  var ctrl = new Ctrl_Auth();
  return JSON.stringify(ctrl.autenticar(data || {}));
}

function logout() {
  var ctrl = new Ctrl_Auth();
  return JSON.stringify(ctrl.logout());
}

Logger.log('✅ Ctrl_Auth registrado correctamente');
