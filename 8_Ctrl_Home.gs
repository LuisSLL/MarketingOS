/**
 * 8_Ctrl_Home.gs
 * Controlador de bienvenida del Framework
 * -------------------------------------------------
 * Sirve como ejemplo de controlador y punto de partida: mostrá
 * este archivo como plantilla para tus propios Ctrl_*.gs
 */

class Ctrl_Home extends Base_Controller {

  // GET / y GET ?p=home
  index() {
    try {
      var data = {
        title: CONFIG.APP_NAME + ' · Dashboard',
        appName: CONFIG.APP_NAME,
        appTagline: CONFIG.APP_TAGLINE
      };

      return this.view('Dashboard', data, 'Layout_Main');

    } catch (error) {
      Logger.log('❌ Ctrl_Home@index: ' + error.message);
      return View.renderStandalone('Error_500', { errorMessage: error.message });
    }
  }
}

globalThis.Ctrl_Home = Ctrl_Home;

Logger.log('✅ Ctrl_Home registrado correctamente');
