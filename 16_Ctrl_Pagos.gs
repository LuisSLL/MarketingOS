/**
 * 16_Ctrl_Pagos.gs
 * CRUD de Pagos (Super Admin)
 * -------------------------------------------------
 * Registro simple de pagos asociados a un cliente/suscripción.
 */

class Ctrl_Pagos extends Base_Controller {

  // ==========================================
  // GET ?p=pagos
  // Renderiza la vista dedicada de Pagos
  // ==========================================
  index() {
    try {
      var guard = sessionGuard_();
      if (!guard.ok) return guard.response;

      // Traer pagos reales
      var respPagos = this.listar();
      var pagos = respPagos.success ? respPagos.pagos : [];

      // Traer clientes para los selects del modal
      var clientes = Base_Model.all(CONFIG.DB.CLIENTS).map(function (c) {
        return { id: c.ID, nombre: c.NOMBRE };
      });

      // Métricas calculadas
      var ahora = new Date();
      var inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      var cobradoMes = 0;
      var pendiente = 0;
      var totalPagos = pagos.length;
      var metodosCount = {};

      pagos.forEach(function (p) {
        var fecha = p.fecha ? new Date(p.fecha) : null;
        var monto = Number(p.monto) || 0;
        var estado = (p.estado || '').toString().toUpperCase();

        if (estado === 'PAGADO' && fecha && fecha >= inicioMes) {
          cobradoMes += monto;
        }
        if (estado === 'PENDIENTE') {
          pendiente += monto;
        }
        if (p.metodo) {
          metodosCount[p.metodo] = (metodosCount[p.metodo] || 0) + 1;
        }
      });

      var metodoTop = '—';
      var maxCount = 0;
      Object.keys(metodosCount).forEach(function (m) {
        if (metodosCount[m] > maxCount) {
          maxCount = metodosCount[m];
          metodoTop = m;
        }
      });

      return this.view('Pagos', layoutData_('Pagos', 'pagos', guard.user, {
        pagos: pagos,
        clientes: clientes,
        metrics: {
          cobradoMes: cobradoMes,
          pendiente: pendiente,
          totalPagos: totalPagos,
          metodoTop: metodoTop
        }
      }), 'Layout_Main');

    } catch (error) {
      Logger.log('❌ Ctrl_Pagos@index: ' + error.message);
      return View.renderStandalone('Error_500', { errorMessage: error.message });
    }
  }

  listar() {
    try {
      var pagos = Base_Model.all(CONFIG.DB.PAYMENTS);
      var clientes = Base_Model.all(CONFIG.DB.CLIENTS);

      var resultado = pagos.map(function (p) {
        var cliente = clientes.find(function (c) { return String(c.ID) === String(p.CLIENT_ID); });
        return {
          id: p.ID,
          clientId: p.CLIENT_ID,
          clienteNombre: cliente ? cliente.NOMBRE : '(cliente eliminado)',
          monto: p.MONTO,
          moneda: p.MONEDA,
          metodo: p.METODO,
          estado: p.ESTADO,
          fecha: p.FECHA,
          notas: p.NOTAS || ''
        };
      });

      resultado.sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); });

      return this.jsonResponse(true, '', { pagos: resultado });

    } catch (error) {
      Logger.log('❌ Ctrl_Pagos@listar: ' + error.message);
      return this.jsonResponse(false, 'Error al listar pagos: ' + error.message);
    }
  }

  crear(data) {
    try {
      data = data || {};
      var clientId = data.clientId;
      var monto = Number(data.monto) || 0;

      if (!clientId) {
        return this.jsonResponse(false, 'Elegí un cliente.');
      }
      if (monto <= 0) {
        return this.jsonResponse(false, 'El monto debe ser mayor a 0.');
      }

      var cliente = Base_Model.find(CONFIG.DB.CLIENTS, clientId);
      if (!cliente) {
        return this.jsonResponse(false, 'Cliente no encontrado.');
      }

      var sub = Base_Model.all(CONFIG.DB.SUBSCRIPTIONS).find(function (s) {
        return String(s.CLIENT_ID) === String(clientId);
      });

      var id = Base_Model.getNextId(CONFIG.DB.PAYMENTS);
      Base_Model.create(CONFIG.DB.PAYMENTS, {
        ID: id,
        CLIENT_ID: clientId,
        SUBSCRIPTION_ID: sub ? sub.ID : '',
        MONTO: monto,
        MONEDA: (data.moneda || 'BOB').toString().trim(),
        METODO: (data.metodo || '').toString().trim(),
        ESTADO: (data.estado || 'PAGADO').toString().trim().toUpperCase(),
        FECHA: data.fecha ? new Date(data.fecha) : new Date(),
        NOTAS: (data.notas || '').toString().trim()
      });

      Logger.log('✅ Pago ' + id + ' registrado para cliente ' + clientId);
      return this.jsonResponse(true, 'Pago registrado correctamente.', { paymentId: id });

    } catch (error) {
      Logger.log('❌ Ctrl_Pagos@crear: ' + error.message);
      return this.jsonResponse(false, 'Error al registrar el pago: ' + error.message);
    }
  }

  actualizar(data) {
    try {
      data = data || {};
      var id = data.id;
      if (!id) {
        return this.jsonResponse(false, 'Falta el ID del pago.');
      }

      var pago = Base_Model.find(CONFIG.DB.PAYMENTS, id);
      if (!pago) {
        return this.jsonResponse(false, 'Pago no encontrado.');
      }

      var cambios = {};
      if (data.monto !== undefined) cambios.MONTO = Number(data.monto) || 0;
      if (data.moneda !== undefined) cambios.MONEDA = data.moneda;
      if (data.metodo !== undefined) cambios.METODO = data.metodo;
      if (data.estado !== undefined) cambios.ESTADO = data.estado.toString().trim().toUpperCase();
      if (data.notas !== undefined) cambios.NOTAS = data.notas;

      Base_Model.update(CONFIG.DB.PAYMENTS, id, cambios);

      Logger.log('✅ Pago ' + id + ' actualizado.');
      return this.jsonResponse(true, 'Pago actualizado correctamente.');

    } catch (error) {
      Logger.log('❌ Ctrl_Pagos@actualizar: ' + error.message);
      return this.jsonResponse(false, 'Error al actualizar el pago: ' + error.message);
    }
  }

  eliminar(data) {
    try {
      var id = (data && data.id) || data;
      var pago = Base_Model.find(CONFIG.DB.PAYMENTS, id);
      if (!pago) {
        return this.jsonResponse(false, 'Pago no encontrado.');
      }

      Base_Model.delete(CONFIG.DB.PAYMENTS, id);
      Logger.log('🗑️ Pago ' + id + ' eliminado.');
      return this.jsonResponse(true, 'Pago eliminado correctamente.');

    } catch (error) {
      Logger.log('❌ Ctrl_Pagos@eliminar: ' + error.message);
      return this.jsonResponse(false, 'Error al eliminar el pago: ' + error.message);
    }
  }
}

globalThis.Ctrl_Pagos = Ctrl_Pagos;

Logger.log('✅ Ctrl_Pagos registrado');
