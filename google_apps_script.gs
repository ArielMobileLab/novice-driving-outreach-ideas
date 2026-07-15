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
 * 7. Use the deployment URL as DEFAULT_API_URL in the website.
 */

const SHEET_NAME = "רעיונות";
const RATINGS_SHEET_NAME = "דירוגי AHP";

const HEADERS = [
  "id","createdAt","researcherName","ideaName","publicAction","researchFinding",
  "targetAudience","hook","activityFormat","distribution","gapReduction",
  "complexity","resources","teamContribution","languagesAccessibility",
  "partners","reachEstimate","continuity","budgetEstimate","notes"
];

const RATING_HEADERS = ["raterName","updatedAt","comparisons"];

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

function ensureRatingsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(RATINGS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(RATINGS_SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, RATING_HEADERS.length).setValues([RATING_HEADERS]);
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
  if (action === "list") return listSheet_(ensureSheet_(), false);
  if (action === "listRatings") return listSheet_(ensureRatingsSheet_(), true);
  return json_({status:"error", message:"Unsupported action"});
}

function listSheet_(sheet, parseComparisons) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return json_({status:"ok", data:[]});

  const headers = values[0];
  const data = values.slice(1).map(row => {
    const item = {};
    headers.forEach((key, i) => item[key] = row[i]);
    if (parseComparisons) {
      try { item.comparisons = JSON.parse(item.comparisons || "{}"); }
      catch (err) { item.comparisons = {}; }
    }
    return item;
  }).reverse();

  return json_({status:"ok", data:data});
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    if (!payload.data) return json_({status:"error", message:"Invalid request"});
    if (payload.action === "create") return createIdea_(payload.data);
    if (payload.action === "saveRating") return saveRating_(payload.data);
    return json_({status:"error", message:"Invalid request"});
  } catch (err) {
    return json_({status:"error", message:String(err)});
  }
}

function createIdea_(data) {
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
}

function saveRating_(data) {
  const raterName = String(data.raterName || "").trim().replace(/\s+/g, " ");
  if (!raterName) return json_({status:"error", message:"Rater name is required"});
  if (!data.comparisons || typeof data.comparisons !== "object") {
    return json_({status:"error", message:"Comparisons are required"});
  }

  const lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try {
    const sheet = ensureRatingsSheet_();
    const values = sheet.getDataRange().getValues();
    const normalized = raterName.toLowerCase();
    let targetRow = 0;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0] || "").trim().toLowerCase() === normalized) {
        targetRow = i + 1;
        break;
      }
    }
    const row = [
      raterName,
      data.updatedAt || new Date().toISOString(),
      JSON.stringify(data.comparisons)
    ];
    if (targetRow) sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }
  return json_({status:"ok"});
}

