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
let activeCriterionIndex = 0;
let activePairIndex = 0;

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

function renderCriterionTabs(){
  const totalPairs = ideaPairs().length;
  $("#criterionTabs").innerHTML = AHP_CRITERIA.map((criterion,index) => {
    const complete = totalPairs > 0 && completedForCriterion(activeRating,criterion) === totalPairs;
    return `<button class="criterion-tab ${index===activeCriterionIndex?"active":""} ${complete?"complete":""}" type="button" data-criterion-index="${index}">${escapeHtml(criterion.short)} · ${criterion.weight}%</button>`;
  }).join("");
  $$('[data-criterion-index]').forEach(button => button.addEventListener("click", () => {
    activeCriterionIndex = Number(button.dataset.criterionIndex);
    const criterion = AHP_CRITERIA[activeCriterionIndex];
    const pairs = ideaPairs();
    const missing = pairs.findIndex(([a,b]) => !Number(activeRating.comparisons[criterion.key][pairKey(a,b)]));
    activePairIndex = missing >= 0 ? missing : 0;
    renderAhpWorkspace();
  }));
}

function comparisonOptions(a,b,current){
  const options = [
    [9,"קיצוני",`${a.ideaName} עדיף באופן קיצוני`],
    [7,"מאוד",`${a.ideaName} עדיף מאוד`],
    [5,"בבירור",`${a.ideaName} עדיף בבירור`],
    [3,"מעט",`${a.ideaName} עדיף מעט`],
    [1,"שווים","שני הרעיונות שווים בקריטריון זה"],
    [1/3,"מעט",`${b.ideaName} עדיף מעט`],
    [1/5,"בבירור",`${b.ideaName} עדיף בבירור`],
    [1/7,"מאוד",`${b.ideaName} עדיף מאוד`],
    [1/9,"קיצוני",`${b.ideaName} עדיף באופן קיצוני`]
  ];
  return options.map(([ratio,label,aria],index) => `<div class="comparison-option">
    <input type="radio" id="ahpChoice${index}" name="ahpChoice" value="${ratio}" ${Math.abs(Number(current)-ratio)<0.00001?"checked":""}>
    <label for="ahpChoice${index}" title="${escapeHtml(aria)}" aria-label="${escapeHtml(aria)}">${escapeHtml(label)}</label>
  </div>`).join("");
}

function renderPairCard(){
  const pairs = ideaPairs();
  if(!pairs.length){
    $("#pairCard").innerHTML = `<div class="empty">נדרשים לפחות שני רעיונות כדי לבצע השוואה זוגית.</div>`;
    return;
  }
  activePairIndex = Math.max(0,Math.min(activePairIndex,pairs.length-1));
  const [a,b] = pairs[activePairIndex];
  const criterion = AHP_CRITERIA[activeCriterionIndex];
  const current = activeRating.comparisons[criterion.key][pairKey(a,b)];
  const excerpt = item => {
    const text = String(item.publicAction || item.researchFinding || "");
    return text.length > 220 ? text.slice(0,220) + "…" : text;
  };
  $("#pairCard").innerHTML = `
    <div class="meta">${escapeHtml(criterion.name)} · השוואה ${activePairIndex+1} מתוך ${pairs.length}</div>
    <h3 class="pair-question">איזה רעיון עדיף לפי הקריטריון הזה?</h3>
    <div class="pair-ideas">
      <article class="pair-idea"><h4>רעיון א׳: ${escapeHtml(a.ideaName || "ללא שם")}</h4><p>${escapeHtml(excerpt(a))}</p></article>
      <div class="pair-versus">מול</div>
      <article class="pair-idea"><h4>רעיון ב׳: ${escapeHtml(b.ideaName || "ללא שם")}</h4><p>${escapeHtml(excerpt(b))}</p></article>
    </div>
    <div class="comparison-scale">${comparisonOptions(a,b,current)}</div>
    <div class="scale-legend"><span>רעיון א׳ עדיף</span><span>שוויון</span><span>רעיון ב׳ עדיף</span></div>`;
  $$('input[name="ahpChoice"]').forEach(input => input.addEventListener("change", event => {
    activeRating.comparisons[criterion.key][pairKey(a,b)] = Number(event.target.value);
    saveActiveRatingLocally();
    renderProgress();
    renderCriterionTabs();
    renderAhpResults();
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
  renderCriterionTabs();
  renderPairCard();
  renderAhpResults();
  const pairs = ideaPairs();
  $("#previousPair").disabled = !pairs.length || (activeCriterionIndex===0 && activePairIndex===0);
  $("#nextPair").disabled = !pairs.length || (activeCriterionIndex===AHP_CRITERIA.length-1 && activePairIndex===pairs.length-1);
}

function movePair(direction){
  const pairs = ideaPairs();
  if(!pairs.length) return;
  activePairIndex += direction;
  if(activePairIndex >= pairs.length && activeCriterionIndex < AHP_CRITERIA.length-1){
    activeCriterionIndex++;
    activePairIndex=0;
  }
  if(activePairIndex < 0 && activeCriterionIndex > 0){
    activeCriterionIndex--;
    activePairIndex=pairs.length-1;
  }
  renderAhpWorkspace();
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
  activeCriterionIndex = 0;
  const pairs = ideaPairs();
  const missing = pairs.findIndex(([a,b]) => !Number(activeRating.comparisons[AHP_CRITERIA[0].key][pairKey(a,b)]));
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
