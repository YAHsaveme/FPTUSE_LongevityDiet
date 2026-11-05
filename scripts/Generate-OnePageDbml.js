/* One-page DBML model generator, with verified current EF Core model mapping and separately labeled TARGET logical design.
   No cross-database FK: schema namespaces below represent separate logical SQL Server databases for visualization ONLY.
*/
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'docs','assignment','one-page');
fs.mkdirSync(dest,{recursive:true});
let sections=[],refs=[],count={};
function tbl(schema,name,cols,ix=[],note=''){
 const lines=cols.split('|').map(x=>'  '+x.trim());
 let str='Table '+schema+'.'+name+' {\n'+lines.join('\n')+'\n';
 if(ix.length)str+='  indexes {\n'+ix.map(x=>'    '+x).join('\n')+'\n  }\n';
 if(note)str+="  Note: '"+note.replaceAll("'","")+"'"+'\n';
 str+='}\n';sections.push(str);
 count[schema]=(count[schema]||0)+1;
}
function ref(schema,child,field,parent,parentKey='Id',kind='>'){
 refs.push('Ref: '+schema+'.'+child+'.'+field+' '+kind+' '+schema+'.'+parent+'.'+parentKey);
}
const id='Id uniqueidentifier [pk]';
const uid='UserId uniqueidentifier [note: \'Cross-service identity reference; NOT a database FK\']';
const dt='CreatedAtUtc datetime2', now='UpdatedAtUtc datetime2';
const S=['Identity','Catalog','Planning','Tracking','Recommendation','Worker'];
const p=s=>'target_'+s.toLowerCase();
tbl(p('Identity'),'Users',[id,'Email nvarchar(320)','NormalizedEmail nvarchar(320) [unique]','PasswordHash nvarchar(512)','DisplayName nvarchar(120)','Role nvarchar(24)','Status nvarchar(24)','CreatedAt datetimeoffset','UpdatedAt datetimeoffset'].join('|'));
tbl(p('Identity'),'UserProfiles',['UserId uniqueidentifier [pk]','BirthYear int','TimeZone nvarchar(100)','WakeTime time','SleepTime time','PreferredMealFrequency int','FoodPreference nvarchar(500)','ProfileCompleted bit','UpdatedAt datetimeoffset'].join('|'));
tbl(p('Identity'),'RefreshTokens',[id,'UserId uniqueidentifier','TokenHash nvarchar(64) [unique]','ExpiresAt datetimeoffset','RevokedAt datetimeoffset','ReplacedByTokenId uniqueidentifier','CreatedAt datetimeoffset'].join('|'));
tbl(p('Identity'),'Allergies',[id,'Code nvarchar(64) [unique]','Name nvarchar(200)','Severity nvarchar(24)'].join('|'));
tbl(p('Identity'),'UserAllergies',['UserId uniqueidentifier','AllergyId uniqueidentifier','RecordedAtUtc datetime2'].join('|'),['(UserId,AllergyId) [pk]']);
tbl(p('Identity'),'UserExcludedFoods',[id,'UserId uniqueidentifier','FoodId uniqueidentifier [note: \'Catalog ID external, no FK\']','FreeText nvarchar(300)'].join('|'),[],'Constraint: FoodId or FreeText must be provided');
tbl(p('Identity'),'Reminders',[id,'UserId uniqueidentifier','Category nvarchar(40)','Enabled bit','PreferredTime time','QuietStart time','QuietEnd time','UpdatedAtUtc datetime2'].join('|'));
ref(p('Identity'),'UserProfiles','UserId','Users','Id','-');
ref(p('Identity'),'RefreshTokens','UserId','Users');
ref(p('Identity'),'UserAllergies','UserId','Users');
ref(p('Identity'),'UserAllergies','AllergyId','Allergies');
ref(p('Identity'),'UserExcludedFoods','UserId','Users');
ref(p('Identity'),'Reminders','UserId','Users');

tbl(p('Catalog'),'Foods',[id,'Name nvarchar(200)','NormalizedName nvarchar(200)','Category nvarchar(80)','Calories decimal(10,2)','ProteinG decimal(9,2)','CarbohydrateG decimal(9,2)','FatG decimal(9,2)','IsPlantBased bit','IsWholeGrain bit','IsLegume bit','IsFish bit','IsActive bit'].join('|'));
tbl(p('Catalog'),'Recipes',[id,'Name nvarchar(200)','MealType nvarchar(40)','Description nvarchar(1000)','PrepMinutes int','IsPlantForward bit','IsActive bit'].join('|'));
tbl(p('Catalog'),'RecipeIngredients',['RecipeId uniqueidentifier','FoodId uniqueidentifier','Amount decimal(10,2)','Unit nvarchar(40)','IsOptional bit'].join('|'),['(RecipeId,FoodId) [pk]']);
tbl(p('Catalog'),'RecipeAllergens',['RecipeId uniqueidentifier','AllergenCode nvarchar(64)','Evidence nvarchar(200)'].join('|'),['(RecipeId,AllergenCode) [pk]']);
tbl(p('Catalog'),'DietRules',[id,'Code nvarchar(80) [unique]','Name nvarchar(200)','Category nvarchar(80)','IsMedicalSensitive bit','IsActive bit'].join('|'));
tbl(p('Catalog'),'RuleVersions',[id,'DietRuleId uniqueidentifier','VersionNumber int','ParametersJson nvarchar(max)','SourceUrl nvarchar(1000)','EvidenceLevel nvarchar(40)','PublishedAtUtc datetime2','IsCurrent bit'].join('|'),['(DietRuleId,VersionNumber) [unique]']);
tbl(p('Catalog'),'RuleSetVersions',[id,'SetName nvarchar(160)','Version int','PublishedAtUtc datetime2','IsCurrent bit'].join('|'));
tbl(p('Catalog'),'RuleSetVersionItems',['RuleSetVersionId uniqueidentifier','RuleVersionId uniqueidentifier','Position int'].join('|'),['(RuleSetVersionId,RuleVersionId) [pk]']);
ref(p('Catalog'),'RecipeIngredients','RecipeId','Recipes');ref(p('Catalog'),'RecipeIngredients','FoodId','Foods');
ref(p('Catalog'),'RecipeAllergens','RecipeId','Recipes');ref(p('Catalog'),'RuleVersions','DietRuleId','DietRules');
ref(p('Catalog'),'RuleSetVersionItems','RuleSetVersionId','RuleSetVersions');ref(p('Catalog'),'RuleSetVersionItems','RuleVersionId','RuleVersions');

tbl(p('Planning'),'MealPlans',[id,uid,'StartDate date','EndDate date','Revision int','Status nvarchar(40)','GeneratedAtUtc datetime2'].join('|'));
tbl(p('Planning'),'MealPlanDays',[id,'MealPlanId uniqueidentifier','Date date'].join('|'),['(MealPlanId,Date) [unique]']);
tbl(p('Planning'),'PlannedMeals',[id,'MealPlanDayId uniqueidentifier','RecipeId uniqueidentifier [note: \'Catalog reference, no cross-DB FK\']','MealType nvarchar(40)','ScheduledTime time','Position int','ReasonJson nvarchar(max)'].join('|'));
tbl(p('Planning'),'Challenges',[id,uid,'Title nvarchar(200)','StartDate date','EndDate date','Status nvarchar(40)'].join('|'));
tbl(p('Planning'),'ChallengeDays',[id,'ChallengeId uniqueidentifier','Date date','Completed bit'].join('|'));
tbl(p('Planning'),'FmdSafetyAssessments',[id,uid,'AssessedAtUtc datetime2','RiskCode nvarchar(64)','IsEligible bit','ConsentConfirmed bit'].join('|'));
tbl(p('Planning'),'FmdCycles',[id,uid,'SafetyAssessmentId uniqueidentifier','StartDate date','EndDate date','Status nvarchar(40)'].join('|'));
ref(p('Planning'),'MealPlanDays','MealPlanId','MealPlans');
ref(p('Planning'),'PlannedMeals','MealPlanDayId','MealPlanDays');
ref(p('Planning'),'ChallengeDays','ChallengeId','Challenges');
ref(p('Planning'),'FmdCycles','SafetyAssessmentId','FmdSafetyAssessments');

tbl(p('Tracking'),'MealLogs',[id,uid,'ConsumedAtUtc datetime2','MealType nvarchar(40)','Note nvarchar(1000)','IsDeleted bit'].join('|'));
tbl(p('Tracking'),'MealLogItems',[id,'MealLogId uniqueidentifier','FoodId uniqueidentifier [note: \'Catalog stable ID, no FK\']','RecipeId uniqueidentifier [note: \'Catalog stable ID, no FK\']','Quantity decimal(9,3)','Unit nvarchar(40)'].join('|'),[],'FoodId XOR RecipeId business constraint');
tbl(p('Tracking'),'ActivityLogs',[id,uid,'ActivityType nvarchar(40)','StartedAtUtc datetime2','DurationMinutes int','Intensity nvarchar(40)','IsDeleted bit'].join('|'));
tbl(p('Tracking'),'EatingWindowSnapshots',[id,uid,'LocalDate date','WindowStart time','WindowEnd time','DurationHours decimal(5,2)'].join('|'));
tbl(p('Tracking'),'AdherenceScores',[id,uid,'LocalDate date','Version nvarchar(40)','Score decimal(5,2) [note: \'nullable when coverage incomplete\']','CoveragePercent decimal(5,2)','IsPartial bit','CalculatedAtUtc datetime2'].join('|'));
tbl(p('Tracking'),'ScoreDimensions',[id,'AdherenceScoreId uniqueidentifier','Code nvarchar(40)','Weight decimal(5,4)','RawScore decimal(5,2)','WeightedScore decimal(5,2)','ReasonCode nvarchar(100)'].join('|'));
tbl(p('Tracking'),'WeeklyReports',[id,uid,'WeekStart date','WeekEnd date','SummaryJson nvarchar(max)','GeneratedAtUtc datetime2'].join('|'));
ref(p('Tracking'),'MealLogItems','MealLogId','MealLogs');
ref(p('Tracking'),'ScoreDimensions','AdherenceScoreId','AdherenceScores');

tbl(p('Recommendation'),'RecommendationFeedback',[id,uid,'RequestId uniqueidentifier','ItemId uniqueidentifier','Rating int','ReasonCode nvarchar(80)','CreatedAtUtc datetime2'].join('|'),[],'Proposed service-owned feedback storage; ranker not deployed');

tbl(p('Worker'),'ProcessedEvents',['EventId uniqueidentifier','ConsumerName nvarchar(120)','ProcessedAtUtc datetime2'].join('|'),['(EventId,ConsumerName) [pk]']);
tbl(p('Worker'),'OutboxMessages',[id,'EventType nvarchar(120)','PayloadJson nvarchar(max)','CreatedAtUtc datetime2','PublishedAtUtc datetime2','PublishAttempts int'].join('|'));
tbl(p('Worker'),'AuditLogs',[id,uid,'Action nvarchar(120)','OccurredAtUtc datetime2','CorrelationId nvarchar(120)','Result nvarchar(50)'].join('|'),[],'Logical operational example; domain audits live with owners');
// Compose target DBML. Schema prefixes are visual namespaces, NOT cross-database T-SQL schemas.
let header="// LongevityDiet  |  TARGET logical database map  |  2026-11-05\n"+
"// DBML source of truth for the ONE-PAGE conceptual/physical target ERD.\n"+
"// Six namespaces below represent SIX SEPARATE LOGICAL SQL SERVER DATABASES for visualization.\n"+
"// No cross-database SQL FK. UserId / RecipeId references across ownership boundaries are scalar IDs only.\n"+
"// Proposed schema, NOT an EF Core migration. Compare to CURRENT .dbml before implementation.\n"+
"Project LongevityDiet_Target {\n  database_type: 'SQLServer'\n  Note: 'Target logical model - six service-owned SQL databases. Not yet deployed. No cross DB foreign keys.'\n}\n\n";
const dbml=header+sections.join('\n')+'\n'+refs.join('\n')+'\n';
fs.writeFileSync(path.join(dest,'06-database-target.dbml'),dbml,'utf8');
console.log('TARGET DBML:',Object.entries(count).map(x=>x.join(':')).join('  '),'refs=',refs.length);

// Current DBML extracted from live EF Core entity classes, not stale architecture prose.
const mappings=[
 ['current_identity','Users','User','src/LongevityDiet.Domain/Entities/User.cs','Id'],
 ['current_identity','UserProfiles','UserProfile','src/LongevityDiet.Domain/Entities/UserProfile.cs','UserId'],
 ['current_identity','RefreshTokens','RefreshToken','src/LongevityDiet.Domain/Entities/RefreshToken.cs','Id'],
 ['current_identity','ReminderPreferences','ReminderPreference','src/LongevityDiet.Domain/Entities/ReminderNotifications.cs','UserId'],
 ['current_identity','UserNotifications','UserNotification','src/LongevityDiet.Domain/Entities/ReminderNotifications.cs','Id'],
 ['current_identity','IdentityOutbox','IdentityOutboxEvent','src/LongevityDiet.Domain/Entities/ReminderNotifications.cs','Id'],
 ['current_identity','IdentityInbox','IdentityInboxEvent','src/LongevityDiet.Domain/Entities/ReminderNotifications.cs','EventId'],
 ['current_tracking','ActivityLogs','ActivityLog','src/LongevityDiet.Tracking/TrackingModels.cs','Id'],
 ['current_tracking','ActivityGoals','ActivityGoal','src/LongevityDiet.Tracking/TrackingModels.cs','UserId'],
 ['current_tracking','ScoreConfigurationVersions','ScoreConfigurationVersion','src/LongevityDiet.Tracking/TrackingModels.cs','Version'],
 ['current_tracking','AdherenceScores','AdherenceScore','src/LongevityDiet.Tracking/TrackingModels.cs','Id'],
 ['current_tracking','ScoreDimensions','ScoreDimension','src/LongevityDiet.Tracking/TrackingModels.cs','Id'],
 ['current_tracking','TrackingScoreSignals','TrackingScoreSignal','src/LongevityDiet.Tracking/TrackingModels.cs','Id'],
 ['current_tracking','TrackingOutbox','TrackingOutboxEvent','src/LongevityDiet.Tracking/TrackingOutboxEvent.cs','EventId'],
 ['current_worker','ReminderSchedules','ReminderSchedule','src/LongevityDiet.Worker/Reminders/ReminderWorkerDbContext.cs','Id'],
 ['current_worker','ReminderDispatchRecords','ReminderDispatchRecord','src/LongevityDiet.Worker/Reminders/ReminderWorkerDbContext.cs','Id'],
 ['current_worker','WorkerProcessedEvents','WorkerProcessedEvent','src/LongevityDiet.Worker/Reminders/ReminderWorkerDbContext.cs','EventId'],
 ['current_worker','WorkerOutbox','WorkerOutboxEvent','src/LongevityDiet.Worker/Reminders/ReminderWorkerDbContext.cs','EventId']
];
function bodyForClass(source,n){
 const z=source.search(new RegExp('public\\s+(?:sealed\\s+)?class\\s+'+n+'\\b'));
 if(z<0)throw Error('Missing model '+n);
 let open=source.indexOf('{',z),depth=1,i=open+1;
 while(depth>0&&i<source.length){if(source[i]==='{')depth++;if(source[i]==='}')depth--;i++;}
 return source.slice(open+1,i-1);
}
const types={Guid:'uniqueidentifier',string:'nvarchar(max)',int:'int',bool:'bit',decimal:'decimal(18,2)',DateTime:'datetime2',DateTimeOffset:'datetimeoffset',TimeOnly:'time',DateOnly:'date',long:'bigint',double:'float'};
const enumTypes=new Set(['UserRole','AccountStatus','ActivityKind','ReminderCategory']);
const overrides={
  Users:{Email:'nvarchar(320)',NormalizedEmail:'nvarchar(320)',PasswordHash:'nvarchar(512)',DisplayName:'nvarchar(120)',Role:'nvarchar(24)',Status:'nvarchar(24)'},
  UserProfiles:{TimeZone:'nvarchar(100)',FoodPreference:'nvarchar(500)'},
  RefreshTokens:{TokenHash:'nvarchar(64)'},
  UserNotifications:{Category:'nvarchar(32)',Title:'nvarchar(120)',Body:'nvarchar(500)',DeepLink:'nvarchar(120)',DeduplicationKey:'nvarchar(160)'},
  IdentityOutbox:{EventType:'nvarchar(96)',PayloadJson:'nvarchar(4096)'},
  ActivityLogs:{Kind:'nvarchar(24)',Note:'nvarchar(800)'},
  ScoreConfigurationVersions:{Version:'nvarchar(40)',ActivityWeight:'decimal(5,4)',MealWeight:'decimal(5,4)',EatingWindowWeight:'decimal(5,4)',SourceReference:'nvarchar(512)'},
  AdherenceScores:{Version:'nvarchar(40)',Score:'decimal(5,2)',CoveragePercent:'decimal(5,2)',MissingDataJson:'nvarchar(512)'},
  ScoreDimensions:{Code:'nvarchar(32)',Weight:'decimal(5,4)',RawScore:'decimal(5,2)',WeightedScore:'decimal(5,2)',ReasonCode:'nvarchar(128)'},
  TrackingScoreSignals:{DimensionCode:'nvarchar(32)',Percent:'decimal(5,2)',SourceVersion:'nvarchar(64)'},
  TrackingOutbox:{EventType:'nvarchar(100)',PayloadJson:'nvarchar(4096)'},
  ReminderSchedules:{Category:'nvarchar(32)',TimeZone:'nvarchar(100)'},
  ReminderDispatchRecords:{Category:'nvarchar(32)',DeduplicationKey:'nvarchar(160)'},
  WorkerOutbox:{EventType:'nvarchar(100)',PayloadJson:'nvarchar(4096)'}
};
const uniqueFields={Users:new Set(['NormalizedEmail']),RefreshTokens:new Set(['TokenHash']),TrackingScoreSignals:new Set(['SourceEventId']),ReminderDispatchRecords:new Set(['DeduplicationKey'])};
const compositeUnique={UserNotifications:['UserId,DeduplicationKey'],AdherenceScores:['UserId,LocalDate,Version'],ScoreDimensions:['AdherenceScoreId,Code'],TrackingScoreSignals:['UserId,LocalDate,DimensionCode'],ReminderSchedules:['UserId,Category']};
function parseCurrent(){
 let current="Project LongevityDiet_Current {\n  database_type: 'SQLServer'\n  Note: 'Current implemented EF Core entity sets. Three distinct DbContexts and logical SQL DBs; not the six-service target.'\n}\n\n";
 for(const [schema,table,cl,file,pk] of mappings){
  const body=bodyForClass(fs.readFileSync(path.join(root,file),'utf8'),cl),fields=[];
  const rx=/public\s+([A-Za-z_][A-Za-z0-9_<>?, ]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*{\s*get;\s*set;\s*}/g;
  for(const m of body.matchAll(rx)){
   const type=m[1].trim().replace('?',''); if(type.includes('<')||!(type in types||enumTypes.has(type)))continue;
   const dbtype=overrides[table]?.[m[2]]||types[type]||'nvarchar(64)';
   const flags=[m[2]===pk?'pk':null,uniqueFields[table]?.has(m[2])?'unique':null].filter(Boolean);
   fields.push('  '+m[2]+' '+dbtype+(flags.length?' ['+flags.join(', ')+']':''));
  }
  if(fields.length<2)throw Error('Entity underparsed '+cl+': '+fields.length);
  const indexes=(compositeUnique[table]||[]).map(v=>'    ('+v+') [unique]');
  current+='Table '+schema+'.'+table+' {\n'+fields.join('\n')+(indexes.length?'\n  indexes {\n'+indexes.join('\n')+'\n  }':'')+'\n}\n\n';
 }
 current+='// Only enforce intra-database FKs actually configured / owned.\n';
 const localRefs=[
  'Ref: current_identity.UserProfiles.UserId - current_identity.Users.Id',
  'Ref: current_identity.RefreshTokens.UserId > current_identity.Users.Id',
  'Ref: current_identity.ReminderPreferences.UserId - current_identity.Users.Id',
  'Ref: current_identity.UserNotifications.UserId > current_identity.Users.Id',
  'Ref: current_tracking.ScoreDimensions.AdherenceScoreId > current_tracking.AdherenceScores.Id'
 ];
 current+=localRefs.join('\n')+'\n';
 fs.writeFileSync(path.join(dest,'06-database-current.dbml'),current,'utf8');
 console.log('CURRENT DBML:',mappings.length,'entities; refs=',localRefs.length);
}
parseCurrent();
