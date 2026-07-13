/**
 * Backend for the outreach-ideas website.
 *
 * Setup:
 * 1. Create a Google Sheet.
 * 2. Extensions -> Apps Script.
 * 3. Replace the script with this file.
 * 4. Deploy -> New deployment -> Web app.
 * 5. Execute as: Me.
 * 6. Who has access: Anyone with the link.
 * 7. Copy the deployment URL into "הגדרות שיתוף" באתר.
 */

const SHEET_NAME = "רעיונות";

const HEADERS = [
  "id","createdAt","researcherName","ideaName","publicAction","researchFinding",
  "targetAudience","hook","activityFormat","distribution","gapReduction",
  "complexity","resources","teamContribution","languagesAccessibility",
  "partners","reachEstimate","continuity","budgetEstimate","notes"
];

function ensureSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "list";
  if (action !== "list") return json_({status:"error", message:"Unsupported action"});

  const sheet = ensureSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return json_({status:"ok", data:[]});

  const headers = values[0];
  const data = values.slice(1).map(row => {
    const item = {};
    headers.forEach((key, i) => item[key] = row[i]);
    return item;
  }).reverse();

  return json_({status:"ok", data:data});
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    if (payload.action !== "create" || !payload.data) {
      return json_({status:"error", message:"Invalid request"});
    }

    const data = payload.data;
    const required = [
      "researcherName","ideaName","publicAction","researchFinding","targetAudience",
      "hook","activityFormat","distribution","gapReduction","complexity",
      "resources","teamContribution"
    ];

    const missing = required.filter(key => !String(data[key] || "").trim());
    if (missing.length) return json_({status:"error", message:"Missing required fields"});

    const budget = Number(data.budgetEstimate || 0);
    if (budget > 30000) return json_({status:"error", message:"Budget exceeds 30,000 ILS"});

    const sheet = ensureSheet_();
    const row = HEADERS.map(key => data[key] || "");
    sheet.appendRow(row);

    return json_({status:"ok"});
  } catch (err) {
    return json_({status:"error", message:String(err)});
  }
}

