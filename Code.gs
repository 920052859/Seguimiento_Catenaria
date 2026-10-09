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
const DAILY_LOG_SHEET = 'Log_Diario';
const HISTORY_SHEET = 'Historico';
const ACTIVITIES = ['perforacion','fijacion','soporte','mensula','aislador','perfil','hilo'];
const WEIGHTS = {
  perforacion: 0.10, fijacion: 0.20, soporte: 0.20, mensula: 0.10,
  aislador: 0.10, perfil: 0.20, hilo: 0.10
};

function jsonResponse(result) {
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatLimaDateTime(date) {
  return Utilities.formatDate(date, 'America/Lima', 'dd/MM/yyyy HH:mm');
}

function limaDateKey(date) {
  return Utilities.formatDate(date, 'America/Lima', 'yyyy-MM-dd');
}

function activityDeltaMask(beforeValues, afterValues) {
  return ACTIVITIES.map((activity, index) =>
    Number(beforeValues[index]) !== 1 && Number(afterValues[index]) === 1 ? '1' : '0'
  ).join('');
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
  ensureOperationalColumns(ws);
  return ws;
}

function ensureOperationalColumns(ws) {
  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0]
    .map(h => String(h).trim());
  ['vehiculo', 'que_se_actualiza'].forEach(header => {
    if (headers.indexOf(header) < 0) {
      ws.getRange(1, ws.getLastColumn() + 1).setValue(header);
      headers.push(header);
    }
  });
}

function normalizeExistingUpdateDates(ws) {
  if (ws.getLastRow() < 2) return;
  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0]
    .map(h => String(h).trim());
  const column = headers.indexOf('fecha_update') + 1;
  if (!column) return;
  const range = ws.getRange(2, column, ws.getLastRow() - 1, 1);
  const normalized = range.getValues().map(row => {
    const value = row[0];
    if (!value) return [''];
    if (value instanceof Date) return [formatLimaDateTime(value)];
    const text = String(value).trim();
    if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(text)) return [text];
    const parsed = new Date(text);
    return [isNaN(parsed.getTime()) ? text : formatLimaDateTime(parsed)];
  });
  range.setNumberFormat('@').setValues(normalized);
}

function headerIndex(headers) {
  const idx = {};
  headers.forEach((h, i) => { idx[String(h).trim()] = i; });
  const required = ['id','via','tramo','km','situacion'].concat(ACTIVITIES,
    ['pct','comentario','fecha_update','actualizado_por','vehiculo','que_se_actualiza']);
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
  const ws = getSheetOrThrow(active);
  normalizeExistingUpdateDates(ws);
  ensureHistorySheet(active);
  ensureDailyLogSheet(active);
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
    else if (action === 'history') result = getHistory();
    else if (action === 'daily_report') result = getDailyReport(e.parameter.date || '');
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
    else if (body.action === 'save_snapshot') result = saveHistorySnapshot(body);
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
    const now = new Date();
    const formattedNow = formatLimaDateTime(now);

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

    const previousActivityValues = ACTIVITIES.map(a => Number(values[idx[a]]) === 1 ? 1 : 0);
    let previousPct = 0;
    ACTIVITIES.forEach((activity, index) => {
      previousPct += WEIGHTS[activity] * (previousActivityValues[index] === 1 ? 1 : 0);
    });
    previousPct = Math.round(previousPct * 1000) / 10;

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
    const deltaMask = activityDeltaMask(previousActivityValues, activityValues);
    ws.getRange(rowNumber, idx[ACTIVITIES[0]]+1, 1, ACTIVITIES.length).setValues([activityValues]);

    let pct = 0;
    ACTIVITIES.forEach(a => { pct += WEIGHTS[a] * (Number(values[idx[a]]) === 1 ? 1 : 0); });
    const pctValue = Math.round(pct*1000)/10;
    const deltaPct = Math.round((pctValue - previousPct) * 10) / 10;
    ws.getRange(rowNumber, idx.pct+1).setValue(pctValue);
    if (body.comentario !== undefined) ws.getRange(rowNumber, idx.comentario+1).setValue(body.comentario);
    ws.getRange(rowNumber, idx.fecha_update+1).setValue(formattedNow);
    if (body.actualizado_por) ws.getRange(rowNumber, idx.actualizado_por+1).setValue(body.actualizado_por);
    if (body.vehiculo !== undefined) ws.getRange(rowNumber, idx.vehiculo+1).setValue(body.vehiculo || '');
    ws.getRange(rowNumber, idx.que_se_actualiza+1).setNumberFormat('@').setValue(deltaMask);

    logChange(soporteId, via, body, formattedNow, ss);
    logDailyChange({
      timestamp: formattedNow,
      id: soporteId,
      via: via || Number(values[idx.via]),
      tramo: values[idx.tramo],
      mask: deltaMask,
      vehiculo: body.vehiculo || values[idx.vehiculo] || '',
      comentario: body.comentario || '',
      usuario: body.actualizado_por || 'web',
      pct: pctValue,
      delta_pct: deltaPct
    }, ss);
    updateLastUpdate(formattedNow, ss);
    SpreadsheetApp.flush();
    return {ok:true, id:soporteId, pct:pctValue, delta_pct:deltaPct,
      timestamp:formattedNow, que_se_actualiza:deltaMask};
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

// ============================================================
// REPORTE DIARIO COMPARTIDO - un evento persistente por guardado
// Mascara: perforacion, fijacion, soporte, mensula, aislador, perfil, hilo.
// Ejemplo 1100000 = se sumaron perforacion y fijacion.
// ============================================================
function dailyLogHeaders() {
  return ['fecha_update','id','via','tramo','que_se_actualiza','actividades',
    'vehiculo','comentario','actualizado_por','pct','delta_pct'];
}

function ensureDailyLogSheet(ss) {
  let ws = ss.getSheetByName(DAILY_LOG_SHEET);
  if (!ws) ws = ss.insertSheet(DAILY_LOG_SHEET);
  const headers = dailyLogHeaders();
  if (ws.getLastRow() === 0) {
    ws.getRange(1, 1, 1, headers.length).setValues([headers]);
    ws.setFrozenRows(1);
  } else {
    const current = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0]
      .map(h => String(h).trim());
    headers.forEach(header => {
      if (current.indexOf(header) < 0) {
        ws.getRange(1, ws.getLastColumn() + 1).setValue(header);
        current.push(header);
      }
    });
  }
  ws.getRange('A:A').setNumberFormat('@');
  ws.getRange('E:E').setNumberFormat('@');
  return ws;
}

function activitiesFromMask(mask) {
  const bits = String(mask || '').padStart(ACTIVITIES.length, '0').slice(-ACTIVITIES.length);
  return ACTIVITIES.filter((activity, index) => bits[index] === '1');
}

function logDailyChange(event, ss) {
  const ws = ensureDailyLogSheet(ss);
  const activities = activitiesFromMask(event.mask);
  ws.appendRow([
    event.timestamp, event.id, event.via, event.tramo, String(event.mask),
    activities.join(', '), event.vehiculo, event.comentario,
    event.usuario, event.pct, event.delta_pct
  ]);
  const row = ws.getLastRow();
  ws.getRange(row, 1).setNumberFormat('@');
  ws.getRange(row, 5).setNumberFormat('@');
}

function dateKeyFromStoredValue(value) {
  if (value instanceof Date) return limaDateKey(value);
  const text = String(value || '').trim();
  const pe = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (pe) return pe[3] + '-' + pe[2] + '-' + pe[1];
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? '' : limaDateKey(parsed);
}

function calculatePeriodProgress(events, totalSupports) {
  if (!totalSupports) return 0;
  const supportPoints = events.reduce((sum, event) => {
    if (event.delta_pct !== '' && event.delta_pct !== null && event.delta_pct !== undefined) {
      return sum + (Number(event.delta_pct) || 0);
    }
    const inferred = activitiesFromMask(event.que_se_actualiza)
      .reduce((activitySum, activity) => activitySum + WEIGHTS[activity] * 100, 0);
    return sum + inferred;
  }, 0);
  return Math.round((supportPoints / totalSupports) * 10000) / 10000;
}

function getDailyReport(requestedDate) {
  const ss = getSpreadsheet();
  const ws = ensureDailyLogSheet(ss);
  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(String(requestedDate || ''))
    ? String(requestedDate) : limaDateKey(new Date());
  const endDate = new Date(dateKey + 'T12:00:00-05:00');
  const startDate = new Date(endDate.getTime());
  startDate.setDate(startDate.getDate() - 6);
  const startKey = limaDateKey(startDate);
  const data = ws.getDataRange().getValues();
  const headers = data.length ? data[0].map(h => String(h).trim()) : dailyLogHeaders();
  const periodEvents = data.slice(1).filter(row => {
    const key = dateKeyFromStoredValue(row[0]);
    return key >= startKey && key <= dateKey;
  }).map(row => {
    const event = {};
    headers.forEach((header, index) => { event[header] = row[index]; });
    event.fecha_update = event.fecha_update instanceof Date
      ? formatLimaDateTime(event.fecha_update) : String(event.fecha_update || '');
    event.date_key = dateKeyFromStoredValue(row[0]);
    event.que_se_actualiza = String(event.que_se_actualiza || '').padStart(7, '0');
    event.actividades = activitiesFromMask(event.que_se_actualiza);
    return event;
  });
  const todayEvents = periodEvents.filter(event => event.date_key === dateKey);
  const totalSupports = Math.max(1, getAllSoportes().soportes.length);
  return {
    ok:true,
    date:dateKey,
    period_start:startKey,
    events:todayEvents,
    advance_today_pct:calculatePeriodProgress(todayEvents, totalSupports),
    advance_7d_pct:calculatePeriodProgress(periodEvents, totalSupports),
    total_soportes:totalSupports
  };
}

// ============================================================
// HISTORICO SEMANAL COMPARTIDO
// ============================================================
function historyHeaders() {
  return ['timestamp','semana','global_pct'].concat(ACTIVITIES)
    .concat(['completados','total_soportes','usuario']);
}

function ensureHistorySheet(ss) {
  let ws = ss.getSheetByName(HISTORY_SHEET);
  if (!ws) ws = ss.insertSheet(HISTORY_SHEET);
  const headers = historyHeaders();
  if (ws.getLastRow() === 0) {
    ws.getRange(1, 1, 1, headers.length).setValues([headers]);
    ws.setFrozenRows(1);
  }
  return ws;
}

function isoWeekLabel(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return d.getUTCFullYear() + '-S' + String(week).padStart(2, '0');
}

function getHistory() {
  const ss = getSpreadsheet();
  const ws = ensureHistorySheet(ss);
  const data = ws.getDataRange().getValues();
  if (data.length < 2) return {ok:true, history:[]};
  const headers = data[0].map(String);
  const history = data.slice(1).filter(row => row[0]).map(row => {
    const item = {};
    headers.forEach((header, index) => {
      const value = row[index];
      item[header] = value instanceof Date ? value.toISOString() : value;
    });
    return item;
  });
  return {ok:true, history:history};
}

function saveHistorySnapshot(body) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = getSpreadsheet();
    const ws = ensureHistorySheet(ss);
    const summary = getSummary();
    const now = new Date();
    const timestamp = now.toISOString();
    const semana = isoWeekLabel(now);
    const values = [timestamp, semana, summary.global_pct];
    ACTIVITIES.forEach(activity => values.push(summary.global_acts[activity].pct));
    const all = getAllSoportes().soportes;
    values.push(all.filter(s => Number(s.pct) >= 100).length);
    values.push(summary.total_soportes);
    values.push((body && body.actualizado_por) || 'automatico');

    // Un solo corte por semana: una captura posterior reemplaza la anterior.
    let targetRow = ws.getLastRow() + 1;
    if (ws.getLastRow() >= 2) {
      const weeks = ws.getRange(2, 2, ws.getLastRow() - 1, 1).getValues();
      for (let i = 0; i < weeks.length; i++) {
        if (String(weeks[i][0]) === semana) targetRow = i + 2;
      }
    }
    ws.getRange(targetRow, 1, 1, values.length).setValues([values]);
    SpreadsheetApp.flush();
    return {ok:true, semana:semana, timestamp:timestamp};
  } finally {
    lock.releaseLock();
  }
}

function guardarSnapshotSemanal() {
  return saveHistorySnapshot({actualizado_por:'automatico semanal'});
}

// Ejecutar manualmente una vez. Crea un corte automatico cada viernes 18:00.
function configurarSnapshotSemanal() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'guardarSnapshotSemanal') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('guardarSnapshotSemanal')
    .timeBased()
    .everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.FRIDAY)
    .atHour(18)
    .create();
  return 'Snapshot semanal configurado: viernes 18:00, zona horaria del proyecto.';
}
