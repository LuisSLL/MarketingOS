/**
 * 3_Engine_View.gs
 * Motor de renderizado con soporte para Layouts
 * -------------------------------------------------
 * Toda vista vive en un archivo "View_<Nombre>.html". El motor
 * evalúa primero la vista (child) y después el layout, inyectando
 * el HTML resultante en la variable "content" del layout.
 */
class View {

  static render(viewName, data = {}, layoutName = 'Layout_Main') {

    const view = HtmlService.createTemplateFromFile('View_' + viewName);
    Object.assign(view, data);
    view.scriptUrl = ScriptApp.getService().getUrl();

    const childContent = view.evaluate().getContent();

    const layout = HtmlService.createTemplateFromFile('View_' + layoutName);
    Object.assign(layout, data);

    layout.content = childContent;
    layout.title = data.title || CONFIG.APP_NAME;
    layout.scriptUrl = ScriptApp.getService().getUrl();
    layout.theme = typeof getTheme === 'function' ? getTheme() : 'light';

    return layout.evaluate()
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  /**
   * Renderiza una vista SIN layout (sin header/nav). Se usa para
   * páginas standalone: comprobantes, tickets, páginas de error.
   */
  static renderStandalone(viewName, data = {}) {
    const view = HtmlService.createTemplateFromFile('View_' + viewName);
    Object.assign(view, data);
    view.scriptUrl = ScriptApp.getService().getUrl();

    return view.evaluate()
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
}

globalThis.View = View;
