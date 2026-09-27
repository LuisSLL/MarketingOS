/**
 * 13_Ctrl_Cliente.gs
 * Controlador del Dashboard del Cliente
 * -------------------------------------------------
 * Por ahora solo muestra la vista con datos de ejemplo (sin
 * conectar todavía con el Spreadsheet). Cuando tengas los modelos
 * de Campañas/Clientes/Leads, acá se reemplazan los datos fijos
 * por las consultas reales.
 */

class Ctrl_Cliente extends Base_Controller {

  // GET ?p=cliente
  index() {
    try {
      var data = {
        title: CONFIG.APP_NAME + ' · Dashboard'
      };

      return this.view('Dashboard_Cliente', data, 'Layout_Cliente');

    } catch (error) {
      Logger.log('❌ Ctrl_Cliente@index: ' + error.message);
      return View.renderStandalone('Error_500', { errorMessage: error.message });
    }
  }
}

globalThis.Ctrl_Cliente = Ctrl_Cliente;

Logger.log('✅ Ctrl_Cliente registrado correctamente');
