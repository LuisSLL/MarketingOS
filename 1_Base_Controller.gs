/**
 * 1_Base_Controller.gs
 * Controlador base del Framework
 * -------------------------------------------------
 * Todos los controladores (Ctrl_*) extienden esta clase para
 * heredar renderizado de vistas, redirecciones y respuestas JSON.
 */

class Base_Controller {

  /**
   * Renderiza una vista envuelta en un layout.
   * @param {string} viewName Nombre lógico de la vista (sin el prefijo "View_")
   * @param {Object} data     Datos inyectados en la vista y en el layout
   * @param {string} layout   Nombre lógico del layout (sin el prefijo "View_")
   */
  view(viewName, data = {}, layout = 'Layout_Main') {
    return View.render(viewName, data, layout);
  }

  /**
   * Renderiza una vista SIN layout. Útil para páginas standalone:
   * comprobantes, tickets, páginas de error, etc.
   */
  viewStandalone(viewName, data = {}) {
    return View.renderStandalone(viewName, data);
  }

  /**
   * Redirección HTTP simple (meta-refresh + JS) hacia otra ruta con nombre.
   * @param {string} routeName Nombre de la ruta (ej: 'home')
   */
  redirect(routeName) {
    var url = WebApp.url(routeName);
    var html = '<!DOCTYPE html><html><head><base target="_top">' +
      '<meta http-equiv="refresh" content="0; url=' + url + '">' +
      '<script>window.top.location.href = ' + JSON.stringify(url) + ';</script>' +
      '</head><body>Redireccionando...</body></html>';
    return HtmlService.createHtmlOutput(html)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  /**
   * Genera una respuesta JSON estándar, pensada para llamadas desde
   * google.script.run o para requests POST manejados por el Router.
   *
   * @param {boolean} success
   * @param {string} message
   * @param {Object|string} extra  Objeto con datos extra, o el nombre de una
   *                                ruta a la que redirigir tras el éxito.
   */
  jsonResponse(success, message, extra = {}) {

    // Si "extra" es un string, se interpreta como nombre de ruta.
    if (typeof extra === 'string') {
      var routeName = extra;
      extra = {
        url: WebApp.url(routeName),
        redirect: !!routeName,
        route: routeName
      };
    }

    return {
      success: success,
      message: message,
      timestamp: new Date().getTime(),
      ...extra
    };
  }
}

// Registro global: necesario para que el Router pueda instanciar
// las subclases Ctrl_* buscándolas por nombre.
globalThis.Base_Controller = Base_Controller;
