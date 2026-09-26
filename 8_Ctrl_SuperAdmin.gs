/**
 * 8_Ctrl_SuperAdmin.gs
 * Controlador del panel de Super Admin (ex Ctrl_Home)
 * -------------------------------------------------
 * El login ahora es la puerta de entrada de la app (ver Ctrl_Auth.gs).
 * Este controlador sirve el Dashboard una vez que el usuario ya
 * inició sesión.
 */

class Ctrl_SuperAdmin extends Base_Controller {

  // GET ?p=dashboard
  index() {
    try {
      var data = {
        title: CONFIG.APP_NAME + ' · Dashboard',
        appName: CONFIG.APP_NAME,
        appTagline: CONFIG.APP_TAGLINE
      };

      return this.view('Dashboard', data, 'Layout_Main');

    } catch (error) {
      Logger.log('❌ Ctrl_SuperAdmin@index: ' + error.message);
      return View.renderStandalone('Error_500', { errorMessage: error.message });
    }
  }
}

globalThis.Ctrl_SuperAdmin = Ctrl_SuperAdmin;

Logger.log('✅ Ctrl_SuperAdmin registrado correctamente');
