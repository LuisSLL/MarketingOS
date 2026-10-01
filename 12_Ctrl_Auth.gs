/**
 * 12_Ctrl_Auth.gs
 * Autenticación con sesiones persistidas en MASTER!SESSIONS.
 */

class Ctrl_Auth extends Base_Controller {

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
   * Autentica y crea sesión en SESSIONS.
   */
  autenticar(data) {
    if (!data || !data.email || !data.password) {
      return { success: false, message: 'Email y contraseña son obligatorios.' };
    }

    var email = data.email.toString().trim().toLowerCase();
    var pass = data.password.toString();

    var user = Base_Model.all(CONFIG.DB.USERS).find(function (u) {
      return u.EMAIL && u.EMAIL.toString().trim().toLowerCase() === email;
    });

    if (!user) {
      return { success: false, message: 'Usuario no encontrado o inactivo.' };
    }

    var activo = (user.ACTIVO === true || String(user.ACTIVO).toUpperCase() === 'TRUE');
    if (!activo) {
      return { success: false, message: 'Usuario no encontrado o inactivo.' };
    }

    var hashedInput = this.hashPassword_(pass);
    if (user.PASSWORD_HASH !== hashedInput) {
      return { success: false, message: 'La contraseña es incorrecta.' };
    }

    // ====== CREAR SESIÓN EN MASTER!SESSIONS ======
    sessionCreate_(user.ID);

    var userData = {
      id: user.ID,
      nombre: user.NOMBRE,
      email: user.EMAIL,
      rol: user.ROL
    };

    this.registrarLog_(user.ID, 'LOGIN', 'Ingreso exitoso');

    var baseUrl = getWebAppUrl();
    var redirectUrl = baseUrl + '?p=dashboard';
    var allowedNext = ['dashboard', 'clientes', 'pagos', 'suscripciones', 'facturacion'];
    if (data.next && allowedNext.indexOf(data.next) !== -1) {
      redirectUrl = baseUrl + '?p=' + data.next;
    }

    Logger.log('✅ Login OK. Redirect: ' + redirectUrl);

    return {
      success: true,
      message: '¡Login exitoso!',
      user: userData,
      url: redirectUrl
    };
  }

  /**
   * Cierra sesión: elimina la fila de SESSIONS y limpia Properties.
   */
  logout() {
    sessionDestroy_();
    return {
      success: true,
      url: getWebAppUrl() + '?p=login'
    };
  }

  hashPassword_(password) {
    var raw = password + CONFIG.AUTH.SALT;
    var digest = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      raw,
      Utilities.Charset.UTF_8
    );
    return digest.map(function (b) {
      return ('0' + (b & 0xFF).toString(16)).slice(-2);
    }).join('');
  }

  registrarLog_(userId, accion, detalle) {
    try {
      Base_Model.create(CONFIG.DB.LOGS, {
        ID: Base_Model.getNextId(CONFIG.DB.LOGS),
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

function login(data) {
  var ctrl = new Ctrl_Auth();
  return JSON.stringify(ctrl.autenticar(data || {}));
}

function logout() {
  var ctrl = new Ctrl_Auth();
  return JSON.stringify(ctrl.logout());
}

function testSesionActual() {
  var props = PropertiesService.getUserProperties();
  Logger.log('📋 Todas las Properties actuales:');
  Logger.log(JSON.stringify(props.getProperties(), null, 2));
  Logger.log('🔑 sessionToken: ' + props.getProperty('sessionToken'));
  Logger.log('📧 userEmail: ' + props.getProperty('userEmail'));
  Logger.log('👤 userId: ' + props.getProperty('userId'));
}



Logger.log('✅ Ctrl_Auth registrado (Modelo B)');
