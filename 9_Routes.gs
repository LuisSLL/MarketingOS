/**
 * 9_Routes.gs
 * Router simplificado
 * -------------------------------------------------
 * Mapea rutas con nombre (?p=...) a métodos de controladores
 * ("Controlador@metodo"). Soporta parámetros dinámicos (:id).
 */

var __ROUTES__ = {
  GET: {},
  POST: {}
};

class Route {
  static get(path, target) { __ROUTES__.GET[path] = target; }
  static post(path, target) { __ROUTES__.POST[path] = target; }
  static find(path, method) {
    return __ROUTES__[method] ? __ROUTES__[method][path] : null;
  }
  static findWithParams(path, method) {
    var routes = __ROUTES__[method] || {};
    for (var routePattern in routes) {
      if (routes.hasOwnProperty(routePattern)) {
        var target = routes[routePattern];
        var regexPattern = routePattern.replace(/\//g, '\\/').replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '(?<$1>[^/]+)');
        var regex = new RegExp('^' + regexPattern + '$');
        var match = path.match(regex);
        if (match) {
          var params = match.groups || {};
          return { target: target, params: params };
        }
      }
    }
    return null;
  }
}

var Router = {
  resolve: function(e, method) {
    try {
      if (!e) e = { parameter: {} };
      if (!e.parameter) e.parameter = {};

      var routePath = e.parameter.p || e.parameter.route || 'home';
      Logger.log('🔍 Router: ' + method + ' ' + routePath);

      var target = Route.find(routePath, method);
      var params = {};

      if (!target) {
        var result = Route.findWithParams(routePath, method);
        if (result) { target = result.target; params = result.params; }
      }

      if (!target) {
        Logger.log('⚠️ Ruta no encontrada: ' + routePath);
        return View.renderStandalone('Error_404', { routeAttempted: routePath });
      }

      var parts = target.split('@');
      var controllerName = parts[0];
      var methodName = parts[1];

      var controllerClass = globalThis['Ctrl_' + controllerName];
      if (!controllerClass) {
        return View.renderStandalone('Error_500', { errorMessage: 'Controlador "Ctrl_' + controllerName + '" no encontrado' });
      }

      var instance = new controllerClass();

      if (typeof instance[methodName] !== 'function') {
        return View.renderStandalone('Error_500', { errorMessage: 'Método "' + methodName + '" no encontrado en Ctrl_' + controllerName });
      }

      var allParams = {};
      for (var key in params) allParams[key] = params[key];
      for (var key in e.parameter) allParams[key] = e.parameter[key];

      var result = instance[methodName](allParams);

      if (result && typeof result.getContent === 'function') return result;
      if (typeof result === 'string') return HtmlService.createHtmlOutput(result);
      if (typeof result === 'object') {
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
      }

      return HtmlService.createHtmlOutput(String(result));

    } catch (error) {
      Logger.log('❌ Router: ' + error.message);
      return View.renderStandalone('Error_500', { errorMessage: error.message });
    }
  }
};

// ==========================================
// Rutas
// ==========================================

// El login es ahora la puerta de entrada de la app.
// Ajustá 'login' si tu método en Ctrl_Auth.gs se llama distinto.
Route.get('', 'Auth@login');
Route.get('home', 'Auth@login');

// Panel del Super Admin (ex Ctrl_Home, ahora Ctrl_SuperAdmin)
Route.get('dashboard', 'SuperAdmin@index');

// Dashboard del cliente (Marketing OS PRO)
Route.get('cliente', 'Cliente@index');

// Agregá tus propias rutas acá, por ejemplo:
// Route.get('productos', 'Productos@index');
// Route.post('productos/crear', 'Productos@create');
// Route.get('productos/:id', 'Productos@getById');

globalThis.Route = Route;
globalThis.Router = Router;
globalThis.__ROUTES__ = __ROUTES__;

Logger.log('✅ Router cargado');
