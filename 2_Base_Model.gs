/**
 * 2_Base_Model.gs
 * Modelo base: CRUD genérico sobre Google Sheets
 * -------------------------------------------------
 * Los modelos concretos (ej: User_Model) pueden extender esta
 * clase, o simplemente llamar a sus métodos estáticos pasando
 * el nombre de la hoja (CONFIG.DB.XXX).
 */
class Base_Model {

  static getSpreadsheet() {
    if (CONFIG.SPREADSHEET_ID) {
      return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  }

  static sheet(sheetName) {
    var ss = this.getSpreadsheet();
    return ss.getSheetByName(sheetName);
  }

  /**
   * Devuelve todas las filas de una hoja como array de objetos,
   * usando la primera fila como encabezados.
   */
  static all(sheetName) {
    var sheet = this.sheet(sheetName);
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    if (data.length === 0) return [];
    var headers = data.shift();
    var result = [];
    for (var i = 0; i < data.length; i++) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = data[i][j];
      }
      result.push(obj);
    }
    return result;
  }

  /**
   * Busca un registro por su columna ID (primera columna) tal
   * como espera el resto de la clase (update/delete).
   */
  static find(sheetName, id) {
    var rows = this.all(sheetName);
    var idKey = rows.length > 0 ? Object.keys(rows[0])[0] : null;
    if (!idKey) return null;
    return rows.find(function(r) {
      return r[idKey].toString().trim() === id.toString().trim();
    }) || null;
  }

  static create(sheetName, dataObj) {
    var sheet = this.sheet(sheetName);
    if (!sheet) return false;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var rowToInsert = [];
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i];
      rowToInsert.push(dataObj.hasOwnProperty(h) ? dataObj[h] : '');
    }
    sheet.appendRow(rowToInsert);
    return true;
  }

  /**
   * Busca por ID (primera columna) y sobreescribe los campos recibidos.
   */
  static update(sheetName, id, dataObj) {
    var sheet = this.sheet(sheetName);
    if (!sheet) return false;
    var data = sheet.getDataRange().getValues();
    if (data.length === 0) return false;
    var headers = data[0];

    var rowIndex = -1;
    for (var i = 0; i < data.length; i++) {
      if (data[i][0].toString().trim() === id.toString().trim()) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      Logger.log('Base_Model.update: no se encontró el ID ' + id + ' en ' + sheetName);
      return false;
    }

    var newRowValues = [];
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      newRowValues.push(dataObj.hasOwnProperty(header) ? dataObj[header] : data[rowIndex][i]);
    }

    sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([newRowValues]);
    return true;
  }

  static delete(sheetName, id) {
    var sheet = this.sheet(sheetName);
    if (!sheet) return false;
    var data = sheet.getDataRange().getValues();
    if (data.length === 0) return false;

    var rowIndex = -1;
    for (var i = 0; i < data.length; i++) {
      if (data[i][0].toString().trim() === id.toString().trim()) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex !== -1) {
      sheet.deleteRow(rowIndex + 1);
      return true;
    }
    return false;
  }

  static getLastId(sheetName) {
    var data = this.all(sheetName);
    if (data.length === 0) return 0;
    var maxId = 0;
    for (var i = 0; i < data.length; i++) {
      var id = parseInt(data[i][Object.keys(data[i])[0]]) || 0;
      if (id > maxId) maxId = id;
    }
    return maxId;
  }

  static getNextId(sheetName) {
    return this.getLastId(sheetName) + 1;
  }

  /**
   * Crea una hoja con los encabezados indicados si todavía no existe.
   * Pensada para un futuro 0_Install.gs que inicialice la base de datos.
   * Si la hoja ya existe, no la toca (para no perder datos).
   */
  static createTable(sheetName, headers) {
    var ss = this.getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (sheet) {
      return sheet;
    }

    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    return sheet;
  }
}

// Registro global
globalThis.Base_Model = Base_Model;
