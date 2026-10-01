/**
 * 17_Ctrl_Suscripciones.gs
 * Módulo Suscripciones (Super Admin)
 * -------------------------------------------------
 * Vista centrada en la suscripción de cada cliente: plan, monto,
 * vencimiento, estado y token de acceso de su instancia.
 *
 * Acciones (vía google.script.run.ejecutarController):
 *   Suscripciones@actualizar     { id, plan, monto, moneda, metodoPago, vence }
 *   Suscripciones@renovar        { id, dias }
 *   Suscripciones@regenerarToken { id }
 * El cambio de estado (activar/suspender/desactivar) reutiliza
 * Clientes@cambiarEstado, que mantiene cliente y suscripción sincronizados.
 */

class Ctrl_Suscripciones extends Base_Controller {

  // GET ?p=suscripciones
  index() {
    try {
      var guard = sessionGuard_();
      if (!guard.ok) return guard.response;

      var resp = this.listar();
      return this.view('Suscripciones', layoutData_('Suscripciones', 'suscripciones', guard.user, {
        suscripciones: resp.success ? resp.suscripciones : []
      }), 'Layout_Main');

    } catch (error) {
      Logger.log('❌ Ctrl_Suscripciones@index: ' + error.message);
      return View.renderStandalone('Error_500', { errorMessage: error.message });
    }
  }

  listar() {
    try {
      var subs = Base_Model.all(CONFIG.DB.SUBSCRIPTIONS);
      var clientes = Base_Model.all(CONFIG.DB.CLIENTS);
      var hoy = new Date();

      var resultado = subs.map(function (s) {
        var cliente = clientes.find(function (c) { return String(c.ID) === String(s.CLIENT_ID); }) || {};
        var token = (s.TOKEN || '').toString();
        return {
          id: s.ID,
          clientId: s.CLIENT_ID,
          clienteNombre: cliente.NOMBRE || '(cliente eliminado)',
          clienteEmail: cliente.EMAIL || '',
          spreadsheetId: s.SPREADSHEET_ID,
          plan: s.PLAN || '',
          monto: s.MONTO || 0,
          moneda: s.MONEDA || '',
          metodoPago: s.METODO_PAGO || '',
          tokenCorto: token ? token.substring(0, 8) + '…' : '—',
          estadoGuardado: s.ESTADO,
          estadoCalculado: calcularEstado_(s.ESTADO, s.VENCE),
          vence: s.VENCE || '',
          diasRestantes: s.VENCE ? Math.ceil((new Date(s.VENCE) - hoy) / (1000 * 60 * 60 * 24)) : null,
          creado: s.CREADO || ''
        };
      });

      // Las que vencen antes, primero
      resultado.sort(function (a, b) {
        var da = a.vence ? new Date(a.vence).getTime() : Infinity;
        var db = b.vence ? new Date(b.vence).getTime() : Infinity;
        return da - db;
      });

      return this.jsonResponse(true, '', { suscripciones: resultado });

    } catch (error) {
      Logger.log('❌ Ctrl_Suscripciones@listar: ' + error.message);
      return this.jsonResponse(false, 'Error al listar suscripciones: ' + error.message);
    }
  }

  actualizar(data) {
    try {
      data = data || {};
      if (!data.id) return this.jsonResponse(false, 'Falta el ID de la suscripción.');

      var sub = Base_Model.find(CONFIG.DB.SUBSCRIPTIONS, data.id);
      if (!sub) return this.jsonResponse(false, 'Suscripción no encontrada.');

      var plan = (data.plan || '').toString().trim();
      var monto = Number(data.monto);
      if (!plan) return this.jsonResponse(false, 'El plan es obligatorio.');
      if (isNaN(monto) || monto < 0) return this.jsonResponse(false, 'El monto no es válido.');

      Base_Model.update(CONFIG.DB.SUBSCRIPTIONS, data.id, {
        PLAN: plan,
        MONTO: monto,
        MONEDA: (data.moneda || sub.MONEDA || 'BOB').toString().trim(),
        METODO_PAGO: (data.metodoPago || '').toString().trim(),
        VENCE: parseFechaLocal_(data.vence) || sub.VENCE
      });

      registrarLogModulo_('SUSCRIPCION_ACTUALIZADA', 'Suscripción ' + data.id);
      return this.jsonResponse(true, 'Suscripción actualizada correctamente.');

    } catch (error) {
      Logger.log('❌ Ctrl_Suscripciones@actualizar: ' + error.message);
      return this.jsonResponse(false, 'Error al actualizar la suscripción: ' + error.message);
    }
  }

  /**
   * Extiende el vencimiento. Si ya venció, cuenta desde hoy; si todavía
   * está vigente, suma los días al vencimiento actual.
   */
  renovar(data) {
    try {
      data = data || {};
      var dias = Number(data.dias) || 30;
      if (!data.id) return this.jsonResponse(false, 'Falta el ID de la suscripción.');
      if (dias < 1 || dias > 3650) return this.jsonResponse(false, 'Los días deben estar entre 1 y 3650.');

      var sub = Base_Model.find(CONFIG.DB.SUBSCRIPTIONS, data.id);
      if (!sub) return this.jsonResponse(false, 'Suscripción no encontrada.');

      var hoy = new Date();
      var base = (sub.VENCE && new Date(sub.VENCE) > hoy) ? new Date(sub.VENCE) : hoy;
      var nuevoVence = new Date(base.getTime());
      nuevoVence.setDate(nuevoVence.getDate() + dias);

      Base_Model.update(CONFIG.DB.SUBSCRIPTIONS, data.id, { VENCE: nuevoVence });

      // Mantener sincronizada la fecha en Settings y en Tokens de la instancia (best-effort)
      this.escribirEnSettings_(sub.SPREADSHEET_ID, 'B3', nuevoVence);
      var clienteRen = Base_Model.find(CONFIG.DB.CLIENTS, sub.CLIENT_ID) || {};
      this.sincronizarTokens_(sub.SPREADSHEET_ID, sub.TOKEN, sub.TOKEN, clienteRen.EMAIL || '', nuevoVence);

      registrarLogModulo_('SUSCRIPCION_RENOVADA', 'Suscripción ' + data.id + ' +' + dias + ' días');
      return this.jsonResponse(true, 'Renovada ' + dias + ' días.');

    } catch (error) {
      Logger.log('❌ Ctrl_Suscripciones@renovar: ' + error.message);
      return this.jsonResponse(false, 'Error al renovar: ' + error.message);
    }
  }

  /**
   * Genera un token nuevo (invalida el anterior) y lo escribe en
   * Settings!B1 de la instancia del cliente.
   */
  regenerarToken(data) {
    try {
      data = data || {};
      if (!data.id) return this.jsonResponse(false, 'Falta el ID de la suscripción.');

      var sub = Base_Model.find(CONFIG.DB.SUBSCRIPTIONS, data.id);
      if (!sub) return this.jsonResponse(false, 'Suscripción no encontrada.');

      var token = Utilities.getUuid();
      Base_Model.update(CONFIG.DB.SUBSCRIPTIONS, data.id, { TOKEN: token });
      var sincronizado = this.escribirEnSettings_(sub.SPREADSHEET_ID, 'B1', token);
      var clienteTok = Base_Model.find(CONFIG.DB.CLIENTS, sub.CLIENT_ID) || {};
      this.sincronizarTokens_(sub.SPREADSHEET_ID, sub.TOKEN, token, clienteTok.EMAIL || '', sub.VENCE);

      registrarLogModulo_('TOKEN_REGENERADO', 'Suscripción ' + data.id);
      return this.jsonResponse(true,
        sincronizado
          ? 'Token regenerado y sincronizado con la instancia del cliente.'
          : 'Token regenerado en MASTER, pero no se pudo escribir en la instancia (revisá los permisos del Spreadsheet).');

    } catch (error) {
      Logger.log('❌ Ctrl_Suscripciones@regenerarToken: ' + error.message);
      return this.jsonResponse(false, 'Error al regenerar el token: ' + error.message);
    }
  }

  /**
   * Mantiene la tab "Tokens" de la instancia alineada con MASTER: si ya hay
   * una fila con el token viejo la actualiza; si no, agrega una nueva.
   * Columnas: token | email | expira. Best-effort (devuelve true/false).
   */
  sincronizarTokens_(spreadsheetId, tokenViejo, tokenNuevo, email, vence) {
    try {
      if (!spreadsheetId) return false;
      var hoja = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Tokens');
      if (!hoja) return false;

      var filas = hoja.getDataRange().getValues();
      for (var i = 1; i < filas.length; i++) {           // fila 0 = encabezados
        if (String(filas[i][0]) === String(tokenViejo)) {
          hoja.getRange(i + 1, 1, 1, 3).setValues([[tokenNuevo, email, vence]]);
          return true;
        }
      }
      hoja.appendRow([tokenNuevo, email, vence]);
      return true;
    } catch (e) {
      Logger.log('⚠ No se pudo sincronizar Tokens en ' + spreadsheetId + ': ' + e.message);
      return false;
    }
  }

  /** Escribe una celda de la hoja Settings de una instancia. Devuelve true/false. */
  escribirEnSettings_(spreadsheetId, celda, valor) {
    try {
      if (!spreadsheetId) return false;
      var settings = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Settings');
      if (!settings) return false;
      settings.getRange(celda).setValue(valor);
      return true;
    } catch (e) {
      Logger.log('⚠ No se pudo escribir ' + celda + ' en la instancia ' + spreadsheetId + ': ' + e.message);
      return false;
    }
  }
}

globalThis.Ctrl_Suscripciones = Ctrl_Suscripciones;

Logger.log('✅ Ctrl_Suscripciones registrado correctamente');
