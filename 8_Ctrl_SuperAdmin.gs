/**
 * 8_Ctrl_SuperAdmin.gs
 * Dashboard del Super Admin.
 */

class Ctrl_SuperAdmin extends Base_Controller {

  index() {
    try {
      var guard = sessionGuard_();
      if (!guard.ok) return guard.response;

      var respClientes = new Ctrl_Clientes().listar();
      var clientes = respClientes.success ? respClientes.clientes : [];

      var respPagos = new Ctrl_Pagos().listar();
      var pagos = respPagos.success ? respPagos.pagos : [];

      var metrics = {
        mrr: clientes.reduce(function (acc, c) {
          return acc + (c.estadoCalculado !== 'INACTIVO' ? (Number(c.monto) || 0) : 0);
        }, 0),
        activos: clientes.filter(function (c) { return c.estadoCalculado === 'ACTIVO'; }).length,
        porVencer: clientes.filter(function (c) { return c.estadoCalculado === 'POR_VENCER'; }).length,
        bloqueados: clientes.filter(function (c) {
          return c.estadoCalculado === 'VENCIDO'
              || c.estadoCalculado === 'SUSPENDIDO'
              || c.estadoCalculado === 'INACTIVO';
        }).length
      };

      return this.view('Dashboard', layoutData_('Dashboard', 'dashboard', guard.user, {
        clientes: clientes,
        pagos: pagos,
        metrics: metrics
      }), 'Layout_Main');

    } catch (error) {
      Logger.log('❌ Ctrl_SuperAdmin@index: ' + error.message);
      return View.renderStandalone('Error_500', { errorMessage: error.message });
    }
  }
}

globalThis.Ctrl_SuperAdmin = Ctrl_SuperAdmin;

Logger.log('✅ Ctrl_SuperAdmin registrado');
