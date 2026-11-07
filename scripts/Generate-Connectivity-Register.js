'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const schema=JSON.parse(fs.readFileSync(path.join(root,'scripts/current-physical-schema.json'),'utf8'));
const c2=JSON.parse(fs.readFileSync(path.join(root,'scripts/c2-extended-manifest.json'),'utf8'));
const erd=JSON.parse(fs.readFileSync(path.join(root,'scripts/unified-erd-manifest.json'),'utf8'));
const all=[];
for(const [db,g] of Object.entries(schema.groups))for(const table of Object.keys(g.columns))all.push({table,db});
if(all.length!==32||c2.tableAccessLinks.length!==10||erd.relationships.length!==31)throw Error('Model/reference inventory drift');
const neighbors=new Map(all.map(x=>[x.table,[]]));
for(const r of erd.relationships){
 if(!neighbors.has(r.from)||!neighbors.has(r.to))throw Error('Undocumented relation '+r.from+' -> '+r.to);
 neighbors.get(r.from).push(r.to+' ('+r.kind.toUpperCase()+')');
 neighbors.get(r.to).push(r.from+' ('+r.kind.toUpperCase()+')');
}
for(const [name,refs] of neighbors)if(!refs.length)throw Error('Isolated table in source-backed register '+name);
const lines=[
 '# C1, C2 và Database Diagram — bảng kiểm tra liên thông',
 '',
 'Tài liệu này được **sinh tự động từ mô hình EF Core và các quan hệ có căn cứ trong repository**, nhằm kiểm tra từng thành phần thay vì chỉ nhìn hình vẽ. Đây không phải sơ đồ thứ năm.',
 '',
 '## Kết luận theo cấp độ kiến trúc',
 '',
 '- **C1:** 10 thành phần/người dùng/database có liên hệ và có thể lần đường từ người dùng tới REST API, gRPC, Redis, Worker và cả ba database.',
 '- **C2 mở rộng:** 10 tuyến Controller → Service → Repository → Table Reference; 10 mã A01–A10 giúp tìm đúng bảng bên phải; mạng 32 bảng truy vết được từ phía Web/API.',
 '- **Database Diagram:** 32/32 bảng được ánh xạ EF Core đều có ít nhất một liên hệ và thuộc cùng mạng liên thông trong **sơ đồ tài liệu**.',
 '- **Không đồng nhất liên thông logic với FK vật lý.** Chỉ 9 quan hệ được khai báo SQL FK trong ba DbContext; 16 quan hệ ở tầng ứng dụng (APP), 6 luồng sự kiện (EVENT).',
 '',
 '## Ký pháp (chỉ đen–trắng)',
 '',
 '| Nét / đầu nối | Ý nghĩa |',
 '| --- | --- |',
 '| Liền, Crow’s Foot | FK SQL thật (có bội số 1–1 hoặc 1–nhiều) |',
 '| Đứt, APP | Cùng khóa/ngữ cảnh nghiệp vụ; **không phải FK** |',
 '| Chấm, EVENT | Sự kiện bất đồng bộ / Outbox / Inbox; **không phải FK** |',
 '| Đứt, TABLE REF | Dùng để tra từ repository sang bảng; **không tạo bảng hoặc FK mới** |',
 '',
 '## Kiểm tra C1: thành phần, DB và cổng',
 '',
 '| Thành phần | Kết nối có ý nghĩa |',
 '| --- | --- |',
 '| Member và Admin | → Web/Nginx, host :5173 → HTTP :80 |',
 '| Web/Nginx | → REST API qua /api, HTTP :8080 |',
 '| REST API | → Recommendation gRPC HTTP/2 :8081; ↔ Redis TCP :6379; → Identity/Tracking SQL :1433 |',
 '| Recommendation gRPC | Xử lý không trạng thái, **không có database riêng** trong Compose |',
 '| Redis Streams | ↔ Reminder Worker, trao đổi sự kiện TCP :6379 |',
 '| Reminder Worker | → LongevityWorkerDb SQL :1433; **không mở HTTP listener** |',
 '| LongevityDietDb | 21 bảng, truy cập từ REST API |',
 '| LongevityTrackingDb | 7 bảng, truy cập từ REST API |',
 '| LongevityWorkerDb | 4 bảng, truy cập từ Worker |',
 '',
 'SQL Server trên host publish **14330 → 1433** trong container; ba database là ba catalog riêng. C1 không nối gRPC tới SQL giả.',
 '',
 '## C2: mười dấu tham chiếu chéo service → bảng',
 '',
 'Mỗi mã xuất hiện **hai lần trên C2**: bên ô TABLE REFERENCE của repository và ngay cạnh tên bảng thật bên ERD. Tìm bằng mã là cách lần bảng không phải kéo 10 dây chéo phá hỏng bố cục.',
 '',
 '| Mã | Controller | Bảng thật | Database |',
 '| --- | --- | --- | --- |',
 ...c2.tableAccessLinks.map(([ctrl,table])=>{
  const owner=all.find(x=>x.table===table);
  return '| **'+c2.referenceTags[table]+'** | '+ctrl+' | '+table+' | '+(owner?.db||'UNKNOWN')+' |';
 }),
 '',
 'Các bảng đích trên là **điểm vào tiêu biểu**, không có nghĩa một service chỉ đọc/ghi duy nhất một bảng. Bản vẽ C2 có một nối native giữa phần API và mạng bảng, cho phép lần toàn bộ hệ thống mà không thêm các liên hệ DB giả.',
 '',
 '## Đối chiếu đủ 32 bảng và mọi liên hệ trực tiếp',
 '',
 '| Bảng EF Core | Database | Bảng liên hệ ngay bên cạnh (loại) | Số liên hệ |',
 '| --- | --- | --- | ---: |',
 ...all.map(({table,db})=>'| '+table+' | '+db+' | '+neighbors.get(table).sort().join('; ')+' | '+neighbors.get(table).length+' |'),
 '',
 'Đây là **mạng các liên hệ được mô tả**, không phải bằng chứng rằng mọi đường APP/EVENT được SQL Server ràng buộc. Không bổ sung FK hoặc thay đổi migration chỉ để mọi bảng trông có dây nối.',
 '',
 '## Nguồn và cách kiểm tra',
 '',
 'Nguồn bảng/FK: các DbContext trong src/LongevityDiet.Repositories, src/LongevityDiet.Tracking và src/LongevityDiet.Worker. Nguồn liên hệ C2: các controllers, services và manifests hiện tại. Nguồn cổng: docker-compose.yml.',
 '',
 'Kiểm tra tự động: node scripts/Validate-OverallDiagrams.js (bao gồm Validate-DiagramConnectivity.js). Xem bản có thể chỉnh sửa: [C1](one-page/C1.drawio), [C2](one-page/C2.drawio), [Database Diagram](one-page/Database%20Diagram.drawio).',
 '',
 'Mô hình dinh dưỡng 52 bảng đang đề xuất **không** nằm trong 32 bảng đã triển khai.',
 ''
];
const filename=path.join(root,'docs/assignment/04-ARCHITECTURE-CONNECTIVITY-REGISTER.md');
fs.writeFileSync(filename,lines.join('\n'),'utf8');
console.log('CONNECTIVITY_REGISTER_GENERATED',all.length,'tables',c2.tableAccessLinks.length,'API references',erd.relationships.length,'relations');
