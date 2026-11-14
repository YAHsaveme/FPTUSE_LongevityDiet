# The Longevity Diet (Valter Longo, 2018) — nguồn đối chiếu chính cho PRN232
**Ngày đối chiếu:** 14/11/2026 · **Bản:** PDF tiếng Anh do người dùng cung cấp (306 trang)

## Nguồn, bản quyền và người viết
- **Tác giả:** Valter Longo, PhD; đây là tác giả sách và nhà nghiên cứu được trích dẫn, **không phải chuyên gia khám trực tiếp hoặc đối tác bảo trợ dự án**.
- **Nhan đề:** *The Longevity Diet: Discover the New Science Behind Stem Cell Activation and Regeneration to Slow Aging, Fight Disease, and Optimize Weight*.
- **Bản quyền:** © 2018 Valter Longo, Avery / Penguin Random House; **ISBN:** 9780525534075.
- **SHA-256 PDF người dùng tải lên:** `c4e762039b877d185ae1f44035cace4ba95f1791adbafb8097a0764dd26757d6`.
- **Lưu ý trang:** Tất cả số trang dưới đây là trang PDF trong bản 306 trang, không phải số trang in.
- **Không commit PDF toàn văn lên GitHub:** bản sao do người dùng cung cấp có bản quyền. Trong repo chỉ lưu bản đồ nguồn, diễn giải ngắn và các quy tắc có thể kiểm tra, không lưu nguyên văn toàn bộ sách.

## Bản đồ nội dung
| Phần | Trang PDF | Ứng dụng phù hợp / giới hạn |
|---|---:|---|
| Giới thiệu, năm trụ cột bằng chứng | 7–13, 47–57 | Tác giả và xuất xứ; không chuyển các giả thuyết nghiên cứu thành tuyên bố chữa bệnh |
| Chương 1–2 | 15–46 | Lối sống, di truyền và cơ chế lão hóa: giáo dục, không chẩn đoán |
| Chương 3 | 47–57 | Năm trụ cột; kiểm chứng phân loại bằng chứng |
| Chương 4 | 58–90, phần tóm tắt 89–90 | Nguồn chính cho các nguyên tắc chọn món và thời gian ăn |
| Chương 5 | 91–98 | Hoạt động và vận động: giáo dục, theo dõi |
| Chương 6 | 99–116, chống chỉ định 112–113, lịch FMD 114–115 | Cảnh báo, sàng lọc và ràng buộc nhật ký; không kê đơn FMD tự chế |
| Chương 7–11 | 117–204 | Nghiên cứu liên quan bệnh lý; không dùng để tự điều trị, không được thay bác sĩ |
| Chương 12 | 205–211 | Tổng hợp cách duy trì lối sống |
| Phụ lục A | 212–242 | 14 ngày mẫu; mô tả bữa/ngày có trang; không tự suy đoán dinh dưỡng từng món |
| Phụ lục B | 243–260 | Bảng nguồn B12, folate, canxi, sắt, A, C, D, E, omega-3, magie |

## Nguyên tắc có thể đối chiếu
- **Chương 4, PDF 89–90:** ăn chủ đạo thực vật; giới hạn bữa cá khoảng 2–3 lần/tuần; nhấn mạnh nguồn protein từ đậu; cân nhắc lượng đạm theo tuổi và cơ thể; hạn chế đường/chất béo bão hòa; tinh bột phức hợp, rau củ, dầu và hạt; điều chỉnh số bữa, thời gian ăn ~12 giờ và không ăn sát giờ ngủ; cân nặng và vòng bụng.
- **Phụ lục A, PDF 212–214:** mẫu 14 ngày dành cho đối tượng tham khảo và nhu cầu năng lượng cụ thể, khoảng 1.700–1.800 kcal/ngày. Nam giới tham khảo có thể cần điều chỉnh lượng, người cao tuổi hoặc sụt cân cần sửa khẩu phần. **Không** lấy mẫu này thành chỉ số năng lượng mặc định cho mọi người.
- **Phụ lục A, PDF 215–242:** theo dõi đúng các bữa sáng, trưa, tối, phụ của 14 ngày bằng `src/LongevityDiet.Web/src/features/book/bookReferenceData.ts`. Tên món là diễn giải tiếng Việt; lượng và hướng dẫn chi tiết nằm trong PDF, không sao chép.
- **Phụ lục B, PDF 243–260:** các bảng thực phẩm giàu vi chất được gắn trang tham chiếu. Dữ liệu dinh dưỡng từ công thức/danh mục do team nhập phải được kiểm chứng độc lập; sách lưu ý có sai khác theo nhãn hàng.
- **Chương 6, PDF 112–115:** FMD được tác giả khuyến nghị nên dùng công thức đã thử nghiệm, có giám sát thích hợp; có chống chỉ định cho mang thai, người nhẹ cân, trên 70, tình trạng yếu, bệnh gan/thận, bệnh lý nghiêm trọng, thuốc, huyết áp thấp, vận động cường độ cao. **Sách ghi ~1.100 kcal ngày 1 và ~800 kcal ngày 2–5**, khác với bản code cũ 750 kcal.

## Đã cập nhật bằng chứng vào phần mềm
| Luồng | Thay đổi | Nghiệm thu yêu cầu |
|---|---|---|
| Trang tra cứu nguồn sách | 9 nguyên tắc, 14 ngày menu tham chiếu, 10 nhóm vi chất, 12 chương/2 phụ lục, ISBN/SHA, tác giả | Vitest dataset; Playwright trang /book và responsive |
| FMD | Nâng version giáo dục/sàng lọc; 750→800 ngày 2–5; thêm thuốc/huyết áp thấp/vận động cao/rối loạn tân tạo đường; câu bỏ trống không bị hiểu là “Không” | .NET Unit + Integration, E2E hiển thị |
| Tồn tại lịch sử | Bảng hỏi FMD version cũ không cấp phép tạo chu kỳ mới; các chu kỳ đã lưu không bị chỉnh ngầm | Kiểm tra version safety; kiểm tra DB tách |
| Gemini | Dùng các nguyên tắc được xác minh từ Chương 4, Phụ lục A và cảnh báo Chương 6, thay vì coi tóm tắt website là toàn bộ sách; chỉ chọn mã ứng viên an toàn | Giữ kiểm tra server, không upload toàn PDF vào Gemini |
| Giải thích thực đơn | Ghi rõ quy tắc lấy từ sách ở trang nào; không nhận món tổng hợp là nguyên bản của tác giả | Unit giải thích và E2E 7 ngày/21 bữa |
| Catalog | Seed và bộ quy tắc mặc định cho cài đặt mới lấy Chương 4 của sách làm căn cứ và sử dụng SourceType.Book; link dẫn trang xác minh ISBN của nhà xuất bản, không phải link toàn văn. Món do team tạo vẫn được ghi nhãn khác với món trong sách | Kiểm tra version đã lưu ở môi trường có dữ liệu cũ trước khi xuất bản |
| Tác giả/“chuyên gia” | Chỉ ghi nhận Valter Longo, PhD là tác giả, không có chat chuyên gia giả hoặc nhận đã được ông chứng thực | Copy review UI và API |

## Những điều chưa thể xác nhận “100% đúng sách”
1. Trong nguồn code có nhiều món gợi ý do nhóm sáng tạo, **không nằm nguyên văn** trong Phụ lục A; dù hợp nguyên tắc, không được tuyên bố là công thức sách.
2. Các giá trị năng lượng/protein/vitamin cho mỗi món hiện được nhập từ catalog dự án, không có chứng nhận rằng tất cả số đó trích từ sách. **Không tự thêm số liệu khi sách không cung cấp**; cần nguồn dinh dưỡng được phép và kiểm nghiệm khoa học nếu muốn đưa ra giá trị định lượng chính xác.
3. Sách không cung cấp API, dữ liệu sức khỏe thời gian thực, điều kiện kiểm chứng bác sĩ/giấy phép chuyên môn hay định lượng cho từng món Việt Nam hiện có. Phần này chỉ có thể là chức năng team phát triển và phải mô tả như vậy.
4. Sách xuất bản năm 2018. Các luận điểm về điều trị bệnh hoặc thử nghiệm lâm sàng không thể tự hiểu là hướng dẫn y khoa cập nhật cho năm 2026; ứng dụng không thay bác sĩ.
5. Phương án AI hiện tại **không phải fine-tune và không trực tiếp nạp toàn bộ 306 trang vào Gemini**. Backend sử dụng quy tắc có trích dẫn và danh mục món được kiểm soát; đây là phương pháp hạn chế thông tin bịa và rủi ro quyền tác giả.

## Kết quả nghiệm thu kỹ thuật vòng này
- .NET: **105/105 Unit** và **109/109 Integration** đạt khi chạy trên mã mới nhất.
- Web Vitest + Node test/lint/build đạt; Playwright Docker Desktop **17/17** sau sửa lỗi DB, bao gồm Gemini thật 7 ngày/21 bữa, CRUD Admin, user journeys, phần tra cứu sách và responsive.
- Lỗi thật đã được phát hiện ở bước tạo thực đơn Gemini: thêm giải thích theo trang sách làm `MealPlans.PlanExplanation` vượt giới hạn cũ `nvarchar(1000)`, gây HTTP 500. Migration `20261114150000_ExpandMealPlanExplanation` mở rộng lên `nvarchar(4000)` không sửa lịch sử. Kiểm tra SQL Server demo trả chiều dài tối đa **4000**, lịch sử migration **1 bản ghi**, Gemini E2E thử lại **PASS**.
- SQLite và SQL Server được giữ tương thích trong EF Core Model và integration suite.
- CI cũ của PR #62 gặp `SYNTHETIC_MEMBER_REGISTERED` trong Catalog smoke. Cập nhật kịch bản retry có giới hạn theo HTTP 429; chưa gọi là CI xanh trước khi GitHub Actions chạy lại và xác nhận.

## Di trú và nguồn của dữ liệu cũ
- `CatalogSeed` mới dùng `SourceType.Book` và trích Chương 4 với liên kết metadata ISBN của nhà xuất bản. Bộ quy tắc tĩnh dùng version `LDC-RULES-LONGO-2018.1`.
- **Không thay đổi âm thầm** các phiên bản quy tắc cũ đã công bố trong DB. Nếu môi trường đã seed theo Foundation thì đó vẫn là historical records; cần xuất bản version mới có review trước khi hiển thị như đã đối chiếu sách.
- Việc dùng `SourceType.Book` thể hiện xuất xứ quy tắc, **không** đồng nghĩa bài nghiên cứu đã được độc lập phê duyệt hoặc nhà xuất bản/tác giả hợp tác với nhóm.

## Quy trình cập nhật tiếp
Để chuyển bất kỳ thực phẩm/recipe/RuleVersion nào từ “demo” sang “đã đối chiếu sách”: (a) chỉ ra trang PDF, (b) đối chiếu tên và nguyên liệu/định lượng, (c) kiểm tra dị ứng, (d) xác minh các số dinh dưỡng **từ nguồn thực tế** khi sách không cho số, (e) QA và peer review, (f) xuất bản phiên bản mới; không sửa lặng lẽ hồ sơ lịch sử, không giả chữ ký tác giả.
