// ============================================================
// BACKEND - Seguimiento Catenaria L2 T3-T4
// 1) Abrir el Google Sheet > Extensiones > Apps Script.
// 2) Pegar este archivo y ejecutar configurar() una vez.
// 3) Implementar como Aplicacion web: ejecutar como Yo;
//    acceso: Cualquier usuario.
// ============================================================

const SHEET_ID = '1wzNnsSueQ1yXRlWBI8qd-xWiGLyo1uf8rSDXXSeXb2s'; // Respaldo: Google Sheet Soportes.
const SHEET_NAME = 'Soportes';
const LOG_SHEET = 'Log';
const ACTIVITIES = ['perforacion','fijacion','soporte','mensula','aislador','perfil','hilo'];
const WEIGHTS = {
  perforacion: 0.10, fijacion: 0.20, soporte: 0.20, mensula: 0.10,
  aislador: 0.10, perfil: 0.20, hilo: 0.10
};

function jsonResponse(result) {
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet() {
  const savedId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  const configuredId = SHEET_ID || savedId;
  if (configuredId && configuredId !== 'TU_SHEET_ID_AQUI') {
    return SpreadsheetApp.openById(configuredId);
  }
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error('No se encontro el Google Sheet. Abre el Sheet > Extensiones > Apps Script y ejecuta configurar().');
}

function getSheetOrThrow(ss) {
  const ws = ss.getSheetByName(SHEET_NAME);
  if (!ws) throw new Error('No existe la pestaña "' + SHEET_NAME + '". Renombra la pestaña importada exactamente como Soportes.');
  return ws;
}

function headerIndex(headers) {
  const idx = {};
  headers.forEach((h, i) => { idx[String(h).trim()] = i; });
  const required = ['id','via','tramo','km','situacion'].concat(ACTIVITIES, ['pct','comentario','fecha_update','actualizado_por']);
  const missing = required.filter(h => idx[h] === undefined);
  if (missing.length) throw new Error('Faltan encabezados en la fila 1: ' + missing.join(', '));
  return idx;
}

// Ejecutar manualmente una sola vez desde un proyecto vinculado al Sheet.
function configurar() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('Este proyecto no esta vinculado a un Sheet. Abre el Google Sheet > Extensiones > Apps Script y pega el codigo alli.');
  }
  getSheetOrThrow(active);
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', active.getId());
  return probarConexion();
}

// Ejecutar manualmente para comprobar archivo, pestaña, encabezados y registros.
function probarConexion() {
  const ss = getSpreadsheet();
  const ws = getSheetOrThrow(ss);
  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  headerIndex(headers);
  const result = 'CONEXION OK | Archivo: ' + ss.getName() +
    ' | Hoja: ' + ws.getName() +
    ' | Soportes: ' + Math.max(0, ws.getLastRow() - 1);
  Logger.log(result);
  return result;
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'all';
    let result;
    if (action === 'all') result = getAllSoportes();
    else if (action === 'summary') result = getSummary();
    else if (action === 'tramo') result = getByTramo(e.parameter.tramo);
    else if (action === 'health') result = {ok:true, message:probarConexion()};
    else result = {ok:false, error:'Accion no reconocida: ' + action};
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ok:false, error:err.message, stack:err.stack});
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    let result;
    if (body.action === 'update_soporte') result = updateSoporte(body);
    else if (body.action === 'bulk_update') result = bulkUpdate(body.updates || []);
    else result = {ok:false, error:'Accion no reconocida'};
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ok:false, error:err.message, stack:err.stack});
  }
}

function getAllSoportes() {
  const ss = getSpreadsheet();
  const ws = getSheetOrThrow(ss);
  const data = ws.getDataRange().getValues();
  if (!data.length) return {ok:true, soportes:[], total:0, last_update:''};
  const headers = data[0].map(h => String(h).trim());
  headerIndex(headers);
  const soportes = [];
  for (let i=1; i<data.length; i++) {
    if (!data[i][0]) continue;
    const s = {};
    headers.forEach((h,j) => { s[h] = data[i][j]; });
    soportes.push(s);
  }
  return {ok:true, soportes:soportes, total:soportes.length, last_update:getLastUpdate()};
}

function getSummary() {
  const all = getAllSoportes().soportes;
  const tramos = {};
  let totalPct = 0;
  all.forEach(s => {
    const tramo = s.tramo;
    if (!tramos[tramo]) {
      tramos[tramo] = {count:0, total_pct:0, acts:{}};
      ACTIVITIES.forEach(a => tramos[tramo].acts[a] = {done:0,total:0});
    }
    const t = tramos[tramo];
    t.count++;
    t.total_pct += Number(s.pct) || 0;
    ACTIVITIES.forEach(a => {
      t.acts[a].total++;
      if (Number(s[a]) === 1) t.acts[a].done++;
    });
    totalPct += Number(s.pct) || 0;
  });
  Object.keys(tramos).forEach(k => {
    tramos[k].avg_pct = tramos[k].count ? Math.round(tramos[k].total_pct/tramos[k].count*10)/10 : 0;
  });
  const global_acts = {};
  ACTIVITIES.forEach(a => {
    const done = all.filter(s => Number(s[a]) === 1).length;
    global_acts[a] = {done:done, total:all.length, pct:all.length ? Math.round(done/all.length*1000)/10 : 0};
  });
  return {
    ok:true,
    global_pct:all.length ? Math.round(totalPct/all.length*10)/10 : 0,
    total_soportes:all.length,
    tramos:tramos,
    global_acts:global_acts,
    last_update:getLastUpdate()
  };
}

function getByTramo(tramo) {
  const soportes = getAllSoportes().soportes.filter(s => s.tramo === tramo);
  return {ok:true, soportes:soportes, tramo:tramo};
}

function updateSoporte(body) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = getSpreadsheet();
    const ws = getSheetOrThrow(ss);
    const data = ws.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const idx = headerIndex(headers);
    const soporteId = String(body.id);
    const via = body.via ? Number(body.via) : null;
    const now = new Date().toISOString();

    let rowNumber = -1;
    let values = null;
    for (let i=1; i<data.length; i++) {
      if (String(data[i][idx.id]) !== soporteId) continue;
      if (via && Number(data[i][idx.via]) !== via) continue;
      rowNumber = i + 1;
      values = data[i].slice();
      break;
    }
    if (rowNumber < 0) return {ok:false, error:'Soporte no encontrado: ' + soporteId};

    // Secuencia obligatoria: al completar una etapa, completa todas las previas.
    // No permite borrar una etapa si existe alguna posterior terminada.
    ACTIVITIES.forEach((activity, activityIndex) => {
      if (body[activity] === undefined) return;
      const requested = Number(body[activity]) === 1 ? 1 : 0;
      if (requested === 0) {
        const laterDone = ACTIVITIES.slice(activityIndex+1)
          .some(later => Number(values[idx[later]]) === 1);
        if (laterDone) {
          throw new Error('No se puede desmarcar ' + activity + ' porque existe una actividad posterior completada.');
        }
        values[idx[activity]] = 0;
      } else {
        for (let p=0; p<=activityIndex; p++) values[idx[ACTIVITIES[p]]] = 1;
      }
    });

    // Columnas de actividades son consecutivas: perforacion ... hilo.
    const activityValues = ACTIVITIES.map(a => Number(values[idx[a]]) === 1 ? 1 : 0);
    ws.getRange(rowNumber, idx[ACTIVITIES[0]]+1, 1, ACTIVITIES.length).setValues([activityValues]);

    let pct = 0;
    ACTIVITIES.forEach(a => { pct += WEIGHTS[a] * (Number(values[idx[a]]) === 1 ? 1 : 0); });
    const pctValue = Math.round(pct*1000)/10;
    ws.getRange(rowNumber, idx.pct+1).setValue(pctValue);
    if (body.comentario !== undefined) ws.getRange(rowNumber, idx.comentario+1).setValue(body.comentario);
    ws.getRange(rowNumber, idx.fecha_update+1).setValue(now);
    if (body.actualizado_por) ws.getRange(rowNumber, idx.actualizado_por+1).setValue(body.actualizado_por);

    logChange(soporteId, via, body, now, ss);
    updateLastUpdate(now, ss);
    SpreadsheetApp.flush();
    return {ok:true, id:soporteId, pct:pctValue, timestamp:now};
  } finally {
    lock.releaseLock();
  }
}

function bulkUpdate(updates) {
  const results = updates.map(updateSoporte);
  return {ok:results.every(r => r.ok), count:updates.length, results:results};
}

function getLastUpdate() {
  try {
    const ss = getSpreadsheet();
    const log = ss.getSheetByName(LOG_SHEET);
    return log ? (log.getRange('B1').getValue() || '') : '';
  } catch (e) { return ''; }
}

function updateLastUpdate(ts, ss) {
  let log = ss.getSheetByName(LOG_SHEET);
  if (!log) log = ss.insertSheet(LOG_SHEET);
  log.getRange('A1').setValue('Ultima actualizacion:');
  log.getRange('B1').setValue(ts);
}

function logChange(id, via, body, ts, ss) {
  let log = ss.getSheetByName(LOG_SHEET);
  if (!log) log = ss.insertSheet(LOG_SHEET);
  if (log.getLastRow() < 2) {
    log.getRange(2,1,1,7).setValues([['Timestamp','ID','Via','Actividad','Valor','Comentario','Usuario']]);
  }
  ACTIVITIES.forEach(a => {
    if (body[a] !== undefined) {
      log.appendRow([ts,id,via,a,body[a],body.comentario||'',body.actualizado_por||'']);
    }
  });
  if (body.comentario !== undefined && !ACTIVITIES.some(a => body[a] !== undefined)) {
    log.appendRow([ts,id,via,'comentario','',body.comentario||'',body.actualizado_por||'']);
  }
}
