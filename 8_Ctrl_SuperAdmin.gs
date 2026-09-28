/**
 * 8_Ctrl_SuperAdmin.gs
 * Controlador del panel de Super Admin (ex Ctrl_Home)
 * -------------------------------------------------
 * Valida que exista sesión activa antes de renderizar el dashboard.
 * Si no hay sesión, redirige al login.
 */

class Ctrl_SuperAdmin extends Base_Controller {

  // GET ?p=dashboard
  index() {
    try {
      // ==========================================
      // 1. GUARD DE SESIÓN EN EL SERVIDOR
      // ==========================================
      var userProps = PropertiesService.getUserProperties();
      var userEmail = userProps.getProperty('userEmail');

      if (!userEmail) {
        Logger.log('⚠ Sin sesión activa. Redirigiendo a login...');
        return HtmlService.createHtmlOutput(
          '<script>window.top.location.href="' + getWebAppUrl() + '?p=login";</script>'
        );
      }

      // ==========================================
      // 2. DATOS PARA LA VISTA
      // ==========================================
      var userId = userProps.getProperty('userId');
      var userRol = userProps.getProperty('userRol');

      // Buscar datos completos del usuario
      var usuario = Base_Model.all(CONFIG.DB.USERS).find(function(u) {
        return String(u.ID) === String(userId);
      }) || {};

      // Clientes + suscripciones reales (reutiliza Ctrl_Clientes.listar())
      var respClientes = new Ctrl_Clientes().listar();
      var clientes = respClientes.success ? respClientes.clientes : [];

      // Pagos reales (reutiliza Ctrl_Pagos.listar())
      var respPagos = new Ctrl_Pagos().listar();
      var pagos = respPagos.success ? respPagos.pagos : [];

      // Métricas reales calculadas sobre los clientes
      var metrics = {
        mrr: clientes.reduce(function (acc, c) {
          return acc + (c.estadoCalculado !== 'INACTIVO' ? (Number(c.monto) || 0) : 0);
        }, 0),
        activos: clientes.filter(function (c) { return c.estadoCalculado === 'ACTIVO'; }).length,
        porVencer: clientes.filter(function (c) { return c.estadoCalculado === 'POR_VENCER'; }).length,
        bloqueados: clientes.filter(function (c) {
          return c.estadoCalculado === 'VENCIDO' || c.estadoCalculado === 'SUSPENDIDO' || c.estadoCalculado === 'INACTIVO';
        }).length
      };

      var data = {
        title: CONFIG.APP_NAME + ' · Dashboard',
        appName: CONFIG.APP_NAME,
        appTagline: CONFIG.APP_TAGLINE,
        scriptUrl: getWebAppUrl(),
        user: {
          id: userId,
          email: userEmail,
          rol: userRol,
          nombre: usuario.NOMBRE || 'Usuario'
        },
        clientes: clientes,
        pagos: pagos,
        metrics: metrics
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
