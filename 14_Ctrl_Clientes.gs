/**
 * 14_Ctrl_Clientes.gs
 * Alta de clientes (Super Admin)
 * -------------------------------------------------
 * No confundir con 13_Ctrl_Cliente.gs (singular): ese es el
 * dashboard que ve el CLIENTE. Este es el controlador que usa
 * el SUPER ADMIN para dar de alta clientes nuevos.
 *
 * Flujo (sección 12 del README):
 *   1. Clona CONFIG.TEMPLATE_ID → nuevo Spreadsheet del cliente
 *   2. Genera un token único
 *   3. Escribe el token en la hoja "Settings" de la copia
 *   4. Registra el cliente en MASTER!Clients
 *   5. Registra la suscripción en MASTER!Subscriptions
 *
 * Se invoca desde el Dashboard vía google.script.run.ejecutarController
 * ('Clientes@crear', { nombre, email }) — ver 11_Main.gs.
 */

class Ctrl_Clientes extends Base_Controller {

  // GET ?p=clientes  → módulo Clientes (listado + CRUD)
  index() {
    try {
      var guard = sessionGuard_();
      if (!guard.ok) return guard.response;

      var resp = this.listar();
      var clientes = resp.success ? resp.clientes : [];

      return this.view('Clientes', layoutData_('Clientes', 'clientes', guard.user, {
        clientes: clientes
      }), 'Layout_Main');

    } catch (error) {
      Logger.log('❌ Ctrl_Clientes@index: ' + error.message);
      return View.renderStandalone('Error_500', { errorMessage: error.message });
    }
  }

  crear(data) {
    try {
      data = data || {};
      var nombre = (data.nombre || '').toString().trim();
      var email = (data.email || '').toString().trim().toLowerCase();
      var telefono = (data.telefono || '').toString().trim();
      var ciudad = (data.ciudad || '').toString().trim();
      var plan = (data.plan || 'Starter').toString().trim();
      var monto = Number(data.monto) || 0;
      var moneda = (data.moneda || 'BOB').toString().trim();
      var metodoPago = (data.metodoPago || '').toString().trim();

      if (!nombre || !email) {
        return this.jsonResponse(false, 'Nombre y email son obligatorios.');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return this.jsonResponse(false, 'El email no tiene un formato válido.');
      }
      if (this.buscarClientePorEmail_(email)) {
        return this.jsonResponse(false, 'Ya existe un cliente con ese email.');
      }

      if (!CONFIG.TEMPLATE_ID) {
        return this.jsonResponse(false, 'Falta configurar CONFIG.TEMPLATE_ID en 0_Config.gs antes de crear clientes.');
      }

      // ==========================================
      // 1. CLONAR EL TEMPLATE
      // ==========================================
      var copia = DriveApp.getFileById(CONFIG.TEMPLATE_ID).makeCopy('MarketingOS_' + nombre);
      var nuevoSpreadsheetId = copia.getId();

      // ==========================================
      // 2. GENERAR TOKEN Y VENCIMIENTO
      // ==========================================
      var token = Utilities.getUuid();
      var vence = new Date();
      vence.setDate(vence.getDate() + 30); // 30 días de acceso por defecto

      // ==========================================
      // 3. ESCRIBIR TOKEN EN LA HOJA "Settings" DE LA COPIA
      // ==========================================
      var ssCliente = SpreadsheetApp.openById(nuevoSpreadsheetId);
      var settings = ssCliente.getSheetByName('Settings');

      if (settings) {
        settings.getRange('B1').setValue(token);
        settings.getRange('B2').setValue(email);
        settings.getRange('B3').setValue(vence);
      } else {
        Logger.log('⚠ El TEMPLATE no tiene una hoja "Settings"; se omitió el guardado del token ahí.');
      }

      // ==========================================
      // 4. CREAR EL USUARIO DEL CLIENTE EN SU PROPIA INSTANCIA
      //    (tabla USERS del Spreadsheet recién clonado, no MASTER)
      // ==========================================
      var passwordCliente = data.password ? data.password.toString() : this.generarPasswordAleatoria_();
      var ctrlAuth = new Ctrl_Auth();
      var hash = ctrlAuth.hashPassword_(passwordCliente);

      var usersSheet = ssCliente.getSheetByName('USERS');
      if (usersSheet) {
        usersSheet.appendRow([1, email, hash, nombre, CONFIG.ROLES.CLIENTE, true, new Date(), '']);
      } else {
        Logger.log('⚠ El TEMPLATE no tiene hoja "USERS"; no se pudo crear el login del cliente. Volvé a correr instalarTemplate() para regenerar el TEMPLATE con esa tab.');
      }

      // ==========================================
      // 5. REGISTRAR CLIENTE EN MASTER!Clients
      // ==========================================
      var clienteId = Base_Model.getNextId(CONFIG.DB.CLIENTS);
      Base_Model.create(CONFIG.DB.CLIENTS, {
        ID: clienteId,
        NOMBRE: nombre,
        EMAIL: email,
        TELEFONO: telefono,
        CIUDAD: ciudad,
        SPREADSHEET_ID: nuevoSpreadsheetId,
        ESTADO: 'ACTIVO',
        CREADO: new Date()
      });

      // ==========================================
      // 6. REGISTRAR SUSCRIPCIÓN EN MASTER!Subscriptions
      // ==========================================
      var subId = Base_Model.getNextId(CONFIG.DB.SUBSCRIPTIONS);
      Base_Model.create(CONFIG.DB.SUBSCRIPTIONS, {
        ID: subId,
        CLIENT_ID: clienteId,
        SPREADSHEET_ID: nuevoSpreadsheetId,
        PLAN: plan,
        MONTO: monto,
        MONEDA: moneda,
        METODO_PAGO: metodoPago,
        TOKEN: token,
        ESTADO: 'ACTIVO',
        VENCE: vence,
        CREADO: new Date()
      });

      Logger.log('✅ Cliente creado: ' + nombre + ' (' + email + '), spreadsheet ' + nuevoSpreadsheetId);

      return this.jsonResponse(true, 'Cliente "' + nombre + '" creado correctamente.', {
        clientId: clienteId,
        spreadsheetId: nuevoSpreadsheetId,
        token: token,
        clientEmail: email,
        clientPassword: passwordCliente
      });

    } catch (error) {
      Logger.log('❌ Ctrl_Clientes@crear: ' + error.message);
      return this.jsonResponse(false, 'Error al crear el cliente: ' + error.message);
    }
  }

  /**
   * Devuelve todos los clientes cruzados con su suscripción,
   * listos para pintar en el Dashboard.
   */
  listar() {
    try {
      var clientes = Base_Model.all(CONFIG.DB.CLIENTS);
      var subs = Base_Model.all(CONFIG.DB.SUBSCRIPTIONS);
      var hoy = new Date();

      var resultado = clientes.map(function (c) {
        var sub = subs.find(function (s) { return String(s.CLIENT_ID) === String(c.ID); }) || {};
        var vence = sub.VENCE ? new Date(sub.VENCE) : null;
        var diasParaVencer = vence ? Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24)) : null;

        var estadoCalculado = c.ESTADO === 'SUSPENDIDO' ? 'SUSPENDIDO'
          : c.ESTADO === 'INACTIVO' ? 'INACTIVO'
          : (diasParaVencer !== null && diasParaVencer < 0) ? 'VENCIDO'
          : (diasParaVencer !== null && diasParaVencer <= 7) ? 'POR_VENCER'
          : 'ACTIVO';

        return {
          id: c.ID,
          nombre: c.NOMBRE,
          email: c.EMAIL,
          telefono: c.TELEFONO || '',
          ciudad: c.CIUDAD || '',
          spreadsheetId: c.SPREADSHEET_ID,
          estadoCliente: c.ESTADO,
          estadoCalculado: estadoCalculado,
          subscriptionId: sub.ID || '',
          plan: sub.PLAN || '',
          monto: sub.MONTO || 0,
          moneda: sub.MONEDA || '',
          metodoPago: sub.METODO_PAGO || '',
          vence: sub.VENCE || '',
          creado: c.CREADO || ''
        };
      });

      return this.jsonResponse(true, '', { clientes: resultado });

    } catch (error) {
      Logger.log('❌ Ctrl_Clientes@listar: ' + error.message);
      return this.jsonResponse(false, 'Error al listar clientes: ' + error.message);
    }
  }

  /**
   * Devuelve un cliente puntual (con su suscripción) por ID.
   */
  obtener(data) {
    try {
      var id = (data && data.id) || data;
      var cliente = Base_Model.find(CONFIG.DB.CLIENTS, id);
      if (!cliente) {
        return this.jsonResponse(false, 'Cliente no encontrado.');
      }
      var sub = this.buscarSuscripcionPorCliente_(id) || {};
      return this.jsonResponse(true, '', { cliente: cliente, subscripcion: sub });

    } catch (error) {
      Logger.log('❌ Ctrl_Clientes@obtener: ' + error.message);
      return this.jsonResponse(false, 'Error al obtener el cliente: ' + error.message);
    }
  }

  /**
   * Edita datos del cliente y/o de su suscripción.
   */
  actualizar(data) {
    try {
      data = data || {};
      var id = data.id;
      if (!id) {
        return this.jsonResponse(false, 'Falta el ID del cliente.');
      }

      var cliente = Base_Model.find(CONFIG.DB.CLIENTS, id);
      if (!cliente) {
        return this.jsonResponse(false, 'Cliente no encontrado.');
      }

      var nombre = (data.nombre || '').toString().trim();
      var email = (data.email || '').toString().trim().toLowerCase();

      if (!nombre || !email) {
        return this.jsonResponse(false, 'Nombre y email son obligatorios.');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return this.jsonResponse(false, 'El email no tiene un formato válido.');
      }

      var otroConEseEmail = this.buscarClientePorEmail_(email);
      if (otroConEseEmail && String(otroConEseEmail.ID) !== String(id)) {
        return this.jsonResponse(false, 'Ya hay otro cliente con ese email.');
      }

      Base_Model.update(CONFIG.DB.CLIENTS, id, {
        NOMBRE: nombre,
        EMAIL: email,
        TELEFONO: (data.telefono || '').toString().trim(),
        CIUDAD: (data.ciudad || '').toString().trim()
      });

      var sub = this.buscarSuscripcionPorCliente_(id);
      if (sub) {
        Base_Model.update(CONFIG.DB.SUBSCRIPTIONS, sub.ID, {
          PLAN: (data.plan || sub.PLAN || '').toString().trim(),
          MONTO: data.monto !== undefined ? Number(data.monto) || 0 : sub.MONTO,
          MONEDA: (data.moneda || sub.MONEDA || '').toString().trim(),
          METODO_PAGO: (data.metodoPago || sub.METODO_PAGO || '').toString().trim(),
          VENCE: parseFechaLocal_(data.vence) || sub.VENCE
        });
      }

      Logger.log('✅ Cliente ' + id + ' actualizado.');
      return this.jsonResponse(true, 'Cliente actualizado correctamente.');

    } catch (error) {
      Logger.log('❌ Ctrl_Clientes@actualizar: ' + error.message);
      return this.jsonResponse(false, 'Error al actualizar el cliente: ' + error.message);
    }
  }

  /**
   * Activar / Desactivar / Suspender: cambia el ESTADO del cliente
   * (y, si corresponde, el de su suscripción).
   */
  cambiarEstado(data) {
    try {
      data = data || {};
      var id = data.id;
      var nuevoEstado = (data.estado || '').toString().trim().toUpperCase();
      var estadosValidos = ['ACTIVO', 'INACTIVO', 'SUSPENDIDO'];

      if (!id || estadosValidos.indexOf(nuevoEstado) === -1) {
        return this.jsonResponse(false, 'Datos inválidos para cambiar el estado.');
      }

      var cliente = Base_Model.find(CONFIG.DB.CLIENTS, id);
      if (!cliente) {
        return this.jsonResponse(false, 'Cliente no encontrado.');
      }

      Base_Model.update(CONFIG.DB.CLIENTS, id, { ESTADO: nuevoEstado });

      var sub = this.buscarSuscripcionPorCliente_(id);
      if (sub) {
        Base_Model.update(CONFIG.DB.SUBSCRIPTIONS, sub.ID, {
          ESTADO: nuevoEstado === 'ACTIVO' ? 'ACTIVO' : nuevoEstado
        });
      }

      Logger.log('✅ Cliente ' + id + ' → estado ' + nuevoEstado);
      return this.jsonResponse(true, 'Estado actualizado a ' + nuevoEstado + '.');

    } catch (error) {
      Logger.log('❌ Ctrl_Clientes@cambiarEstado: ' + error.message);
      return this.jsonResponse(false, 'Error al cambiar el estado: ' + error.message);
    }
  }

  /**
   * Elimina el cliente y su suscripción de MASTER.
   * OJO: esto NO borra el Spreadsheet clonado en Drive (queda huérfano
   * a propósito, para no perder datos del cliente por error; se borra
   * a mano si corresponde).
   */
  eliminar(data) {
    try {
      var id = (data && data.id) || data;
      var cliente = Base_Model.find(CONFIG.DB.CLIENTS, id);
      if (!cliente) {
        return this.jsonResponse(false, 'Cliente no encontrado.');
      }

      var sub = this.buscarSuscripcionPorCliente_(id);
      if (sub) {
        Base_Model.delete(CONFIG.DB.SUBSCRIPTIONS, sub.ID);
      }
      Base_Model.delete(CONFIG.DB.CLIENTS, id);

      Logger.log('🗑️ Cliente ' + id + ' (' + cliente.NOMBRE + ') eliminado de MASTER. Spreadsheet ' + cliente.SPREADSHEET_ID + ' NO se borró de Drive.');
      return this.jsonResponse(true, 'Cliente eliminado. Su Spreadsheet en Drive no se borró automáticamente.');

    } catch (error) {
      Logger.log('❌ Ctrl_Clientes@eliminar: ' + error.message);
      return this.jsonResponse(false, 'Error al eliminar el cliente: ' + error.message);
    }
  }

  /**
   * Genera una contraseña legible al azar (8 caracteres) para el
   * primer login del cliente, cuando no se especifica una manualmente.
   */
  generarPasswordAleatoria_() {
    return Utilities.getUuid().split('-')[0];
  }

  buscarClientePorEmail_(email) {
    return Base_Model.all(CONFIG.DB.CLIENTS).find(function (c) {
      return (c.EMAIL || '').toString().toLowerCase() === email.toLowerCase();
    }) || null;
  }

  buscarSuscripcionPorCliente_(clientId) {
    return Base_Model.all(CONFIG.DB.SUBSCRIPTIONS).find(function (s) {
      return String(s.CLIENT_ID) === String(clientId);
    }) || null;
  }
}

globalThis.Ctrl_Clientes = Ctrl_Clientes;

Logger.log('✅ Ctrl_Clientes registrado correctamente');
