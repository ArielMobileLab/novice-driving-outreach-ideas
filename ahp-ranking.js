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
  if(n === 1) return {weights:[1], matrix:[[1]], geometric:[1], lambdaMax:1, ci:0, ri:0, consistency:0};
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
  return {weights, matrix, geometric, lambdaMax, ci, ri, consistency:ri ? ci/ri : 0};
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

function aggregateTeamRecord(){
  const pairs = ideaPairs();
  const aggregate = emptyComparisons();
  const completedRaters = {};
  AHP_CRITERIA.forEach(criterion => {
    const completed = sharedRatings.filter(record => priorityForCriterion(record,criterion));
    completedRaters[criterion.key] = completed.length;
    if(!completed.length) return;
    pairs.forEach(([a,b]) => {
      const ratios = completed.map(record => Number(record.comparisons[criterion.key][pairKey(a,b)]));
      aggregate[criterion.key][pairKey(a,b)] = ratios.reduce((product,value) => product*value,1) ** (1/ratios.length);
    });
  });
  return {raterName:"דירוג הצוות", comparisons:aggregate, completedRaters};
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
  if(Math.abs(value-1)<.000001) return "1";
  return value >= 1 ? fixed(value,2) : fixed(value,3);
}

function ideaKeyHtml(ideas){
  return `<div class="idea-key">${ideas.map((idea,index) => `<span><b class="idea-code">R${index+1}</b>${escapeHtml(idea.ideaName || "ללא שם")}</span>`).join("")}</div>`;
}

function overallCalculationHtml(priorities){
  if(priorities.some(result => !result)){
    return `<section class="overall-calculation"><h4>חישוב הציון הכולל</h4><div class="calculation-empty">הציון הכולל יוצג לאחר השלמת כל ההשוואות בכל ששת הקריטריונים.</div></section>`;
  }
  const ideas = rankableIdeas();
  const rows = ideas.map((idea,ideaIndex) => {
    const contributions = AHP_CRITERIA.map((criterion,cIndex) => priorities[cIndex].weights[ideaIndex]*criterion.weight);
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
  if(!result){
    content.innerHTML = `<div class="calculation-empty">אין עדיין מספיק השוואות מלאות לחישוב הקריטריון „${escapeHtml(criterion.short)}” עבור ${escapeHtml(scope.label)}.</div>${overallCalculationHtml(priorities)}`;
    return;
  }

  const ideas = rankableIdeas();
  const warning = result.consistency > .10;
  const matrixHead = `<tr><th>רעיון</th>${ideas.map((idea,index) => `<th title="${escapeHtml(idea.ideaName || "ללא שם")}">R${index+1}</th>`).join("")}</tr>`;
  const matrixRows = result.matrix.map((row,rowIndex) => `<tr><td><b class="idea-code">R${rowIndex+1}</b>${escapeHtml(ideas[rowIndex].ideaName || "ללא שם")}</td>${row.map(value => `<td>${matrixValue(value)}</td>`).join("")}</tr>`).join("");
  const weightRows = ideas.map((idea,index) => `<tr><td><b class="idea-code">R${index+1}</b>${escapeHtml(idea.ideaName || "ללא שם")}</td><td>${fixed(result.geometric[index],4)}</td><td><strong>${fixed(result.weights[index]*100,2)}%</strong></td><td>${fixed(result.weights[index]*criterion.weight,2)} נק׳</td></tr>`).join("");
  const teamNote = scope.team ? `<p class="note">מטריצת הצוות נבנתה באמצעות ממוצע גאומטרי של ההשוואות של ${scope.record.completedRaters[criterion.key] || 0} מדרגים שהשלימו קריטריון זה.</p>` : "";
  content.innerHTML = `<section class="criterion-calculation">
    <h4>${escapeHtml(criterion.name)} · משקל רשמי ${criterion.weight}%</h4>
    ${teamNote}
    <div class="calculation-summary">
      <div class="calculation-metric"><span>λmax</span><strong>${fixed(result.lambdaMax,4)}</strong></div>
      <div class="calculation-metric"><span>מדד עקביות CI</span><strong>${fixed(result.ci,4)}</strong></div>
      <div class="calculation-metric"><span>מדד אקראי RI</span><strong>${fixed(result.ri,2)}</strong></div>
      <div class="calculation-metric ${warning?"warning":"good"}"><span>יחס עקביות CR</span><strong>${fixed(result.consistency,3)}</strong></div>
    </div>
    <div class="calculation-status ${warning?"warning":"good"}">${warning?"CR גבוה מ־0.10 — מומלץ לעבור על השוואות סותרות בקריטריון זה.":"CR אינו גבוה מ־0.10 — רמת העקביות תקינה."}</div>
    <div class="calculation-formula">GMᵢ = (Π aᵢⱼ)^(1/n) · wᵢ = GMᵢ / ΣGM · CI = (λmax − n)/(n − 1) · CR = CI / RI</div>
    <h4 style="margin-top:18px">מטריצת ההשוואות ההדדית</h4>
    <p class="note">ערך גדול מ־1 פירושו שרעיון השורה הועדף על רעיון העמודה; הערך ההפוך מופיע בצד השני של האלכסון.</p>
    ${ideaKeyHtml(ideas)}
    <div class="calculation-table-wrap"><table class="calculation-table"><thead>${matrixHead}</thead><tbody>${matrixRows}</tbody></table></div>
    <h4 style="margin-top:18px">המשקלים המקומיים בקריטריון</h4>
    <div class="calculation-table-wrap"><table class="calculation-table"><thead><tr><th>רעיון</th><th>ממוצע גאומטרי</th><th>משקל מקומי</th><th>תרומה לציון הכולל</th></tr></thead><tbody>${weightRows}</tbody></table></div>
  </section>${overallCalculationHtml(priorities)}`;
}

function calculationAuditData(){
  const scope = selectedCalculationScope();
  const priorities = AHP_CRITERIA.map(criterion => priorityForCriterion(scope.record,criterion));
  return {
    generatedAt:new Date().toISOString(),
    scope:scope.label,
    officialWeights:Object.fromEntries(AHP_CRITERIA.map(criterion => [criterion.name,criterion.weight])),
    ideas:rankableIdeas().map((idea,index) => ({code:`R${index+1}`,id:idea.id,name:idea.ideaName})),
    criteria:AHP_CRITERIA.map((criterion,index) => ({
      key:criterion.key,name:criterion.name,officialWeight:criterion.weight,
      ...(priorities[index] ? priorities[index] : {incomplete:true})
    })),
    comparisons:scope.record.comparisons
  };
}

function exportCalculationCsv(){
  const data = calculationAuditData();
  const rows = [["דירוג",data.scope],["נוצר בתאריך",data.generatedAt],[],["קריטריון","משקל רשמי","רעיון","משקל מקומי","תרומה לציון הכולל","lambda max","CI","RI","CR"]];
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
  renderCalculationDetails();
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
