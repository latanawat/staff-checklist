// ============================================================
// OPT Staff Checklist - Google Apps Script Backend
// วิธีใช้: วางโค้ดนี้ใน Google Apps Script แล้ว Deploy เป็น Web App
// ============================================================

const SHEET_NAME = 'Audits';
const COLS = ['id', 'createdAt', 'info', 'answers', 'notes', 'partPcts', 'overallPct'];

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLS);
    sheet.setFrozenRows(1);
    const hdr = sheet.getRange(1, 1, 1, COLS.length);
    hdr.setBackground('#e8192c').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setColumnWidth(1, 140);
    sheet.setColumnWidth(3, 300);
    sheet.setColumnWidth(4, 300);
    sheet.setColumnWidth(5, 250);
  }
  return sheet;
}

function getUsersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Users');
  if (!sheet) {
    sheet = ss.insertSheet('Users');
    sheet.appendRow(['username', 'password', 'name']);
    sheet.setFrozenRows(1);
    const hdr = sheet.getRange(1, 1, 1, 3);
    hdr.setBackground('#e8192c').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 160);
    sheet.setColumnWidth(3, 200);
  }
  return sheet;
}

// GET: login หรือ ดึงข้อมูล audit ทั้งหมด
function doGet(e) {
  try {
    const params = e.parameter || {};
    const action = params.action || '';

    // --- Login ---
    if (action === 'login') {
      const username = (params.username || '').trim().toLowerCase();
      const password = (params.password || '').trim();
      const sheet = getUsersSheet();
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
        for (let i = 0; i < data.length; i++) {
          const rowUser = String(data[i][0]).trim().toLowerCase();
          const rowPass = String(data[i][1]).trim();
          const rowName = String(data[i][2]).trim();
          if (rowUser === username && rowPass === password) {
            return ok({ success: true, name: rowName || username });
          }
        }
      }
      return ok({ success: false });
    }

    // --- ดึง audits ---
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return ok({ audits: [] });
    const data = sheet.getRange(2, 1, lastRow - 1, COLS.length).getValues();
    const audits = data
      .filter(r => r[0])
      .map(r => ({
        id: String(r[0]),
        createdAt: Number(r[1]),
        info: tryParse(r[2]),
        answers: tryParse(r[3]),
        notes: tryParse(r[4]),
        partPcts: tryParse(r[5]),
        overallPct: Number(r[6]),
        photos: {}
      }));
    return ok({ audits });
  } catch (e) {
    return err(e.message);
  }
}

// POST: login, บันทึก หรือ ลบ
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    // --- Login ---
    if (body.action === 'login') {
      const username = (body.username || '').trim().toLowerCase();
      const password = (body.password || '').trim();
      const sheet = getUsersSheet();
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
        for (let i = 0; i < data.length; i++) {
          const rowUser = String(data[i][0]).trim().toLowerCase();
          const rowPass = String(data[i][1]).trim();
          const rowName = String(data[i][2]).trim();
          if (rowUser === username && rowPass === password) {
            return ok({ success: true, name: rowName || username });
          }
        }
      }
      return ok({ success: false });
    }

    const sheet = getSheet();

    // --- บันทึก ---
    if (body.action === 'save') {
      const a = body.audit;
      const row = [
        a.id,
        a.createdAt,
        JSON.stringify(a.info),
        JSON.stringify(a.answers),
        JSON.stringify(a.notes),
        JSON.stringify(a.partPcts || []),
        a.overallPct
      ];
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(String);
        const idx = ids.indexOf(String(a.id));
        if (idx >= 0) {
          sheet.getRange(idx + 2, 1, 1, row.length).setValues([row]);
          return ok({});
        }
      }
      sheet.appendRow(row);
      return ok({});
    }

    // --- ลบ ---
    if (body.action === 'delete') {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(String);
        const idx = ids.indexOf(String(body.id));
        if (idx >= 0) sheet.deleteRow(idx + 2);
      }
      return ok({});
    }

    return err('Unknown action');
  } catch (e) {
    return err(e.message);
  }
}

function tryParse(s) {
  try { return JSON.parse(s); } catch (e) { return {}; }
}
function ok(d) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, ...d }))
    .setMimeType(ContentService.MimeType.JSON);
}
function err(m) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: m }))
    .setMimeType(ContentService.MimeType.JSON);
}
