'use strict';

// Compliance verifier for the *actual three-page PRN232 Final Assignment PDF*.
// It inspects current repository source/deliverables only. A passing source
// check does not certify a live runtime or instructor presentation.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const normal = p => path.join(root, ...p.split('/'));
const has = p => fs.existsSync(normal(p));
const read = p => {
  const file = normal(p);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8');
};
const checks = [];
function verify(id, description, predicate, evidence) {
  const passed = Boolean(predicate());
  checks.push({id, description, passed, evidence});
  console.log((passed ? 'PASS ' : 'FAIL ') + id + ' - ' + description);
}
function textHas(p, expr) { return expr.test(read(p)); }
function includesAll(p, parts) { return parts.every(v => read(p).includes(v)); }
function countMigrations(folder) {
  const dir = normal(folder);
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter(x => /^20\d{12}_.+\.cs$/.test(x) && !x.includes('Designer')).length;
}
const api = 'src/LongevityDiet.API';
const repo = 'src/LongevityDiet.Repositories';
const services = 'src/LongevityDiet.Services';
const worker = 'src/LongevityDiet.Worker';
const grpc = 'src/LongevityDiet.Recommendation.Grpc';
const pdfEvidence = 'docs/assignment/FOUR-MEMBER-PDF-100PCT-ACCEPTANCE-AUDIT-20261111.md';
const demo = 'docs/assignment/PRN232-FINAL-DEMO-7-STEPS.md';

verify('2.1.ASPNET', '.NET 8+ ASP.NET Core REST service',
  () => textHas(api+'/LongevityDiet.API.csproj', /<TargetFramework>net9\.0<\/TargetFramework>/) &&
    has(api+'/Controllers/AuthController.cs'), [api+'/LongevityDiet.API.csproj']);
verify('2.1.CRUD', 'Actual CRUD routes for core catalog entities',
  () => ['AdminFoodsController.cs','AdminRecipesController.cs'].every(p => {
    const t = read(api+'/Controllers/'+p);
    return ['HttpGet','HttpPost','HttpPut','HttpDelete'].every(v => t.includes('['+v));
  }), [api+'/Controllers/AdminFoodsController.cs',api+'/Controllers/AdminRecipesController.cs']);
verify('2.1.LAYERS', 'API > services > repository projects and EF SQL ownership',
  () => ['Domain','Repositories','Services','API'].every(n => has('src/LongevityDiet.'+n+'/LongevityDiet.'+n+'.csproj')) &&
    textHas(api+'/LongevityDiet.API.csproj', /LongevityDiet\.Services\.csproj/) &&
    textHas(services+'/LongevityDiet.Services.csproj', /LongevityDiet\.Repositories\.csproj/),
  [api+'/LongevityDiet.API.csproj',services+'/LongevityDiet.Services.csproj']);
verify('2.1.JWT', 'JWT bearer authentication and independent authorization',
  () => includesAll(api+'/Program.cs',['AddJwtBearer','UseAuthentication','UseAuthorization']) &&
    textHas(api+'/Controllers/AuthController.cs', /\[HttpPost\("login"\)\]/),
  [api+'/Program.cs',api+'/Controllers/AuthController.cs']);
verify('2.1.SEARCH_SORT_PAGE', 'Catalog filtering/sorting/pagination is implemented, not only advertised',
  () => includesAll(services+'/Catalog/FoodCatalogService.cs',['PageSize','SortBy']) &&
    includesAll(repo+'/Catalog/Repositories/FoodRepository.cs',['.Skip(','.Take(']) &&
    textHas(services+'/Catalog/RecipeCatalogService.cs', /SortBy/),
  [services+'/Catalog/FoodCatalogService.cs',repo+'/Catalog/Repositories/FoodRepository.cs']);
verify('2.2.BACKGROUND', 'At least one scheduled/asynchronous BackgroundService',
  () => textHas(worker+'/RedisWeeklyReportStreamWorker.cs', /:\s*BackgroundService/) &&
    textHas(worker+'/Reminders/ReminderWorkerHostedService.cs', /BackgroundService/) &&
    has(worker+'/WeeklyReportWorker.cs'),
  [worker+'/RedisWeeklyReportStreamWorker.cs',worker+'/Reminders/ReminderWorkerHostedService.cs']);
verify('2.3.REDIS_PRODUCER', 'Message broker producer uses Redis Streams XADD',
  () => textHas(api+'/Infrastructure/WeeklyReportStreamPublisher.cs', /StreamAddAsync\s*\(/),
  [api+'/Infrastructure/WeeklyReportStreamPublisher.cs']);
verify('2.3.REDIS_CONSUMER', 'Redis consumer group receives and acknowledges entries',
  () => includesAll(worker+'/RedisWeeklyReportStreamWorker.cs',
    ['StreamReadGroupAsync','StreamAcknowledgeAsync','StreamAutoClaimAsync']),
  [worker+'/RedisWeeklyReportStreamWorker.cs']);
verify('2.4.GRPC_SERVICE', 'Independent gRPC service project and protobuf contracts',
  () => textHas(grpc+'/LongevityDiet.Recommendation.Grpc.csproj', /Grpc\.AspNetCore/) &&
    has(grpc+'/Protos/recommendation.proto') &&
    textHas(grpc+'/Program.cs', /MapGrpcService/),
  [grpc+'/LongevityDiet.Recommendation.Grpc.csproj',grpc+'/Program.cs']);
verify('2.4.GRPC_REST', 'REST->gRPC client wiring and live integration acceptance exists',
  () => textHas(api+'/Program.cs', /Grpc__|Grpc:|GrpcClient|GrpcChannel|Grpc\.RecommendationUrl|RecommendationUrl/) &&
    includesAll('scripts/Test-Live-Docker-Acceptance.ps1',['REST_TO_GRPC_LIVE']),
  [api+'/Program.cs','scripts/Test-Live-Docker-Acceptance.ps1']);
verify('3.DOCKER', 'Compose contains SQL Server, Redis, REST, gRPC, Worker and Web',
  () => ['sqlserver:','redis:','recommendation-grpc:','api:','worker:','web:'].every(x => read('docker-compose.yml').includes('\n  '+x)) &&
    ['API','Worker','Recommendation.Grpc','Web'].every(s =>
      has('src/LongevityDiet.'+s+'/Dockerfile')),
  ['docker-compose.yml',api+'/Dockerfile',worker+'/Dockerfile']);
verify('4.EF_SQL', 'Relational EF Core SQL Server with reproducible migrations',
  () => textHas(api+'/Program.cs', /UseSqlServer/) &&
    countMigrations(repo+'/Migrations') >= 1 &&
    countMigrations('src/LongevityDiet.Tracking/Migrations') >= 1 &&
    countMigrations(worker+'/Reminders/Migrations') >= 1,
  [api+'/Program.cs',repo+'/Migrations']);
verify('4.DI_CONFIG', 'Dependency injection and external configuration',
  () => includesAll(api+'/Program.cs',['builder.Configuration','builder.Services.Add']) &&
    has(api+'/appsettings.json') &&
    read('docker-compose.yml').includes('ConnectionStrings__Default'),
  [api+'/Program.cs','docker-compose.yml']);
verify('4.LOG_ERRORS', 'Structured logging and centralized exceptions',
  () => includesAll(api+'/Program.cs',
    ['UseSerilog','UseExceptionHandler','AddProblemDetails']),
  [api+'/Program.cs']);
verify('5.SOURCE', 'Complete solution and Web source exist',
  () => has('LongevityDiet.sln') && has('src/LongevityDiet.Web/package-lock.json') &&
    has('src/LongevityDiet.Web/src/App.tsx'), ['LongevityDiet.sln','src/LongevityDiet.Web']);
verify('5.MIGRATIONS', 'Database schema migrations/seed documentation',
  () => countMigrations(repo+'/Migrations') > 0 &&
    countMigrations('src/LongevityDiet.Tracking/Migrations') > 0 &&
    countMigrations(worker+'/Reminders/Migrations') > 0,
  [repo+'/Migrations',worker+'/Reminders/Migrations']);
verify('5.DOCKERFILES', 'Dockerfiles and Compose config in source tree',
  () => ['docker-compose.yml','src/LongevityDiet.API/Dockerfile',
    'src/LongevityDiet.Worker/Dockerfile',
    'src/LongevityDiet.Recommendation.Grpc/Dockerfile',
    'src/LongevityDiet.Web/Dockerfile'].every(has),
  ['docker-compose.yml','src/LongevityDiet.API/Dockerfile']);
verify('5.OPENAPI', 'Documented OpenAPI endpoint and bearer scheme',
  () => includesAll(api+'/Program.cs',['AddOpenApi','MapOpenApi']) &&
    has(api+'/OpenApi/BearerSecuritySchemeTransformer.cs'),
  [api+'/Program.cs',api+'/OpenApi/BearerSecuritySchemeTransformer.cs']);
verify('5.README', 'All six README headings mandated by assignment',
  () => [
    'Project description','System architecture','Technology stack',
    'Installation guide','Deployment instructions','Team Member Responsibilities'
  ].every(h => read('README.md').includes('## '+h)),
  ['README.md']);
verify('6.DEMO_ARTIFACT', 'Presentable seven-step executable demo and explicit truth boundary',
  () => has(demo) && [
    '01. System architecture','02. REST API','03. Background job',
    '04. Message broker','05. gRPC interaction','06. Docker deployment',
    '07. End-to-end workflow'
  ].every(x => read(demo).includes(x)) &&
    includesAll(demo,['not a lecturer sign-off','prn232-acceptance']),
  [demo]);
verify('7.RUBRIC', 'Official seven evaluation categories mapped without claiming grades',
  () => has(pdfEvidence) &&
    includesAll('docs/10-PRN232-TRACEABILITY.md', [
      'System architecture and design','REST API implementation','Background Job',
      'Message Broker integration','gRPC service','Docker/Cloud deployment',
      'Documentation and presentation'
    ]),
  [pdfEvidence,'docs/10-PRN232-TRACEABILITY.md']);
verify('GATE.NO_PRODUCTION_CLAIM', 'Clearly distinguish QA technical pass from graded final presentation',
  () => includesAll(demo,['QA only','not a lecturer sign-off']) &&
    includesAll(pdfEvidence,['KHÔNG MERGE','Target Architecture']),
  [demo,pdfEvidence]);

const passed = checks.filter(x => x.passed).length;
const failed = checks.length - passed;
console.log('OFFICIAL_PRN232_PDF_STATIC='+ (failed ? 'FAIL' : 'PASS') +
  ' passed='+passed+' failed='+failed);
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({category:'source_artifact_static_only',
    passed,failed,checks},null,2));
}
if (failed) process.exitCode = 1;
