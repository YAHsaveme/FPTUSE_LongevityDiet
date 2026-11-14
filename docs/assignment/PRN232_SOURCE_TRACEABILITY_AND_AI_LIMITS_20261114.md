# PRN232 — Đối chiếu nguồn khoa học và giới hạn sinh thực đơn (14/11/2026)

## Phạm vi
Đây là phép đối chiếu **nguyên tắc tổng quát** trong dự án với thông tin **công khai từ Fondazione Valter Longo**. Tài liệu **không** xác nhận đầy đủ nội dung hoặc số trang của toàn bộ sách có bản quyền `The Longevity Diet`. Không có chuyên gia y tế bên ngoài xác nhận công thức hay chế độ điều trị; không được diễn đạt sản phẩm như một công cụ kê đơn.

## Bảng truy xuất nguồn
| Nguyên tắc | Nguồn công khai kiểm tra | Điều kiện trong sản phẩm | Mức xác minh |
|---|---|---|---|
| Chế độ ăn chủ đạo thực vật, ưu tiên các loại đậu và ngũ cốc nguyên hạt | [Longevity Diet for Adults](https://www.fondazionevalterlongo.org/en/longevity-diet-for-adults/) | Quy tắc xếp hạng món; `PLANT_FORWARD`, `LEGUME_PROTEIN`, `COMPLEX_CARBS` | Có cơ sở cho nguyên tắc, không chứng minh từng món được nêu trong sách |
| Cá tối đa khoảng 2–3 bữa/tuần trong hướng dẫn người lớn | [Longevity Diet for Adults](https://www.fondazionevalterlongo.org/en/longevity-diet-for-adults/) | Bộ lọc tần suất cá bắt buộc ở backend, Gemini chỉ chọn trong danh mục đã lọc | Có cơ sở; không thay tư vấn phù hợp cá nhân |
| Hạn chế đường, chất béo bão hòa; ưu tiên chất béo phù hợp và tinh bột phức hợp | [Longevity Diet for Adults](https://www.fondazionevalterlongo.org/en/longevity-diet-for-adults/) | Xếp hạng `LOW_SUGAR_SATFAT`, thông tin dinh dưỡng trong catalog | Có cơ sở cho nguyên tắc; lượng g cụ thể do dữ liệu catalog cung cấp, chưa đối chiếu độc lập |
| Tuổi và tình trạng sức khỏe có thể làm thay đổi nhu cầu dinh dưỡng | [Stay young and healthy](https://www.fondazionevalterlongo.org/en/stay-young-and-healthy/) | Nhóm người dùng, sàng lọc, cờ sức khỏe và khóa các luồng giới hạn khi cần đánh giá thêm | Chỉ sàng lọc bảo thủ, không phải đánh giá lâm sàng |
| Chương trình mô phỏng nhịn ăn 5 ngày cần giám sát phù hợp | [Stay young and healthy](https://www.fondazionevalterlongo.org/en/stay-young-and-healthy/) | Cảnh báo và khóa điều kiện ở mô-đun FMD | Không khẳng định mọi người đều đủ điều kiện hoặc phù hợp |
| Giá trị dinh dưỡng, nguyên liệu và khẩu phần của từng công thức | Dữ liệu catalog/seed và đầu vào Admin, **không phải bản trích trực tiếp có xác minh từ sách** | Backend hiển thị số liệu đã lưu; không để Gemini tự tạo số liệu | **Chưa được xác minh thực phẩm học độc lập** |

## Cách đảm bảo đầu ra có ý nghĩa thay vì dài nhưng chung chung
1. Gemini **không sinh tên món, số liệu, lời khuyên chữa bệnh hay citation**. Gemini chỉ chọn `candidateCode` thuộc danh mục mà backend đã lọc theo ngày/bữa.
2. Backend dựng giải thích bằng tiếng Việt từ dữ liệu thật: khẩu phần, kcal, đạm, tinh bột, chất béo, chất xơ, nguyên liệu và nguyên tắc ảnh hưởng lựa chọn.
3. Backend kiểm tra lại dị ứng và loại trừ trước khi lưu; tên dị ứng tiếng Việt được chuẩn hóa về mã backend biết, các tên chưa nhận diện bị cảnh báo/khóa lưu trên UI.
4. Báo cáo tuần chỉ tổng hợp dữ liệu đã lưu; không tự kết luận bệnh, tuổi thọ hay cải thiện sức khỏe.
5. Mọi giải thích đều có giới hạn rõ ràng về thiếu chứng thực riêng cho từng cá nhân và nguy cơ tiếp xúc chéo.

## Việc không được tự tuyên bố đạt 100%
- Không có quyền hoặc nguồn văn bản đầy đủ đã đối chiếu từng trang sách để chứng minh từng định lượng và từng công thức đúng theo sách.
- Không có kiểm chứng độc lập của chuyên gia dinh dưỡng và chưa có clinical validation.
- Không thể đảm bảo mọi nội dung tự do do người dùng/Admin nhập đều bằng tiếng Việt; tên riêng, thuật ngữ kỹ thuật/URL có thể được giữ nguyên.
- Những dữ liệu chưa được phép ánh xạ sẽ không được gán bản dịch tự tạo mang tính suy đoán; cần thẩm định từng bản ghi.
- Kết quả AI có sai số; bộ kiểm tra backend và kiểm thử bảo vệ là các biện pháp giảm rủi ro, không bảo đảm an toàn y tế tuyệt đối.

## Kỹ thuật cần nghiệm thu
- 100+ unit tests sau bổ sung 7 profile, 109 integration tests.
- Unit UI chuẩn hóa dị ứng với các từ đồng nghĩa và kiểm thử chặn mục chưa nhận diện.
- E2E Gemini thật, E2E Member và E2E Admin trên Docker QA volume tách biệt.
- Báo cáo QA khác tại `docs/assignment/VIETNAMESE_UI_AND_AI_OUTPUT_QA_20261114.md`.
