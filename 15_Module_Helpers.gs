/**
 * 15_Module_Helpers.gs
 * Helpers compartidos por los módulos del Super Admin
 * -------------------------------------------------
 * Modelo B: sesiones persistidas en MASTER!SESSIONS.
 * El login escribe una fila con TOKEN; el guard valida el TOKEN.
 */

/**
 * Crea una sesión nueva en MASTER!SESSIONS y guarda el token en
 * PropertiesService. Devuelve el token generado.
 */
function sessionCreate_(userId) {
  var token = Utilities.getUuid();
  var horas = (CONFIG.AUTH && CONFIG.AUTH.SESSION_HOURS) || 8;
  var creado = new Date();
  var expira = new Date(creado.getTime() + horas * 60 * 60 * 1000);

  Base_Model.create(CONFIG.DB.SESSIONS, {
    ID: Base_Model.getNextId(CONFIG.DB.SESSIONS),
    USER_ID: userId,
    TOKEN: token,
    CREADO: creado,
    EXPIRA: expira
  });

  PropertiesService.getUserProperties().setProperty('sessionToken', token);
  return token;
}

/**
 * Destruye la sesión activa: elimina la fila de SESSIONS y borra
 * PropertiesService.
 */
function sessionDestroy_() {
  var props = PropertiesService.getUserProperties();
  var token = props.getProperty('sessionToken');

  if (token) {
    try {
      var sesiones = Base_Model.all(CONFIG.DB.SESSIONS);
      var sesion = sesiones.find(function (s) { return s.TOKEN === token; });
      if (sesion) {
        Base_Model.delete(CONFIG.DB.SESSIONS, sesion.ID);
      }
    } catch (e) {
      Logger.log('⚠ No se pudo eliminar la fila de SESSIONS: ' + e.message);
    }
  }

  props.deleteAllProperties();
}

/**
 * Guard de sesión.
 * @returns {{ok: boolean, response?: HtmlOutput, user?: Object}}
 *   ok=false → devolver `response` (redirige al login).
 *   ok=true  → `user` trae { id, email, rol, nombre }.
 */
function sessionGuard_() {
  var props = PropertiesService.getUserProperties();
  var token = props.getProperty('sessionToken');

  var redirect = function () {
    return {
      ok: false,
      response: HtmlService.createHtmlOutput(
        '<script>window.top.location.href="' + getWebAppUrl() + '?p=login";</script>'
      )
    };
  };

  if (!token) return redirect();

  var sesiones = Base_Model.all(CONFIG.DB.SESSIONS);
  var sesion = sesiones.find(function (s) { return s.TOKEN === token; });

  if (!sesion) {
    props.deleteAllProperties();
    return redirect();
  }

  // Validar expiración
  var expira = sesion.EXPIRA ? new Date(sesion.EXPIRA) : null;
  if (expira && expira.getTime() < Date.now()) {
    try {
      Base_Model.delete(CONFIG.DB.SESSIONS, sesion.ID);
    } catch (e) {}
    props.deleteAllProperties();
    return redirect();
  }

  // Buscar datos completos del usuario
  var usuarios = Base_Model.all(CONFIG.DB.USERS);
  var usuario = usuarios.find(function (u) {
    return String(u.ID) === String(sesion.USER_ID);
  }) || {};

  return {
    ok: true,
    user: {
      id: sesion.USER_ID,
      email: usuario.EMAIL || '',
      rol: usuario.ROL || '',
      nombre: usuario.NOMBRE || 'Usuario'
    }
  };
}

/**
 * Devuelve el usuario actual sin redirigir (para casos que ya
 * pasaron por sessionGuard_).
 */
function sessionGetUser_() {
  var guard = sessionGuard_();
  return guard.ok ? guard.user : null;
}

/**
 * Elimina sesiones vencidas (para trigger diario).
 */
function sessionCleanupExpired_() {
  try {
    var sesiones = Base_Model.all(CONFIG.DB.SESSIONS);
    var ahora = Date.now();
    var borradas = 0;

    sesiones.forEach(function (s) {
      var expira = s.EXPIRA ? new Date(s.EXPIRA).getTime() : 0;
      if (expira && expira < ahora) {
        Base_Model.delete(CONFIG.DB.SESSIONS, s.ID);
        borradas++;
      }
    });

    Logger.log('🧹 Sesiones vencidas eliminadas: ' + borradas);
    return borradas;
  } catch (e) {
    Logger.log('⚠ Error en limpieza de sesiones: ' + e.message);
    return 0;
  }
}

/**
 * Datos base que espera View_Layout_Main.html.
 */
function layoutData_(titulo, ruta, user, extra) {
  var data = {
    title: CONFIG.APP_NAME + ' · ' + titulo,
    appName: CONFIG.APP_NAME,
    appTagline: CONFIG.APP_TAGLINE,
    scriptUrl: getWebAppUrl(),
    activeRoute: ruta,
    user: user
  };
  Object.keys(extra || {}).forEach(function (k) { data[k] = extra[k]; });
  return data;
}

/**
 * Estado "real" de una suscripción.
 */
function calcularEstado_(estadoGuardado, vence) {
  var estado = (estadoGuardado || 'ACTIVO').toString().toUpperCase();
  if (estado === 'SUSPENDIDO') return 'SUSPENDIDO';
  if (estado === 'INACTIVO') return 'INACTIVO';
  if (!vence) return 'ACTIVO';

  var dias = Math.ceil((new Date(vence) - new Date()) / (1000 * 60 * 60 * 24));
  if (dias < 0) return 'VENCIDO';
  if (dias <= 7) return 'POR_VENCER';
  return 'ACTIVO';
}

/**
 * Convierte "YYYY-MM-DD" en Date al mediodía local.
 */
function parseFechaLocal_(valor) {
  if (!valor) return null;
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor.toString());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  var d = new Date(valor);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Registra una acción en MASTER!LOGS (best-effort).
 */
function registrarLogModulo_(accion, detalle) {
  try {
    var props = PropertiesService.getUserProperties();
    var token = props.getProperty('sessionToken');
    var userId = '';
    if (token) {
      var sesion = Base_Model.all(CONFIG.DB.SESSIONS).find(function (s) {
        return s.TOKEN === token;
      });
      if (sesion) userId = sesion.USER_ID;
    }
    Base_Model.create(CONFIG.DB.LOGS, {
      ID: Base_Model.getNextId(CONFIG.DB.LOGS),
      USER_ID: userId,
      ACCION: accion,
      DETALLE: detalle || '',
      FECHA: new Date()
    });
  } catch (e) {
    Logger.log('⚠ No se pudo registrar el log: ' + e.message);
  }
}



Logger.log('✅ Module helpers cargados (Modelo B: SESSIONS)');
