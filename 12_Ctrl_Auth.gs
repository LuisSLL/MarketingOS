/**
 * 12_Ctrl_Auth.gs
 * Controlador de autenticación
 * -------------------------------------------------
 * Por ahora solo muestra la pantalla de login (sin validar
 * credenciales todavía). Cuando tengas el modelo de usuarios,
 * acá se agrega la lógica real de login/logout/sesión.
 */

class Ctrl_Auth extends Base_Controller {

  // GET / y GET ?p=home  → puerta de entrada de la app
  login() {
    try {
      var data = {
        title: CONFIG.APP_NAME + ' · Login'
      };

      // Standalone: el login NO usa Layout_Main (no tiene sidebar/header)
      return View.renderStandalone('Login', data);

    } catch (error) {
      Logger.log('❌ Ctrl_Auth@login: ' + error.message);
      return View.renderStandalone('Error_500', { errorMessage: error.message });
    }
  }
}

globalThis.Ctrl_Auth = Ctrl_Auth;

Logger.log('✅ Ctrl_Auth registrado correctamente');

