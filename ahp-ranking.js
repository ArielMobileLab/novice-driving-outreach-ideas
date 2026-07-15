const AHP_CRITERIA = [
  {key:"quality", name:"איכות ונגישות התוכן", short:"איכות ונגישות", weight:20, points:[
    "תרגום ממצאי המחקר לשפה מובנת וידידותית",
    "התאמה לקהלי יעד שונים בגיל וברקע",
    "שימוש בדוגמאות, אנלוגיות ואיורים מוצלחים",
    "המחשת הערך היישומי או התרומה הלאומית של המחקר"
  ]},
  {key:"innovation", name:"חדשנות ויצירתיות", short:"חדשנות", weight:20, points:[
    "מקוריות בצורת ההצגה וההפצה",
    "שימוש במדיות מגוונות כמו וידאו, אינטראקטיב, תערוכה ומדיה חברתית",
    "יכולת למשוך תשומת לב ולעורר סקרנות"
  ]},
  {key:"impact", name:"השפעה", short:"השפעה", weight:20, points:[
    "היקף קהל היעד והגדרתו",
    "אסטרטגיית הפצה והנגשה ברורה ומתאימה",
    "שותפויות עם גופים רלוונטיים",
    "פוטנציאל לתהודה"
  ]},
  {key:"gaps", name:"צמצום פערים והנגשה רחבה", short:"צמצום פערים", weight:20, points:[
    "הגעה לאוכלוסיות בפריפריה גיאוגרפית או חברתית",
    "הנגשת התוכן בשפות נוספות",
    "נגישות לאנשים עם מוגבלויות, לרבות כתוביות ותמלול",
    "פתיחות וזמינות התוצרים לאחר סיום הפעילות"
  ]},
  {key:"involvement", name:"מעורבות אישית של החוקר/ת", short:"מעורבות החוקרים", weight:5, points:[
    "מעורבות ישירה של החוקר/ת וצוות המחקר בפעילות",
    "תפקיד משמעותי בחזית הפעילות כמרצה, מדגים/ה או מנחה",
    "תפקיד כמודל לחיקוי לעידוד עניין במדע"
  ]},
  {key:"workplan", name:"תכנית עבודה וישימות", short:"תכנית עבודה", weight:15, points:[
    "תכנית ברורה עם אבני דרך ולוחות זמנים מתאימים",
    "תקציב מותאם להיקף הפעילות",
    "יכולת לבצע את הפעילות המוצעת"
  ]}
];

let activeRating = null;
let sharedRatings = [];
let ratingBackendAvailable = true;
let activePairIndex = 0;
let calculationScope = "team";
let calculationCriterionKey = AHP_CRITERIA[0].key;
const SLIDER_RATIOS = [9,7,5,3,1,1/3,1/5,1/7,1/9];

function normalizedRaterName(value){
  return String(value || "").trim().replace(/\s+/g," ").toLowerCase();
}

function rankableIdeas(){
  return cachedIdeas.filter(item => item?.id).slice().sort((a,b) => String(a.id).localeCompare(String(b.id)));
}

function pairsForIdeas(items){
  const pairs = [];
  for(let i=0;i<items.length;i++){
    for(let j=i+1;j<items.length;j++) pairs.push([items[i],items[j]]);
  }
  return pairs;
}

function ideaPairs(){ return pairsForIdeas(rankableIdeas()); }

const BALANCED_FIVE_IDEA_BLOCKS = [
  [0,1,2],
  [0,3,4],
  [0,1,4],
  [1,2,3],
  [2,3,4]
];

const EXERCISE_RATER_BLOCKS = new Map([
  ["חוקר",0],
  ["נציג משרד התחבורה",1],
  ["נציג עמותת אור ירוק",2],
  ["הורה",3],
  ["נהג צעיר",4]
]);

const EXERCISE_RATIONALES = new Map([
  ["חוקר","הדגשתי נאמנות לממצאים, הצגת מגבלות, מעורבות ישירה של החוקרים ותוצר מדעי בר־קיימא. מבין שלושת הרעיונות שהוקצו לי, מעבדת ההחלטות חזקה במיוחד באיכות, בנגישות ובצמצום פערים; תיק 01:00 חזק בחדשנות ובהשפעה מקצועית אך פונה לקהל מצומצם יותר; ״מה יש לומר״ ישים ונאמן למחקר אך פחות חדשני."],
  ["נציג משרד התחבורה","הדגשתי השפעה על התנהגות ומדיניות, אפשרות להרחבה ארצית, שותפים מוסדיים וישימות בתקציב ובלוח הזמנים. בשלישייה שהוקצתה לי, ״אותה נסיעה, שני סיפורים״ מתאים להסברה ציבורית רחבה; ״המושב הריק״ ממחיש היטב את הסיכון אך דורש הפעלה פיזית; ״מה יש לומר״ מעשי וזול ולכן עדיף בישימות ובצמצום פערים."],
  ["נציג עמותת אור ירוק","הדגשתי הגעה למספר רב של משפחות, מסר בטיחותי ברור, נגישות ללא ציוד מיוחד והפצה ברשתות ובבתי ספר. בשלישייה שלי, ״אותה נסיעה, שני סיפורים״ הוא החדשני ביותר ובעל תפוצה גבוהה; מעבדת ההחלטות מוסיפה אינטראקטיביות; ״מה יש לומר״ הוא הפשוט והישים ביותר להפצה מיידית."],
  ["הורה","הדגשתי שימושיות מיידית למשפחה, אמון ובטיחות, שפה פשוטה והיכולת להבין את נקודת המבט של הנהג הצעיר. בשלישייה שלי, מעבדת ההחלטות היא הישירה והנגישה ביותר למשפחה; ״המושב הריק״ יוצר אמפתיה אך מורכב יותר להפעלה; תיק 01:00 חשוב למדיניות אך מרוחק מחיי היום־יום של ההורה."],
  ["נהג צעיר","הדגשתי עצמאות, ייצוג הוגן לקול הנהג הצעיר, חוויה שאינה מטיפה והתאמה לטלפון. בשלישייה שלי, ״אותה נסיעה, שני סיפורים״ מוביל משום שהוא נותן מקום שווה לשני הצדדים ונגיש בנייד; ״המושב הריק״ מסקרן וממחיש מתח ושליטה; תיק 01:00 מקצועי ורגולטורי ולכן פחות רלוונטי לצעירים."]
]);

function storedAssignment(record){
  const validIds = new Set(rankableIdeas().map(idea => String(idea.id)));
  const ids = Array.isArray(record?.comparisons?._assignment)
    ? record.comparisons._assignment.map(String).filter(id => validIds.has(id))
    : [];
  return ids.length >= Math.min(3,validIds.size) ? ids.slice(0,Math.min(3,validIds.size)) : [];
}

function ideasForRecord(record){
  const ideas = rankableIdeas();
  const assignment = storedAssignment(record);
  if(!assignment.length) return ideas;
  const selected = new Set(assignment);
  return ideas.filter(idea => selected.has(String(idea.id)));
}

function ratingPairs(record=activeRating){ return pairsForIdeas(ideasForRecord(record)); }

function blockUsage(){
  const ideas = rankableIdeas();
  return BALANCED_FIVE_IDEA_BLOCKS.map(block => {
    const ids = block.map(index => String(ideas[index]?.id));
    return sharedRatings.filter(record => {
      const assigned = storedAssignment(record);
      return assigned.length === ids.length && ids.every(id => assigned.includes(id));
    }).length;
  });
}

function assignmentForRater(name){
  const ideas = rankableIdeas();
  if(ideas.length <= 3) return ideas.map(idea => String(idea.id));
  if(ideas.length === 5){
    const knownBlock = EXERCISE_RATER_BLOCKS.get(normalizedRaterName(name));
    const usage = blockUsage();
    const blockIndex = Number.isInteger(knownBlock)
      ? knownBlock
      : usage.indexOf(Math.min(...usage));
    return BALANCED_FIVE_IDEA_BLOCKS[blockIndex].map(index => String(ideas[index].id));
  }
  const start = Math.abs([...normalizedRaterName(name)].reduce((sum,ch) => sum+ch.charCodeAt(0),0)) % ideas.length;
  return [0,1,2].map(offset => String(ideas[(start+offset)%ideas.length].id));
}

function pairKey(a,b){ return JSON.stringify([a.id,b.id]); }
function criterionPairKey(a,b){ return JSON.stringify([a.key,b.key]); }
function criterionPairs(){ return pairsForIdeas(AHP_CRITERIA); }
function emptyComparisons(assignment=[]){
  return {
    ...Object.fromEntries(AHP_CRITERIA.map(c => [c.key,{}])),
    _assignment:assignment.map(String),
    _criteriaComparisons:{},
    _rationale:"",
    _method:"balanced-three-ideas-v1"
  };
}

function sanitizeComparisons(value){
  const clean = emptyComparisons(Array.isArray(value?._assignment) ? value._assignment : []);
  clean._rationale = String(value?._rationale || "").slice(0,5000);
  clean._method = String(value?._method || "balanced-three-ideas-v1");
  if(value?._criteriaComparisons && typeof value._criteriaComparisons === "object"){
    Object.entries(value._criteriaComparisons).forEach(([key,ratio]) => {
      const n = Number(ratio);
      if(Number.isFinite(n) && n > 0) clean._criteriaComparisons[key] = n;
    });
  }
  AHP_CRITERIA.forEach(c => {
    const source = value?.[c.key];
    if(source && typeof source === "object"){
      Object.entries(source).forEach(([key,ratio]) => {
        const n = Number(ratio);
        if(Number.isFinite(n) && n > 0) clean[c.key][key] = n;
      });
    }
  });
  return clean;
}

function comparisonsForAssignment(value,assignment){
  const source = sanitizeComparisons(value);
  const previous = storedAssignment({comparisons:source});
  const sameAssignment = previous.length === assignment.length && assignment.every(id => previous.includes(String(id)));
  const clean = emptyComparisons(assignment);
  if(!sameAssignment) return clean;
  clean._rationale = source._rationale;
  clean._criteriaComparisons = {...source._criteriaComparisons};
  const assignedIdeas = rankableIdeas().filter(idea => assignment.includes(String(idea.id)));
  const allowed = new Set(pairsForIdeas(assignedIdeas).map(([a,b]) => pairKey(a,b)));
  AHP_CRITERIA.forEach(criterion => {
    Object.entries(source[criterion.key]).forEach(([key,value]) => {
      if(allowed.has(key)) clean[criterion.key][key] = value;
    });
  });
  return clean;
}

function localRatingFor(name){
  return localAhpRatings()[normalizedRaterName(name)] || null;
}

function saveActiveRatingLocally(){
  if(!activeRating) return;
  activeRating.updatedAt = new Date().toISOString();
  const data = localAhpRatings();
  data[normalizedRaterName(activeRating.raterName)] = activeRating;
  saveLocalAhpRatings(data);
  localStorage.setItem(RATER_KEY, activeRating.raterName);
}

function setAhpStatus(message, ok=true){
  const box = $("#ahpStatus");
  box.textContent = message;
  box.className = "status show " + (ok ? "ok" : "error");
}

async function fetchSharedRatings(){
  const url = apiUrl();
  if(!url) throw new Error("No shared backend");
  const res = await fetch(url + (url.includes("?") ? "&" : "?") + `action=listRatings&t=${Date.now()}`, {cache:"no-store"});
  if(!res.ok) throw new Error("Ratings network error");
  const payload = await res.json();
  if(payload.status !== "ok" || !Array.isArray(payload.data)) throw new Error(payload.message || "Ratings unavailable");
  return payload.data.map(row => {
    let comparisons = row.comparisons;
    if(typeof comparisons === "string"){
      try{ comparisons = JSON.parse(comparisons || "{}"); }catch{ comparisons = {}; }
    }
    const cleanComparisons = sanitizeComparisons(comparisons);
    return {
      raterName:String(row.raterName || ""),
      updatedAt:String(row.updatedAt || ""),
      rationale:cleanComparisons._rationale,
      comparisons:cleanComparisons
    };
  }).filter(row => row.raterName);
}

async function storeSharedRating(record){
  const res = await fetch(apiUrl(), {
    method:"POST",
    body:JSON.stringify({action:"saveRating", data:record})
  });
  if(!res.ok) throw new Error("Rating submission failed");
  const payload = await res.json();
  if(payload.status !== "ok") throw new Error(payload.message || "Rating submission failed");
}

function renderCriteriaGuide(){
  $("#criteriaGuide").innerHTML = AHP_CRITERIA.map(c => `<section class="criterion-guide">
    <h3><span>${escapeHtml(c.name)}</span><span>${c.weight}%</span></h3>
    <ul>${c.points.map(point => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
  </section>`).join("");
}

function completedForCriterion(record, criterion){
  const pairs = ratingPairs(record);
  const values = record?.comparisons?.[criterion.key] || {};
  return pairs.filter(([a,b]) => Number(values[pairKey(a,b)]) > 0).length;
}

function words(value){
  return String(value || "").trim().split(/\s+/).filter(Boolean);
}

function truncateWords(value,maxWords){
  const list = words(value);
  return {
    text:list.slice(0,maxWords).join(" ") + (list.length > maxWords ? "…" : ""),
    count:Math.min(list.length,maxWords)
  };
}

function summarySection(label,value,maxWords){
  const summary = truncateWords(value,maxWords);
  if(!summary.count) return {html:"",count:0};
  return {
    html:`<section class="summary-section"><strong>${escapeHtml(label)}</strong><p>${escapeHtml(summary.text)}</p></section>`,
    count:summary.count
  };
}

function ideaSummary(item,label){
  const execution = [item.complexity,item.resources,item.budgetEstimate ? `תקציב משוער: ${item.budgetEstimate} ₪` : ""].filter(Boolean).join("\n");
  const access = [item.gapReduction,item.languagesAccessibility].filter(Boolean).join("\n");
  const format = [item.activityFormat ? `פורמט: ${item.activityFormat}` : "",item.distribution].filter(Boolean).join("\n");
  const continuity = [item.teamContribution,item.continuity ? `מה יישאר לציבור: ${item.continuity}` : ""].filter(Boolean).join("\n");
  const sections = [
    summarySection("מה הציבור יעשה בפועל?",item.publicAction,110),
    summarySection("על איזה ממצא מחקרי הרעיון נשען?",item.researchFinding,100),
    summarySection("קהל היעד",item.targetAudience,40),
    summarySection("מה יגרום לאנשים לעצור ולהשתתף?",item.hook,60),
    summarySection("פורמט והפצה",format,50),
    summarySection("צמצום פערים ונגישות",access,55),
    summarySection("מורכבות, משאבים ותקציב",execution,50),
    summarySection("מעורבות החוקרים והמשכיות",continuity,35)
  ];
  const wordCount = sections.reduce((sum,section) => sum+section.count,0);
  return `<article class="pair-idea">
    <h4>${escapeHtml(label)}: ${escapeHtml(item.ideaName || "ללא שם")}</h4>
    <p class="idea-researcher">הוצע על ידי: ${escapeHtml(item.researcherName || "לא צוין")} · תקציר: ${wordCount} מילים</p>
    <div class="idea-summary">${sections.map(section => section.html).join("")}</div>
  </article>`;
}

function sliderIndexForRatio(ratio){
  const value = Number(ratio);
  const index = SLIDER_RATIOS.findIndex(item => Math.abs(item-value)<0.00001);
  return index >= 0 ? index : 4;
}

function comparisonDescription(index){
  if(index === 4) return "שני הרעיונות שווים";
  const strengths = ["עדיף באופן קיצוני","עדיף מאוד","עדיף בבירור","עדיף מעט"];
  return index < 4 ? `רעיון א׳ ${strengths[index]}` : `רעיון ב׳ ${strengths[8-index]}`;
}

function criterionComparison(criterion,a,b){
  const current = activeRating.comparisons[criterion.key][pairKey(a,b)];
  const answered = Number(current) > 0;
  const index = sliderIndexForRatio(current);
  const hint = criterion.points.slice(0,2).join("; ");
  return `<section class="criterion-comparison ${answered?"answered":""}" data-criterion-row="${criterion.key}">
    <div class="criterion-head">
      <div><span class="criterion-title">${escapeHtml(criterion.name)} · ${criterion.weight}%</span><span class="criterion-hint">${escapeHtml(hint)}</span></div>
      <span class="criterion-value" data-criterion-value="${criterion.key}">${answered?escapeHtml(comparisonDescription(index)):"טרם דורג"}</span>
    </div>
    <div class="slider-row">
      <input class="criterion-slider" dir="ltr" type="range" min="0" max="8" step="1" value="${index}" data-criterion-slider="${criterion.key}" aria-label="השוואה לפי ${escapeHtml(criterion.name)}" aria-valuetext="${answered?escapeHtml(comparisonDescription(index)):"טרם דורג"}">
      <button class="secondary equal-button" type="button" data-equal-criterion="${criterion.key}">סמן כשווים</button>
    </div>
    <div class="slider-labels"><span>רעיון א׳ עדיף מאוד</span><span>שווים</span><span>רעיון ב׳ עדיף מאוד</span></div>
  </section>`;
}

function setComparison(criterionKey,index,a,b){
  const criterion = AHP_CRITERIA.find(item => item.key === criterionKey);
  if(!criterion) return;
  activeRating.comparisons[criterion.key][pairKey(a,b)] = SLIDER_RATIOS[index];
  saveActiveRatingLocally();
  const row = document.querySelector(`[data-criterion-row="${criterion.key}"]`);
  const value = document.querySelector(`[data-criterion-value="${criterion.key}"]`);
  const slider = document.querySelector(`[data-criterion-slider="${criterion.key}"]`);
  const description = comparisonDescription(index);
  row?.classList.add("answered");
  if(value) value.textContent = description;
  if(slider) slider.setAttribute("aria-valuetext",description);
  renderProgress();
  renderPairProgress();
  renderAhpResults();
}

function renderPairProgress(){
  const pairs = ratingPairs();
  if(!pairs.length) return;
  const [a,b] = pairs[activePairIndex];
  const answered = AHP_CRITERIA.filter(c => Number(activeRating.comparisons[c.key][pairKey(a,b)]) > 0).length;
  const element = $("#currentPairProgress");
  if(element) element.textContent = `${answered} מתוך ${AHP_CRITERIA.length} קריטריונים הושלמו`;
}

function renderAllCriteriaPairCard(){
  const pairs = ratingPairs();
  if(!pairs.length){
    $("#pairCard").innerHTML = `<div class="empty">נדרשים לפחות שני רעיונות כדי לבצע השוואה זוגית.</div>`;
    return;
  }
  activePairIndex = Math.max(0,Math.min(activePairIndex,pairs.length-1));
  const [a,b] = pairs[activePairIndex];
  $("#pairCard").innerHTML = `
    <div class="pair-head">
      <div><div class="meta">זוג רעיונות ${activePairIndex+1} מתוך ${pairs.length}</div><h3 class="pair-question">קראו את שני התקצירים והשוו בכל הקריטריונים</h3></div>
      <span class="pair-progress" id="currentPairProgress"></span>
    </div>
    <div class="comparison-stage">
      ${ideaSummary(a,"רעיון א׳")}
      <aside class="pair-comparisons">
        <div class="comparison-identity"><span>רעיון א׳</span><b>מול</b><span>רעיון ב׳</span></div>
        <h3>השוואה בכל הקריטריונים</h3>
        <p class="note">הזיזו כל סמן לכיוון הרעיון העדיף. המרכז מסמן שוויון.</p>
        <div class="criterion-comparison-list">${AHP_CRITERIA.map(c => criterionComparison(c,a,b)).join("")}</div>
      </aside>
      ${ideaSummary(b,"רעיון ב׳")}
    </div>`;
  renderPairProgress();
  $$('[data-criterion-slider]').forEach(slider => slider.addEventListener("input", event => {
    setComparison(event.target.dataset.criterionSlider,Number(event.target.value),a,b);
  }));
  $$('[data-equal-criterion]').forEach(button => button.addEventListener("click", event => {
    const key = event.currentTarget.dataset.equalCriterion;
    const slider = document.querySelector(`[data-criterion-slider="${key}"]`);
    if(slider) slider.value = "4";
    setComparison(key,4,a,b);
  }));
}

function renderProgress(){
  const total = ratingPairs().length * AHP_CRITERIA.length;
  const completed = AHP_CRITERIA.reduce((sum,c) => sum + completedForCriterion(activeRating,c),0);
  $("#ahpProgress").max = Math.max(total,1);
  $("#ahpProgress").value = completed;
  $("#ahpProgressText").textContent = `${completed} מתוך ${total} השוואות`;
}

function importanceDescription(index,a,b){
  if(index === 4) return "שווים בחשיבות";
  const strengths = ["חשוב באופן קיצוני","חשוב מאוד","חשוב בבירור","חשוב מעט"];
  return index < 4 ? `${a.short} ${strengths[index]}` : `${b.short} ${strengths[8-index]}`;
}

function criterionPreferenceRow(a,b){
  const key = criterionPairKey(a,b);
  const current = activeRating.comparisons._criteriaComparisons[key];
  const answered = Number(current) > 0;
  const index = sliderIndexForRatio(current);
  return `<section class="criterion-preference-row ${answered?"answered":""}" data-criteria-pair='${escapeHtml(key)}'>
    <div class="criterion-preference-head">
      <div><strong>${escapeHtml(a.short)}</strong><span>${escapeHtml(a.points[0])}</span></div>
      <b>מול</b>
      <div><strong>${escapeHtml(b.short)}</strong><span>${escapeHtml(b.points[0])}</span></div>
    </div>
    <span class="criterion-value" data-criteria-pair-value='${escapeHtml(key)}'>${answered?escapeHtml(importanceDescription(index,a,b)):"טרם דורג"}</span>
    <input class="criterion-slider criteria-weight-slider" dir="ltr" type="range" min="0" max="8" step="1" value="${index}" data-criteria-a="${a.key}" data-criteria-b="${b.key}" aria-label="חשיבות ${escapeHtml(a.short)} מול ${escapeHtml(b.short)}">
    <div class="slider-labels"><span>${escapeHtml(a.short)} חשוב יותר</span><span>שווים</span><span>${escapeHtml(b.short)} חשוב יותר</span></div>
  </section>`;
}

function setCriterionPreference(aKey,bKey,index){
  if(!activeRating) return;
  const a = AHP_CRITERIA.find(item => item.key === aKey);
  const b = AHP_CRITERIA.find(item => item.key === bKey);
  if(!a || !b) return;
  const key = criterionPairKey(a,b);
  activeRating.comparisons._criteriaComparisons[key] = SLIDER_RATIOS[index];
  saveActiveRatingLocally();
  renderCriterionPreferenceProgress();
  const row = $$('[data-criteria-pair]').find(element => element.dataset.criteriaPair === key);
  const value = $$('[data-criteria-pair-value]').find(element => element.dataset.criteriaPairValue === key);
  row?.classList.add("answered");
  if(value) value.textContent = importanceDescription(index,a,b);
  renderAhpResults();
}

function renderCriterionPreferenceProgress(){
  if(!activeRating) return;
  const values = activeRating.comparisons._criteriaComparisons || {};
  const completed = criterionPairs().filter(([a,b]) => Number(values[criterionPairKey(a,b)]) > 0).length;
  $("#criteriaWeightProgress").max = criterionPairs().length;
  $("#criteriaWeightProgress").value = completed;
  $("#criteriaWeightProgressText").textContent = `${completed} מתוך ${criterionPairs().length} השוואות`;
}

function renderCriterionPreferences(){
  if(!activeRating) return;
  $("#criteriaPreferenceList").innerHTML = criterionPairs().map(([a,b]) => criterionPreferenceRow(a,b)).join("");
  renderCriterionPreferenceProgress();
  $$('[data-criteria-a][data-criteria-b]').forEach(slider => slider.addEventListener("input",event => {
    setCriterionPreference(event.target.dataset.criteriaA,event.target.dataset.criteriaB,Number(event.target.value));
  }));
}

function solveLinearSystem(matrix,vector){
  const n = vector.length;
  const augmented = matrix.map((row,index) => [...row,vector[index]]);
  for(let column=0;column<n;column++){
    let pivot = column;
    for(let row=column+1;row<n;row++){
      if(Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if(Math.abs(augmented[pivot][column]) < 1e-10) return null;
    [augmented[column],augmented[pivot]] = [augmented[pivot],augmented[column]];
    const divisor = augmented[column][column];
    for(let j=column;j<=n;j++) augmented[column][j] /= divisor;
    for(let row=0;row<n;row++){
      if(row === column) continue;
      const factor = augmented[row][column];
      for(let j=column;j<=n;j++) augmented[row][j] -= factor*augmented[column][j];
    }
  }
  return augmented.map(row => row[n]);
}

function priorityForCriterion(record,criterion){
  const ideas = ideasForRecord(record);
  const n = ideas.length;
  if(!n) return null;
  if(n === 1) return {ideaIds:[String(ideas[0].id)],weights:[1],matrix:[[1]],geometric:[1],lambdaMax:1,ci:0,ri:0,consistency:0,complete:true,residual:0,observations:0};
  const values = record?.comparisons?.[criterion.key] || {};
  const matrix = Array.from({length:n},(_,i) => Array.from({length:n},(_,j) => i===j ? 1 : null));
  const observations = [];
  for(let i=0;i<n;i++){
    for(let j=i+1;j<n;j++){
      const ratio = Number(values[pairKey(ideas[i],ideas[j])]);
      if(!(ratio > 0)) continue;
      matrix[i][j] = ratio;
      matrix[j][i] = 1/ratio;
      observations.push({i,j,ratio,logRatio:Math.log(ratio)});
    }
  }
  if(observations.length < n-1) return null;

  const adjacency = Array.from({length:n},() => []);
  observations.forEach(({i,j}) => { adjacency[i].push(j); adjacency[j].push(i); });
  const reached = new Set([0]);
  const queue = [0];
  while(queue.length){
    const current = queue.shift();
    adjacency[current].forEach(next => { if(!reached.has(next)){ reached.add(next); queue.push(next); } });
  }
  if(reached.size !== n) return null;

  const laplacian = Array.from({length:n},() => Array(n).fill(0));
  const rhs = Array(n).fill(0);
  observations.forEach(({i,j,logRatio}) => {
    laplacian[i][i] += 1; laplacian[j][j] += 1;
    laplacian[i][j] -= 1; laplacian[j][i] -= 1;
    rhs[i] += logRatio; rhs[j] -= logRatio;
  });
  const reduced = laplacian.slice(0,n-1).map(row => row.slice(0,n-1));
  const logWeights = solveLinearSystem(reduced,rhs.slice(0,n-1));
  if(!logWeights) return null;
  logWeights.push(0);
  const raw = logWeights.map(Math.exp);
  const rawSum = raw.reduce((sum,value) => sum+value,0);
  const weights = raw.map(value => value/rawSum);
  const residual = Math.sqrt(observations.reduce((sum,item) => {
    const error = logWeights[item.i]-logWeights[item.j]-item.logRatio;
    return sum+error*error;
  },0)/observations.length);
  const complete = observations.length === n*(n-1)/2;
  let lambdaMax = null, ci = null, ri = null, consistency = null;
  if(complete){
    lambdaMax = matrix.reduce((total,row,i) => {
      const weightedRow = row.reduce((sum,value,j) => sum+value*weights[j],0);
      return total+weightedRow/weights[i];
    },0)/n;
    ci = n > 2 ? Math.max(0,(lambdaMax-n)/(n-1)) : 0;
    ri = [0,0,0,0.58,0.90,1.12,1.24,1.32,1.41,1.45,1.49][n] || 1.49;
    consistency = ri ? ci/ri : 0;
  }
  const geometric = complete
    ? matrix.map(row => row.reduce((product,value) => product*value,1) ** (1/n))
    : raw;
  return {
    ideaIds:ideas.map(idea => String(idea.id)),weights,matrix,geometric,
    lambdaMax,ci,ri,consistency,complete,residual,observations:observations.length
  };
}

function criterionWeightPriority(record){
  const items = AHP_CRITERIA;
  const n = items.length;
  const values = record?.comparisons?._criteriaComparisons || {};
  const matrix = Array.from({length:n},(_,i) => Array.from({length:n},(_,j) => i===j ? 1 : null));
  const observations = [];
  for(let i=0;i<n;i++){
    for(let j=i+1;j<n;j++){
      const ratio = Number(values[criterionPairKey(items[i],items[j])]);
      if(!(ratio > 0)) continue;
      matrix[i][j] = ratio;
      matrix[j][i] = 1/ratio;
      observations.push({i,j,ratio,logRatio:Math.log(ratio)});
    }
  }
  if(observations.length < n-1) return null;
  const adjacency = Array.from({length:n},() => []);
  observations.forEach(({i,j}) => { adjacency[i].push(j); adjacency[j].push(i); });
  const reached = new Set([0]);
  const queue = [0];
  while(queue.length){
    const current = queue.shift();
    adjacency[current].forEach(next => { if(!reached.has(next)){ reached.add(next); queue.push(next); } });
  }
  if(reached.size !== n) return null;

  const laplacian = Array.from({length:n},() => Array(n).fill(0));
  const rhs = Array(n).fill(0);
  observations.forEach(({i,j,logRatio}) => {
    laplacian[i][i] += 1; laplacian[j][j] += 1;
    laplacian[i][j] -= 1; laplacian[j][i] -= 1;
    rhs[i] += logRatio; rhs[j] -= logRatio;
  });
  const logWeights = solveLinearSystem(laplacian.slice(0,n-1).map(row => row.slice(0,n-1)),rhs.slice(0,n-1));
  if(!logWeights) return null;
  logWeights.push(0);
  const raw = logWeights.map(Math.exp);
  const rawSum = raw.reduce((sum,value) => sum+value,0);
  const weights = raw.map(value => value/rawSum);
  const residual = Math.sqrt(observations.reduce((sum,item) => {
    const error = logWeights[item.i]-logWeights[item.j]-item.logRatio;
    return sum+error*error;
  },0)/observations.length);
  const complete = observations.length === n*(n-1)/2;
  let lambdaMax = null, ci = null, ri = null, consistency = null;
  if(complete){
    lambdaMax = matrix.reduce((total,row,i) => {
      const weightedRow = row.reduce((sum,value,j) => sum+value*weights[j],0);
      return total+weightedRow/weights[i];
    },0)/n;
    ci = Math.max(0,(lambdaMax-n)/(n-1));
    ri = 1.24;
    consistency = ci/ri;
  }
  return {weights,matrix,lambdaMax,ci,ri,consistency,complete,residual,observations:observations.length};
}

function weightForIdea(result,idea){
  const index = result.ideaIds.indexOf(String(idea.id));
  return index >= 0 ? result.weights[index] : 0;
}

function overallRanking(priorities,ideas=rankableIdeas(),criterionWeights=AHP_CRITERIA.map(criterion => criterion.weight)){
  if(priorities.some(result => !result)) return null;
  return ideas.map(idea => ({
    idea,
    score:AHP_CRITERIA.reduce((sum,criterion,cIndex) => sum + weightForIdea(priorities[cIndex],idea)*criterionWeights[cIndex],0)
  })).sort((a,b) => b.score-a.score);
}

function rankingHtml(ranking){
  return `<ol class="ranking-list">${ranking.map((row,index) => `<li><span>${index+1}. ${escapeHtml(row.idea.ideaName || "ללא שם")}</span><strong>${row.score.toFixed(1)}%</strong></li>`).join("")}</ol>`;
}

function criterionWeightChips(result,official=false){
  const weights = official ? AHP_CRITERIA.map(criterion => criterion.weight/100) : result?.weights;
  if(!weights) return "";
  return `<div class="weight-chips">${AHP_CRITERIA.map((criterion,index) => `<span class="weight-chip">${escapeHtml(criterion.short)} <strong>${(weights[index]*100).toFixed(1)}%</strong></span>`).join("")}</div>`;
}

function renderCriterionWeightOverview(result,teamRecord){
  const table = $("#criterionWeightOverviewTable");
  const status = $("#criterionWeightOverviewStatus");
  if(!table || !status) return;
  if(!result){
    status.textContent = "ממתין להשוואות צוות";
    table.innerHTML = `<div class="calculation-empty">עדיין אין רשת השוואות מחוברת בין הקריטריונים. המשקלים הרשמיים נשארים בתוקף.</div>`;
    return;
  }
  const cells = [
    `<div class="overview-header">קריטריון</div><div class="overview-header">רשמי</div><div class="overview-header">העדפות הצוות</div><div class="overview-header">הפרש</div>`,
    ...AHP_CRITERIA.map((criterion,index) => {
      const generated = result.weights[index]*100;
      const delta = generated-criterion.weight;
      const last = index===AHP_CRITERIA.length-1 ? " overview-last-row" : "";
      return `<div class="${last}">${escapeHtml(criterion.name)}</div><div class="${last}">${fixed(criterion.weight,1)}%</div><div class="${last}"><strong>${fixed(generated,1)}%</strong></div><div class="${delta>=0?"weight-delta-positive":"weight-delta-negative"}${last}">${delta>=0?"+":""}${fixed(delta,1)}</div>`;
    })
  ];
  table.innerHTML = `<div class="weight-overview-grid">${cells.join("")}</div>`;
  status.textContent = result.consistency == null
    ? "משקל ניסויי · מטריצה חלקית"
    : `CR ${fixed(result.consistency,3)} · ${teamRecord.completedCriterionWeightRaters} מדרגים`;
}

function aggregateTeamRecord(){
  const pairs = ideaPairs();
  const aggregate = emptyComparisons();
  const completedRaters = {};
  const pairCounts = {};
  AHP_CRITERIA.forEach(criterion => {
    const completed = sharedRatings.filter(record => {
      const assignedPairs = ratingPairs(record);
      return assignedPairs.length && assignedPairs.every(([a,b]) => Number(record.comparisons?.[criterion.key]?.[pairKey(a,b)]) > 0);
    });
    completedRaters[criterion.key] = completed.length;
    pairs.forEach(([a,b]) => {
      const key = pairKey(a,b);
      const ratios = sharedRatings.map(record => Number(record.comparisons?.[criterion.key]?.[key])).filter(value => value > 0);
      pairCounts[`${criterion.key}:${key}`] = ratios.length;
      if(ratios.length) aggregate[criterion.key][key] = ratios.reduce((product,value) => product*value,1) ** (1/ratios.length);
    });
  });
  const completedCriterionWeightRaters = sharedRatings.filter(record => criterionPairs().every(([a,b]) => Number(record.comparisons?._criteriaComparisons?.[criterionPairKey(a,b)]) > 0)).length;
  const criterionPairCounts = {};
  criterionPairs().forEach(([a,b]) => {
    const key = criterionPairKey(a,b);
    const ratios = sharedRatings.map(record => Number(record.comparisons?._criteriaComparisons?.[key])).filter(value => value > 0);
    criterionPairCounts[key] = ratios.length;
    if(ratios.length) aggregate._criteriaComparisons[key] = ratios.reduce((product,value) => product*value,1) ** (1/ratios.length);
  });
  return {raterName:"דירוג הצוות", comparisons:aggregate, completedRaters, pairCounts, completedCriterionWeightRaters, criterionPairCounts};
}

function aggregateTeamPriorities(){
  const record = aggregateTeamRecord();
  return AHP_CRITERIA.map(criterion => priorityForCriterion(record,criterion));
}

function calculationScopes(){
  const options = [{value:"team",label:`דירוג הצוות (${sharedRatings.length} מדרגים שמורים)`,record:aggregateTeamRecord(),team:true}];
  if(activeRating) options.push({value:"active",label:`הדירוג האישי הנוכחי — ${activeRating.raterName}`,record:activeRating});
  sharedRatings.forEach((record,index) => options.push({value:`shared-${index}`,label:`מדרג/ת — ${record.raterName}`,record}));
  return options;
}

function selectedCalculationScope(){
  const options = calculationScopes();
  return options.find(option => option.value === calculationScope) || options[0];
}

function fixed(value,digits=3){
  return Number(value).toLocaleString("he-IL",{minimumFractionDigits:digits,maximumFractionDigits:digits});
}

function matrixValue(value){
  if(value == null) return "—";
  if(Math.abs(value-1)<.000001) return "1";
  return value >= 1 ? fixed(value,2) : fixed(value,3);
}

function ideaKeyHtml(ideas){
  return `<div class="idea-key">${ideas.map((idea,index) => `<span><b class="idea-code">R${index+1}</b>${escapeHtml(idea.ideaName || "ללא שם")}</span>`).join("")}</div>`;
}

function overallCalculationHtml(priorities,ideas=rankableIdeas()){
  if(priorities.some(result => !result)){
    return `<section class="overall-calculation"><h4>חישוב הציון הכולל</h4><div class="calculation-empty">הציון הכולל יוצג לאחר השלמת כל ההשוואות בכל ששת הקריטריונים.</div></section>`;
  }
  const rows = ideas.map((idea,ideaIndex) => {
    const contributions = AHP_CRITERIA.map((criterion,cIndex) => weightForIdea(priorities[cIndex],idea)*criterion.weight);
    const total = contributions.reduce((sum,value) => sum+value,0);
    return `<tr><td><b class="idea-code">R${ideaIndex+1}</b>${escapeHtml(idea.ideaName || "ללא שם")}</td>${contributions.map(value => `<td>${fixed(value,2)}</td>`).join("")}<td><strong>${fixed(total,2)}%</strong></td></tr>`;
  }).join("");
  return `<section class="overall-calculation">
    <h4>תרומת הקריטריונים לציון הכולל</h4>
    <p class="note">כל תא הוא המשקל המקומי של הרעיון בקריטריון כפול משקל הקריטריון הרשמי. סכום השורה הוא הציון הכולל.</p>
    <div class="calculation-formula">Total(i) = Σ [ local weight(i,c) × official criterion weight(c) ]</div>
    <div class="calculation-table-wrap"><table class="calculation-table"><thead><tr><th>רעיון</th>${AHP_CRITERIA.map(c => `<th>${escapeHtml(c.short)}<br>${c.weight}%</th>`).join("")}<th>ציון כולל</th></tr></thead><tbody>${rows}</tbody></table></div>
  </section>`;
}

function criterionWeightsDetailHtml(scope){
  const result = criterionWeightPriority(scope.record);
  if(!result){
    return `<section class="overall-calculation"><h4>משקלי הקריטריונים בשני התרחישים</h4><div class="calculation-empty">עדיין אין רשת השוואות מחוברת בין ששת הקריטריונים.</div></section>`;
  }
  const rows = AHP_CRITERIA.map((criterion,index) => {
    const generated = result.weights[index]*100;
    return `<tr><td>${escapeHtml(criterion.name)}</td><td>${fixed(criterion.weight,1)}%</td><td><strong>${fixed(generated,1)}%</strong></td><td>${generated-criterion.weight>=0?"+":""}${fixed(generated-criterion.weight,1)}</td></tr>`;
  }).join("");
  const status = result.consistency == null
    ? `המטריצה חלקית; CR קלאסי אינו זמין. שגיאת LLSM: ${fixed(result.residual,3)}.`
    : `יחס עקביות CR: ${fixed(result.consistency,3)}${result.consistency>.10?" — מעל הסף, מומלץ לבדוק את השוואות הקריטריונים":" — תקין"}.`;
  return `<section class="overall-calculation">
    <h4>משקלי הקריטריונים בשני התרחישים</h4>
    <p class="note">התרחיש הרשמי נשאר ללא שינוי. תרחיש העדפות הצוות נגזר מהשוואות הקריטריונים.</p>
    <div class="calculation-table-wrap"><table class="calculation-table"><thead><tr><th>קריטריון</th><th>משקל רשמי</th><th>משקל לפי העדפות</th><th>הפרש בנקודות אחוז</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="scenario-consistency">${status}</div>
  </section>`;
}

function renderCalculationDetails(){
  const scopeSelect = $("#calculationScope");
  const criterionSelect = $("#calculationCriterion");
  const content = $("#calculationContent");
  if(!scopeSelect || !criterionSelect || !content) return;
  const scopes = calculationScopes();
  if(!scopes.some(option => option.value === calculationScope)) calculationScope = scopes[0].value;
  scopeSelect.innerHTML = scopes.map(option => `<option value="${option.value}" ${option.value===calculationScope?"selected":""}>${escapeHtml(option.label)}</option>`).join("");
  criterionSelect.innerHTML = AHP_CRITERIA.map(criterion => `<option value="${criterion.key}" ${criterion.key===calculationCriterionKey?"selected":""}>${escapeHtml(criterion.name)} — ${criterion.weight}%</option>`).join("");

  const scope = selectedCalculationScope();
  const criterion = AHP_CRITERIA.find(item => item.key === calculationCriterionKey) || AHP_CRITERIA[0];
  const result = priorityForCriterion(scope.record,criterion);
  const priorities = AHP_CRITERIA.map(item => priorityForCriterion(scope.record,item));
  const scopeRationale = scope.record.rationale || scope.record.comparisons?._rationale || EXERCISE_RATIONALES.get(normalizedRaterName(scope.record.raterName)) || "";
  const rationaleHtml = scopeRationale
    ? `<section class="rating-rationale-display"><strong>נימוקי המדרג/ת</strong><p>${escapeHtml(scopeRationale)}</p></section>`
    : "";
  const criterionWeightsHtml = criterionWeightsDetailHtml(scope);
  if(!result){
    content.innerHTML = `${rationaleHtml}${criterionWeightsHtml}<div class="calculation-empty">אין עדיין רשת השוואות מחוברת לחישוב הקריטריון „${escapeHtml(criterion.short)}” עבור ${escapeHtml(scope.label)}.</div>${overallCalculationHtml(priorities,ideasForRecord(scope.record))}`;
    return;
  }

  const ideas = ideasForRecord(scope.record);
  const warning = result.consistency != null && result.consistency > .10;
  const matrixHead = `<tr><th>רעיון</th>${ideas.map((idea,index) => `<th title="${escapeHtml(idea.ideaName || "ללא שם")}">R${index+1}</th>`).join("")}</tr>`;
  const matrixRows = result.matrix.map((row,rowIndex) => `<tr><td><b class="idea-code">R${rowIndex+1}</b>${escapeHtml(ideas[rowIndex].ideaName || "ללא שם")}</td>${row.map(value => `<td>${matrixValue(value)}</td>`).join("")}</tr>`).join("");
  const weightRows = ideas.map((idea,index) => `<tr><td><b class="idea-code">R${index+1}</b>${escapeHtml(idea.ideaName || "ללא שם")}</td><td>${fixed(result.geometric[index],4)}</td><td><strong>${fixed(result.weights[index]*100,2)}%</strong></td><td>${fixed(result.weights[index]*criterion.weight,2)} נק׳</td></tr>`).join("");
  const observedPairs = ideaPairs().filter(([a,b]) => Number(scope.record.comparisons?.[criterion.key]?.[pairKey(a,b)]) > 0).length;
  const teamNote = scope.team ? `<p class="note">מטריצת הצוות מאחדת כל זוג באמצעות ממוצע גאומטרי. בקריטריון זה כוסו ${observedPairs} מתוך ${ideaPairs().length} זוגות על ידי ${scope.record.completedRaters[criterion.key] || 0} מדרגים שהשלימו את השלישייה שלהם.</p>` : `<p class="note">דירוג אישי זה מבוסס על שלושת הרעיונות שהוקצו למדרג/ת.</p>`;
  const crAvailable = result.consistency != null;
  const consistencyStatus = crAvailable
    ? (warning ? "CR גבוה מ־0.10 — מומלץ לעבור על השוואות סותרות בקריטריון זה." : "CR אינו גבוה מ־0.10 — רמת העקביות תקינה.")
    : `המטריצה חלקית ולכן CR הקלאסי אינו זמין. שגיאת ההתאמה הלוגריתמית היא ${fixed(result.residual,3)}.`;
  const methodFormula = result.complete
    ? "GMᵢ = (Π aᵢⱼ)^(1/n) · wᵢ = GMᵢ / ΣGM · CI = (λmax − n)/(n − 1) · CR = CI / RI"
    : "min Σ [ ln(aᵢⱼ) − ln(wᵢ) + ln(wⱼ) ]² · normalize Σwᵢ = 1";
  content.innerHTML = `${rationaleHtml}${criterionWeightsHtml}<section class="criterion-calculation">
    <h4>${escapeHtml(criterion.name)} · משקל רשמי ${criterion.weight}%</h4>
    ${teamNote}
    <div class="calculation-summary">
      <div class="calculation-metric"><span>λmax</span><strong>${result.lambdaMax == null ? "—" : fixed(result.lambdaMax,4)}</strong></div>
      <div class="calculation-metric"><span>מדד עקביות CI</span><strong>${result.ci == null ? "—" : fixed(result.ci,4)}</strong></div>
      <div class="calculation-metric"><span>מדד אקראי RI</span><strong>${result.ri == null ? "—" : fixed(result.ri,2)}</strong></div>
      <div class="calculation-metric ${crAvailable?(warning?"warning":"good"):""}"><span>יחס עקביות CR</span><strong>${crAvailable ? fixed(result.consistency,3) : "לא זמין"}</strong></div>
    </div>
    <div class="calculation-status ${crAvailable?(warning?"warning":"good"):""}">${consistencyStatus}</div>
    <div class="calculation-formula">${methodFormula}</div>
    <h4 style="margin-top:18px">מטריצת ההשוואות ההדדית</h4>
    <p class="note">ערך גדול מ־1 פירושו שרעיון השורה הועדף על רעיון העמודה; הערך ההפוך מופיע בצד השני של האלכסון.</p>
    ${ideaKeyHtml(ideas)}
    <div class="calculation-table-wrap"><table class="calculation-table"><thead>${matrixHead}</thead><tbody>${matrixRows}</tbody></table></div>
    <h4 style="margin-top:18px">המשקלים המקומיים בקריטריון</h4>
    <div class="calculation-table-wrap"><table class="calculation-table"><thead><tr><th>רעיון</th><th>${result.complete?"ממוצע גאומטרי":"ערך LLSM יחסי"}</th><th>משקל מקומי</th><th>תרומה לציון הכולל</th></tr></thead><tbody>${weightRows}</tbody></table></div>
  </section>${overallCalculationHtml(priorities,ideas)}`;
}

function calculationAuditData(){
  const scope = selectedCalculationScope();
  const scopeIdeas = ideasForRecord(scope.record);
  const priorities = AHP_CRITERIA.map(criterion => priorityForCriterion(scope.record,criterion));
  return {
    generatedAt:new Date().toISOString(),
    scope:scope.label,
    officialWeights:Object.fromEntries(AHP_CRITERIA.map(criterion => [criterion.name,criterion.weight])),
    preferenceWeights:criterionWeightPriority(scope.record),
    rationale:scope.record.rationale || scope.record.comparisons?._rationale || EXERCISE_RATIONALES.get(normalizedRaterName(scope.record.raterName)) || "",
    ideas:scopeIdeas.map((idea,index) => ({code:`R${index+1}`,id:idea.id,name:idea.ideaName})),
    criteria:AHP_CRITERIA.map((criterion,index) => ({
      key:criterion.key,name:criterion.name,officialWeight:criterion.weight,
      ...(priorities[index] ? priorities[index] : {incomplete:true})
    })),
    comparisons:scope.record.comparisons
  };
}

function exportCalculationCsv(){
  const data = calculationAuditData();
  const rows = [["דירוג",data.scope],["נוצר בתאריך",data.generatedAt],[],["משקלי קריטריונים"],["קריטריון","משקל רשמי","משקל לפי העדפות"]];
  AHP_CRITERIA.forEach((criterion,index) => rows.push([criterion.name,criterion.weight,data.preferenceWeights?.weights?.[index] != null ? data.preferenceWeights.weights[index]*100 : "לא הושלם"]));
  rows.push([], ["קריטריון","משקל רשמי","רעיון","משקל מקומי","תרומה לציון הכולל","lambda max","CI","RI","CR"]);
  data.criteria.forEach(criterion => {
    if(criterion.incomplete){ rows.push([criterion.name,criterion.officialWeight,"לא הושלם"]); return; }
    data.ideas.forEach((idea,index) => rows.push([criterion.name,criterion.officialWeight,idea.name,criterion.weights[index],criterion.weights[index]*criterion.officialWeight,criterion.lambdaMax,criterion.ci,criterion.ri,criterion.consistency]));
  });
  download("פירוט_חישובי_AHP.csv","\ufeff"+rows.map(row => row.map(csvEscape).join(",")).join("\n"),"text/csv;charset=utf-8");
}

function exportCalculationJson(){
  download("פירוט_חישובי_AHP.json",JSON.stringify(calculationAuditData(),null,2),"application/json");
}

function renderAhpResults(){
  if(activeRating){
    const personal = AHP_CRITERIA.map(c => priorityForCriterion(activeRating,c));
    const ranking = overallRanking(personal,ideasForRecord(activeRating));
    $("#personalRanking").innerHTML = ranking ? rankingHtml(ranking) : `<span class="note">הדירוג יוצג לאחר השלמת כל ההשוואות.</span>`;
    $("#consistencyReport").innerHTML = personal.map((result,index) => {
      if(!result) return `<div>${escapeHtml(AHP_CRITERIA[index].short)}: טרם הושלם</div>`;
      if(result.consistency == null) return `<div>${escapeHtml(AHP_CRITERIA[index].short)}: מטריצה חלקית — CR אינו זמין</div>`;
      const warning = result.consistency > .10;
      return `<div class="${warning?"consistency-warning":""}">${escapeHtml(AHP_CRITERIA[index].short)}: יחס עקביות ${result.consistency.toFixed(2)}${warning?" — מומלץ לבדוק השוואות סותרות":" — תקין"}</div>`;
    }).join("");
    const personalCriterionWeights = criterionWeightPriority(activeRating);
    $("#personalCriterionWeights").innerHTML = personalCriterionWeights
      ? `<strong>המשקלים שנוצרו מהעדפותיך:</strong>${criterionWeightChips(personalCriterionWeights)}<div class="scenario-consistency">${personalCriterionWeights.consistency == null ? "המטריצה עדיין חלקית; CR אינו זמין." : `יחס עקביות אישי: ${personalCriterionWeights.consistency.toFixed(3)}${personalCriterionWeights.consistency>.10?" — מומלץ לבדוק את ההשוואות":" — תקין"}`}</div>`
      : "המשקלים האישיים יוצגו לאחר יצירת רשת השוואות מחוברת בין הקריטריונים.";
  }
  const teamRecord = aggregateTeamRecord();
  const teamPriorities = AHP_CRITERIA.map(criterion => priorityForCriterion(teamRecord,criterion));
  const officialTeam = overallRanking(teamPriorities);
  $("#teamRanking").innerHTML = officialTeam ? `${rankingHtml(officialTeam)}${criterionWeightChips(null,true)}` : `<span class="note">דירוג הצוות יוצג כאשר תהיה רשת השוואות מחוברת בכל קריטריון.</span>`;
  const preferenceWeights = criterionWeightPriority(teamRecord);
  const preferenceTeam = preferenceWeights ? overallRanking(teamPriorities,rankableIdeas(),preferenceWeights.weights.map(value => value*100)) : null;
  $("#preferenceTeamRanking").innerHTML = preferenceTeam ? rankingHtml(preferenceTeam) : `<span class="note">הדירוג יוצג לאחר שתיווצר רשת השוואות מחוברת בין הקריטריונים.</span>`;
  const criterionCoverage = criterionPairs().filter(([a,b]) => Number(teamRecord.comparisons._criteriaComparisons[criterionPairKey(a,b)]) > 0).length;
  $("#preferenceWeightsSummary").innerHTML = preferenceWeights
    ? `${criterionWeightChips(preferenceWeights)}<div class="scenario-consistency">כיסוי: ${criterionCoverage} מתוך ${criterionPairs().length} זוגות · ${teamRecord.completedCriterionWeightRaters} מדרגים השלימו את כל ההשוואות · ${preferenceWeights.consistency == null ? `מטריצה חלקית; שגיאת LLSM ${fixed(preferenceWeights.residual,3)}` : `CR צוותי ${fixed(preferenceWeights.consistency,3)}${preferenceWeights.consistency>.10?" — מעל הסף":" — תקין"}`}</div>`
    : `<div class="note">כיסוי השוואות בין הקריטריונים: ${criterionCoverage} מתוך ${criterionPairs().length}.</div>`;
  renderCriterionWeightOverview(preferenceWeights,teamRecord);
  $("#sharedRaters").textContent = sharedRatings.length
    ? `${sharedRatings.length} מדרגים שמרו נתונים: ${sharedRatings.map(r => r.raterName).join(", ")}`
    : "עדיין לא נשמרו דירוגים משותפים.";
  renderCalculationDetails();
}

function renderAhpWorkspace(){
  if(!activeRating) return;
  $("#ahpWorkspace").classList.add("show");
  $("#ratingRationale").value = activeRating.comparisons._rationale || "";
  renderProgress();
  renderAllCriteriaPairCard();
  renderCriterionPreferences();
  renderAhpResults();
  const pairs = ratingPairs();
  $("#previousPair").disabled = !pairs.length || activePairIndex===0;
  $("#nextPair").disabled = !pairs.length || activePairIndex===pairs.length-1;
}

function movePair(direction){
  const pairs = ratingPairs();
  if(!pairs.length) return;
  activePairIndex = Math.max(0,Math.min(activePairIndex+direction,pairs.length-1));
  renderAhpWorkspace();
  $("#pairCard").scrollIntoView({behavior:"smooth",block:"start"});
}

$("#previousPair").addEventListener("click", () => movePair(-1));
$("#nextPair").addEventListener("click", () => movePair(1));
$("#calculationScope").addEventListener("change", event => {
  calculationScope = event.target.value;
  renderCalculationDetails();
});
$("#calculationCriterion").addEventListener("change", event => {
  calculationCriterionKey = event.target.value;
  renderCalculationDetails();
});
$("#exportAhpCsv").addEventListener("click", exportCalculationCsv);
$("#exportAhpJson").addEventListener("click", exportCalculationJson);
$("#ratingRationale").addEventListener("input", event => {
  if(!activeRating) return;
  activeRating.comparisons._rationale = event.target.value.slice(0,5000);
  saveActiveRatingLocally();
});

$("#startRating").addEventListener("click", () => {
  const name = $("#raterName").value.trim();
  if(!name){
    setAhpStatus("יש להזין שם כדי לשמור ולזהות את הדירוג.",false);
    return;
  }
  if(rankableIdeas().length < 2){
    setAhpStatus("נדרשים לפחות שני רעיונות כדי להתחיל דירוג השוואתי.",false);
    return;
  }
  const shared = sharedRatings.find(row => normalizedRaterName(row.raterName) === normalizedRaterName(name));
  const local = localRatingFor(name);
  const source = [shared,local].filter(Boolean).sort((a,b) => String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")))[0];
  const assignment = storedAssignment(source).length ? storedAssignment(source) : assignmentForRater(name);
  activeRating = {
    raterName:name,
    updatedAt:new Date().toISOString(),
    comparisons:comparisonsForAssignment(source?.comparisons,assignment)
  };
  const pairs = ratingPairs();
  const missing = pairs.findIndex(([a,b]) => AHP_CRITERIA.some(c => !Number(activeRating.comparisons[c.key][pairKey(a,b)])));
  activePairIndex = missing >= 0 ? missing : 0;
  saveActiveRatingLocally();
  const ideaNames = ideasForRecord(activeRating).map(idea => idea.ideaName).join("; ");
  setAhpStatus(source && storedAssignment(source).length
    ? `הדירוג של ${name} נטען. אפשר להמשיך מהמקום שבו הופסק.`
    : `הוקצו ל-${name} שלושה רעיונות בדגימה המאוזנת: ${ideaNames}.`);
  renderAhpWorkspace();
});

$("#saveSharedRating").addEventListener("click", async () => {
  if(!activeRating) return;
  activeRating.comparisons._rationale = $("#ratingRationale").value.slice(0,5000);
  if(!ratingBackendAvailable){
    setAhpStatus("הדירוג נשמר בדפדפן זה, אך ממשק הדירוג המשותף עדיין לא הותקן ב-Google Apps Script.",false);
    return;
  }
  try{
    saveActiveRatingLocally();
    await storeSharedRating(activeRating);
    sharedRatings = await fetchSharedRatings();
    setAhpStatus(`הדירוג של ${activeRating.raterName} נשמר לצוות. ניתן לחזור ולעדכן אותו בכל עת.`);
    renderAhpResults();
  }catch(err){
    console.error(err);
    setAhpStatus("שמירת הדירוג המשותף נכשלה. הדירוג נשמר בינתיים בדפדפן זה.",false);
  }
});

async function renderScores(){
  cachedIdeas = await fetchIdeas();
  renderCriteriaGuide();
  const savedName = localStorage.getItem(RATER_KEY) || "";
  if(savedName && !$("#raterName").value) $("#raterName").value = savedName;
  try{
    sharedRatings = await fetchSharedRatings();
    ratingBackendAvailable = true;
  }catch(err){
    ratingBackendAvailable = false;
    sharedRatings = [];
  }
  renderAhpResults();
  if(activeRating) renderAhpWorkspace();
}

renderScores();
