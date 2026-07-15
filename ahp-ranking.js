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
const SLIDER_RATIOS = [9,7,5,3,1,1/3,1/5,1/7,1/9];

function normalizedRaterName(value){
  return String(value || "").trim().replace(/\s+/g," ").toLowerCase();
}

function rankableIdeas(){
  return cachedIdeas.filter(item => item?.id).slice().sort((a,b) => String(a.id).localeCompare(String(b.id)));
}

function ideaPairs(){
  const items = rankableIdeas();
  const pairs = [];
  for(let i=0;i<items.length;i++){
    for(let j=i+1;j<items.length;j++) pairs.push([items[i],items[j]]);
  }
  return pairs;
}

function pairKey(a,b){ return JSON.stringify([a.id,b.id]); }
function emptyComparisons(){ return Object.fromEntries(AHP_CRITERIA.map(c => [c.key,{}])); }

function sanitizeComparisons(value){
  const clean = emptyComparisons();
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
  const res = await fetch(url + (url.includes("?") ? "&" : "?") + "action=listRatings", {cache:"no-store"});
  if(!res.ok) throw new Error("Ratings network error");
  const payload = await res.json();
  if(payload.status !== "ok" || !Array.isArray(payload.data)) throw new Error(payload.message || "Ratings unavailable");
  return payload.data.map(row => {
    let comparisons = row.comparisons;
    if(typeof comparisons === "string"){
      try{ comparisons = JSON.parse(comparisons || "{}"); }catch{ comparisons = {}; }
    }
    return {
      raterName:String(row.raterName || ""),
      updatedAt:String(row.updatedAt || ""),
      comparisons:sanitizeComparisons(comparisons)
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
  const pairs = ideaPairs();
  const values = record?.comparisons?.[criterion.key] || {};
  return pairs.filter(([a,b]) => Number(values[pairKey(a,b)]) > 0).length;
}

function shortened(value,max=520){
  const text = String(value || "").trim();
  return text.length > max ? text.slice(0,max).trim() + "…" : text;
}

function summarySection(label,value,max=520){
  const text = String(value || "").trim();
  if(!text) return "";
  const preview = shortened(text,max);
  const full = text.length > max ? `<details><summary>הצגת הנוסח המלא</summary><p>${escapeHtml(text)}</p></details>` : "";
  return `<section class="summary-section"><strong>${escapeHtml(label)}</strong><p>${escapeHtml(preview)}</p>${full}</section>`;
}

function ideaSummary(item,label){
  const execution = [item.complexity,item.resources,item.budgetEstimate ? `תקציב משוער: ${item.budgetEstimate} ₪` : ""].filter(Boolean).join("\n");
  const access = [item.gapReduction,item.languagesAccessibility].filter(Boolean).join("\n");
  const format = [item.activityFormat ? `פורמט: ${item.activityFormat}` : "",item.distribution].filter(Boolean).join("\n");
  const continuity = [item.teamContribution,item.continuity ? `מה יישאר לציבור: ${item.continuity}` : ""].filter(Boolean).join("\n");
  return `<article class="pair-idea">
    <h4>${escapeHtml(label)}: ${escapeHtml(item.ideaName || "ללא שם")}</h4>
    <p class="idea-researcher">הוצע על ידי: ${escapeHtml(item.researcherName || "לא צוין")}</p>
    <div class="idea-summary">
      ${summarySection("מה הציבור יעשה בפועל?",item.publicAction,700)}
      ${summarySection("על איזה ממצא מחקרי הרעיון נשען?",item.researchFinding,700)}
      ${summarySection("קהל היעד",item.targetAudience,350)}
      ${summarySection("מה יגרום לאנשים לעצור ולהשתתף?",item.hook,500)}
      ${summarySection("פורמט והפצה",format,500)}
      ${summarySection("צמצום פערים ונגישות",access,550)}
      ${summarySection("מורכבות, משאבים ותקציב",execution,550)}
      ${summarySection("מעורבות החוקרים והמשכיות",continuity,550)}
    </div>
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
  const pairs = ideaPairs();
  if(!pairs.length) return;
  const [a,b] = pairs[activePairIndex];
  const answered = AHP_CRITERIA.filter(c => Number(activeRating.comparisons[c.key][pairKey(a,b)]) > 0).length;
  const element = $("#currentPairProgress");
  if(element) element.textContent = `${answered} מתוך ${AHP_CRITERIA.length} קריטריונים הושלמו`;
}

function renderAllCriteriaPairCard(){
  const pairs = ideaPairs();
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
    <div class="pair-ideas">
      ${ideaSummary(a,"רעיון א׳")}
      <div class="pair-versus">מול</div>
      ${ideaSummary(b,"רעיון ב׳")}
    </div>
    <div class="pair-comparisons">
      <h3>דירוג השוואתי לפי כל הקריטריונים</h3>
      <p class="note">הזיזו כל סמן לכיוון הרעיון העדיף. מרכז הסמן פירושו ששני הרעיונות שווים באותו קריטריון.</p>
      <div class="criterion-comparison-list">${AHP_CRITERIA.map(c => criterionComparison(c,a,b)).join("")}</div>
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
  const total = ideaPairs().length * AHP_CRITERIA.length;
  const completed = AHP_CRITERIA.reduce((sum,c) => sum + completedForCriterion(activeRating,c),0);
  $("#ahpProgress").max = Math.max(total,1);
  $("#ahpProgress").value = completed;
  $("#ahpProgressText").textContent = `${completed} מתוך ${total} השוואות`;
}

function priorityForCriterion(record,criterion){
  const ideas = rankableIdeas();
  const n = ideas.length;
  if(!n) return null;
  if(n === 1) return {weights:[1], consistency:0};
  const values = record?.comparisons?.[criterion.key] || {};
  const matrix = Array.from({length:n},() => Array(n).fill(1));
  for(let i=0;i<n;i++){
    for(let j=i+1;j<n;j++){
      const ratio = Number(values[pairKey(ideas[i],ideas[j])]);
      if(!(ratio > 0)) return null;
      matrix[i][j] = ratio;
      matrix[j][i] = 1/ratio;
    }
  }
  const geometric = matrix.map(row => row.reduce((product,value) => product*value,1) ** (1/n));
  const sum = geometric.reduce((a,b) => a+b,0);
  const weights = geometric.map(value => value/sum);
  const lambdaMax = matrix.reduce((total,row,i) => {
    const weightedRow = row.reduce((s,value,j) => s+value*weights[j],0);
    return total + weightedRow/weights[i];
  },0)/n;
  const ci = n > 2 ? Math.max(0,(lambdaMax-n)/(n-1)) : 0;
  const ri = [0,0,0,0.58,0.90,1.12,1.24,1.32,1.41,1.45,1.49][n] || 1.49;
  return {weights, consistency:ri ? ci/ri : 0};
}

function overallRanking(priorities){
  if(priorities.some(result => !result)) return null;
  const ideas = rankableIdeas();
  return ideas.map((idea,index) => ({
    idea,
    score:AHP_CRITERIA.reduce((sum,criterion,cIndex) => sum + priorities[cIndex].weights[index]*criterion.weight,0)
  })).sort((a,b) => b.score-a.score);
}

function rankingHtml(ranking){
  return `<ol class="ranking-list">${ranking.map((row,index) => `<li><span>${index+1}. ${escapeHtml(row.idea.ideaName || "ללא שם")}</span><strong>${row.score.toFixed(1)}%</strong></li>`).join("")}</ol>`;
}

function aggregateTeamPriorities(){
  const pairs = ideaPairs();
  return AHP_CRITERIA.map(criterion => {
    const completed = sharedRatings.filter(record => priorityForCriterion(record,criterion));
    if(!completed.length) return null;
    const aggregate = emptyComparisons();
    pairs.forEach(([a,b]) => {
      const ratios = completed.map(record => Number(record.comparisons[criterion.key][pairKey(a,b)]));
      aggregate[criterion.key][pairKey(a,b)] = ratios.reduce((product,value) => product*value,1) ** (1/ratios.length);
    });
    return priorityForCriterion({comparisons:aggregate},criterion);
  });
}

function renderAhpResults(){
  if(activeRating){
    const personal = AHP_CRITERIA.map(c => priorityForCriterion(activeRating,c));
    const ranking = overallRanking(personal);
    $("#personalRanking").innerHTML = ranking ? rankingHtml(ranking) : `<span class="note">הדירוג יוצג לאחר השלמת כל ההשוואות.</span>`;
    $("#consistencyReport").innerHTML = personal.map((result,index) => {
      if(!result) return `<div>${escapeHtml(AHP_CRITERIA[index].short)}: טרם הושלם</div>`;
      const warning = result.consistency > .10;
      return `<div class="${warning?"consistency-warning":""}">${escapeHtml(AHP_CRITERIA[index].short)}: יחס עקביות ${result.consistency.toFixed(2)}${warning?" — מומלץ לבדוק השוואות סותרות":" — תקין"}</div>`;
    }).join("");
  }
  const team = overallRanking(aggregateTeamPriorities());
  $("#teamRanking").innerHTML = team ? rankingHtml(team) : `<span class="note">דירוג הצוות יוצג כאשר יהיה לפחות דירוג משותף מלא בכל קריטריון.</span>`;
  $("#sharedRaters").textContent = sharedRatings.length
    ? `${sharedRatings.length} מדרגים שמרו נתונים: ${sharedRatings.map(r => r.raterName).join(", ")}`
    : "עדיין לא נשמרו דירוגים משותפים.";
}

function renderAhpWorkspace(){
  if(!activeRating) return;
  $("#ahpWorkspace").classList.add("show");
  renderProgress();
  renderAllCriteriaPairCard();
  renderAhpResults();
  const pairs = ideaPairs();
  $("#previousPair").disabled = !pairs.length || activePairIndex===0;
  $("#nextPair").disabled = !pairs.length || activePairIndex===pairs.length-1;
}

function movePair(direction){
  const pairs = ideaPairs();
  if(!pairs.length) return;
  activePairIndex = Math.max(0,Math.min(activePairIndex+direction,pairs.length-1));
  renderAhpWorkspace();
  $("#pairCard").scrollIntoView({behavior:"smooth",block:"start"});
}

$("#previousPair").addEventListener("click", () => movePair(-1));
$("#nextPair").addEventListener("click", () => movePair(1));

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
  activeRating = {
    raterName:name,
    updatedAt:new Date().toISOString(),
    comparisons:sanitizeComparisons(source?.comparisons)
  };
  const pairs = ideaPairs();
  const missing = pairs.findIndex(([a,b]) => AHP_CRITERIA.some(c => !Number(activeRating.comparisons[c.key][pairKey(a,b)])));
  activePairIndex = missing >= 0 ? missing : 0;
  saveActiveRatingLocally();
  setAhpStatus(source ? `הדירוג של ${name} נטען. אפשר להמשיך מהמקום שבו הופסק.` : `נפתח דירוג חדש עבור ${name}.`);
  renderAhpWorkspace();
});

$("#saveSharedRating").addEventListener("click", async () => {
  if(!activeRating) return;
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
