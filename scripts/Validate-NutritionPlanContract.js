// EXECUTABLE DESIGN CONTRACT ONLY. This is not the deployed recommendation engine.
// Synthetic fixtures verify safety invariants and calendar/version semantics,
// never clinical correctness or effectiveness of a diet.
'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');

function parseLocalDate(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('invalid_local_date');
 const n=Date.parse(date+'T00:00:00Z');
 if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==date)throw Error('invalid_local_date');
 return n;
}
function days(start,count){
 if(!Number.isInteger(count)||count<1||count>90)throw Error('invalid_horizon_days');
 const first=parseLocalDate(start);
 return Array.from({length:count},(_,i)=>new Date(first+i*86400000).toISOString().slice(0,10));
}
function materialize(start,count){
 return days(start,count).map(localDate=>({localDate,meals:[{type:'breakfast'},{type:'lunch'},{type:'dinner'}]}));
}
// Replenish a rolling horizon without overwriting any previously stored day.
// New days remain drafts until all safety and approval gates pass.
function extendRollingHorizon(existing,today,horizonDays){
 const current=new Map(existing.map(d=>[d.localDate,d]));
 if(current.size!==existing.length)throw Error('duplicate_existing_day');
 for(const localDate of days(today,horizonDays))
  if(!current.has(localDate))current.set(localDate,{localDate,status:'draft',meals:[]});
 return [...current.values()].sort((a,b)=>a.localDate.localeCompare(b.localDate));
}
function validateDateCoverage(start,count,items){
 const target=days(start,count),found=new Map(),fail=[];
 for(const day of items){
  if(found.has(day.localDate))fail.push('duplicate:'+day.localDate);
  found.set(day.localDate,day);
 }
 for(const date of target){
  const d=found.get(date);
  if(!d)fail.push('missing:'+date);
  else if(!Array.isArray(d.meals)||d.meals.length===0)fail.push('no_meals:'+date);
 }
 for(const key of found.keys())if(!target.includes(key))fail.push('outside_horizon:'+key);
 return fail;
}
// Only an approved effective version with a day for that date is readable.
// Current/past historical rows must never be mutated by the selector.
function selectedDay(versions,localDate){
 parseLocalDate(localDate);
 const eligible=versions.filter(v=>v.approvalState==='approved'&&
   v.effectiveFromLocalDate<=localDate).sort((a,b)=>
     b.effectiveFromLocalDate.localeCompare(a.effectiveFromLocalDate)||
     b.versionNumber-a.versionNumber);
 if(!eligible.length)return {kind:'unavailable',reason:'no_approved_version'};
 const latest=eligible[0];
 const matches=latest.days.filter(d=>d.localDate===localDate);
 if(matches.length!==1)return {kind:'unavailable',reason:'coverage_gap_or_duplicate'};
 if(matches[0].safetyStatus!=='passed')return {kind:'held',reason:'safety_not_approved'};
 return {kind:'available',version:latest.versionNumber,day:matches[0]};
}
const goodMeal=()=>({
 type:'lunch',recipeVerified:true,dataSourceVerified:true,completeIngredients:true,
 nutrientCoverage:'complete',allergenCodes:['soy'],crossContactCodes:[],
 status:'planned',portion:1,portionUnit:'serving'
});
const baseProfile=()=>({
 canProcessHealthData:true,knownAllergens:['peanut'],reviewRequired:false,
 clinicalApproval:false
});
// "unknown" allergen and cross-contact information blocks publishing.
// Food preferences are never allowed to override hard contraindications.
function safetyGate(profile,day){
 const reasons=[];
 if(!profile.canProcessHealthData)reasons.push('consent_missing');
 if(profile.reviewRequired&&!profile.clinicalApproval)reasons.push('clinician_review_required');
 if(!day||!Array.isArray(day.meals)||!day.meals.length)reasons.push('no_meals');
 for(const meal of (day?.meals||[])){
  if(!meal.recipeVerified||!meal.dataSourceVerified)reasons.push('food_source_unverified');
  if(!meal.completeIngredients)reasons.push('ingredients_unknown');
  if(meal.nutrientCoverage!=='complete')reasons.push('nutrient_data_incomplete');
  if(!meal.portion||meal.portion<=0||!meal.portionUnit)reasons.push('invalid_portion');
  if(!Array.isArray(meal.allergenCodes)||!Array.isArray(meal.crossContactCodes))
     reasons.push('allergen_data_unknown');
  else for(const allergen of (profile.knownAllergens||[]))
    if(meal.allergenCodes.includes(allergen)||meal.crossContactCodes.includes(allergen))
      reasons.push('allergen_or_cross_contact:'+allergen);
 }
 return {allowed:reasons.length===0,reasons:[...new Set(reasons)]};
}
function canScheduleCheckin({consent,subscribed=true,snoozed=false,localTime,quietStart,quietEnd,deliveryKey,previousKeys=[]}){
 if(!consent||!subscribed||snoozed)return 'disabled';
 if(previousKeys.includes(deliveryKey))return 'deduplicated';
 const minutes=x=>{const [h,m]=x.split(':').map(Number);return h*60+m;};
 const now=minutes(localTime),begin=minutes(quietStart),end=minutes(quietEnd);
 const quiet=begin<=end?(now>=begin&&now<end):(now>=begin||now<end);
 return quiet?'quiet_hours':'deliver';
}
function classifyCheckin(answers){
 if(answers===null||answers.length===0)return 'missing_not_healthy';
 if(answers.some(x=>x.redFlag))return 'urgent_review_not_auto_replan';
 if(answers.some(x=>x.value==null))return 'partial_unknown';
 return 'self_reported_not_diagnosis';
}
// Positive + negative contract tests: pass is based on deliberately specified
// invariants, not a simulated clinical approval of any real patient or food.
test('7, 14, 30 local calendar dates are contiguous and nonempty',()=>{
 for(const n of [7,14,30]){
  const plan=materialize('2026-11-29',n);
  assert.equal(plan.length,n);
  assert.deepEqual(validateDateCoverage('2026-11-29',n,plan),[]);
 }
});
test('rolling horizon renews across New Year without losing yesterday',()=>{
 const old=[{localDate:'2026-12-29',status:'published',meals:[{type:'lunch'}]}];
 const renewed=extendRollingHorizon(old,'2026-12-30',7);
 assert.equal(renewed.length,8);
 assert.equal(renewed[0],old[0]);
 assert.deepEqual(validateDateCoverage('2026-12-30',7,renewed.slice(1).map(d=>({...d,meals:[{type:'draft'}]}))),[]);
 assert.equal(renewed.at(-1).localDate,'2027-01-05');
 assert.ok(renewed.slice(1).every(x=>x.status==='draft'));
});
test('rolling horizon retries are idempotent',()=>{
 const once=extendRollingHorizon([],'2027-06-01',14);
 const again=extendRollingHorizon(once,'2027-06-01',14);
 assert.equal(once.length,14);
 assert.deepEqual(again,once);
});
test('leap day is included exactly once',()=>{
 const a=days('2028-02-27',5);
 assert.deepEqual(a,['2028-02-27','2028-02-28','2028-02-29','2028-03-01','2028-03-02']);
});
test('local calendar dates stay contiguous even across DST calendar transition',()=>{
 const a=days('2027-03-12',5);
 assert.deepEqual(a,['2027-03-12','2027-03-13','2027-03-14','2027-03-15','2027-03-16']);
});
test('missing or duplicate calendar days are rejected',()=>{
 const a=materialize('2027-01-01',7);a.splice(1,1);a.push(a[2]);
 const errors=validateDateCoverage('2027-01-01',7,a);
 assert.ok(errors.some(s=>s.startsWith('missing:')));
 assert.ok(errors.some(s=>s.startsWith('duplicate:')));
});
test('no empty meal day may be published',()=>{
 const a=materialize('2027-01-01',7);a[4].meals=[];
 assert.ok(validateDateCoverage('2027-01-01',7,a).includes('no_meals:2027-01-05'));
});
test('invalid calendar dates / invalid horizon are rejected',()=>{
 assert.throws(()=>days('2027-02-29',7),/invalid_local_date/);
 assert.throws(()=>days('2027-01-01',0),/invalid_horizon_days/);
 assert.throws(()=>days('2027-01-01',91),/invalid_horizon_days/);
});
test('version effective tomorrow cannot replace yesterday',()=>{
 const version1={versionNumber:1,effectiveFromLocalDate:'2027-01-01',approvalState:'approved',
  days:[{localDate:'2027-01-01',safetyStatus:'passed'}]};
 const version2={versionNumber:2,effectiveFromLocalDate:'2027-01-02',approvalState:'approved',
  days:[{localDate:'2027-01-02',safetyStatus:'passed'}]};
 const before=JSON.stringify([version1,version2]);
 assert.equal(selectedDay([version1,version2],'2027-01-01').version,1);
 assert.equal(selectedDay([version1,version2],'2027-01-02').version,2);
 assert.equal(JSON.stringify([version1,version2]),before);
});
test('unapproved new version is excluded and missing day blocks publication',()=>{
 const v={versionNumber:1,effectiveFromLocalDate:'2027-01-01',approvalState:'draft',
  days:[{localDate:'2027-01-01',safetyStatus:'passed'}]};
 assert.equal(selectedDay([v],'2027-01-01').kind,'unavailable');
 const approved={...v,approvalState:'approved'};
 assert.equal(selectedDay([approved],'2027-01-02').reason,'coverage_gap_or_duplicate');
});
test('one version cannot select two copies of same day',()=>{
 const v={versionNumber:1,effectiveFromLocalDate:'2027-01-01',approvalState:'approved',
  days:[{localDate:'2027-01-01',safetyStatus:'passed'},{localDate:'2027-01-01',safetyStatus:'passed'}]};
 assert.equal(selectedDay([v],'2027-01-01').kind,'unavailable');
});
test('passed known ingredients and no matched allergen may clear design gate',()=>{
 assert.deepEqual(safetyGate(baseProfile(),{meals:[goodMeal()]}),{allowed:true,reasons:[]});
});
test('confirmed allergen cannot be bypassed by food preferences',()=>{
 const m=goodMeal();m.allergenCodes.push('peanut');
 const r=safetyGate({...baseProfile(),likes:['peanut']},{meals:[m]});
 assert.equal(r.allowed,false);
 assert.ok(r.reasons.includes('allergen_or_cross_contact:peanut'));
});
test('cross-contact and unknown ingredients block release',()=>{
 const m=goodMeal();m.crossContactCodes.push('peanut');m.completeIngredients=false;
 const r=safetyGate(baseProfile(),{meals:[m]});
 assert.equal(r.allowed,false);
 assert.ok(r.reasons.includes('ingredients_unknown'));
 assert.ok(r.reasons.includes('allergen_or_cross_contact:peanut'));
});
test('unverified source or missing allergen listing blocks release',()=>{
 const m=goodMeal();m.dataSourceVerified=false;m.allergenCodes=null;
 const r=safetyGate(baseProfile(),{meals:[m]});
 assert.equal(r.allowed,false);
 assert.ok(r.reasons.includes('food_source_unverified'));
 assert.ok(r.reasons.includes('allergen_data_unknown'));
});
test('missing nutrient coverage or invalid portion blocks release',()=>{
 const m=goodMeal();m.nutrientCoverage='partial';m.portion=0;
 const r=safetyGate(baseProfile(),{meals:[m]});
 assert.equal(r.allowed,false);
 assert.ok(r.reasons.includes('nutrient_data_incomplete'));
 assert.ok(r.reasons.includes('invalid_portion'));
});
test('high risk requires human review and missing consent blocks planning',()=>{
 const p={...baseProfile(),reviewRequired:true,canProcessHealthData:false};
 const r=safetyGate(p,{meals:[goodMeal()]});
 assert.equal(r.allowed,false);
 assert.ok(r.reasons.includes('clinician_review_required'));
 assert.ok(r.reasons.includes('consent_missing'));
});
test('over-midnight quiet hours, opt-out and idempotency suppress reminders',()=>{
 const a={consent:true,localTime:'23:20',quietStart:'22:00',quietEnd:'07:00',
  deliveryKey:'p:2027-01-01:evening'};
 assert.equal(canScheduleCheckin(a),'quiet_hours');
 assert.equal(canScheduleCheckin({...a,localTime:'08:00'}),'deliver');
 assert.equal(canScheduleCheckin({...a,consent:false,localTime:'08:00'}),'disabled');
 assert.equal(canScheduleCheckin({...a,previousKeys:[a.deliveryKey],localTime:'08:00'}),'deduplicated');
 assert.equal(canScheduleCheckin({...a,snoozed:true,localTime:'08:00'}),'disabled');
});
test('missing health answers are never silently marked healthy',()=>{
 assert.equal(classifyCheckin([]),'missing_not_healthy');
 assert.equal(classifyCheckin([{value:null}]),'partial_unknown');
 assert.equal(classifyCheckin([{value:2}]),'self_reported_not_diagnosis');
});
test('red-flag symptom requires review, not unattended recalculation',()=>{
 assert.equal(classifyCheckin([{value:4,redFlag:true}]),'urgent_review_not_auto_replan');
});
