using LongevityDiet.Domain.Entities;

namespace LongevityDiet.Services.Fmd;

public static class FmdSafetyCatalog
{
    public const string CurrentEducationVersion = "FMD-EDU-LONGO-2018.1";
    public const string CurrentSafetyVersion = "FMD-SAFETY-LONGO-2018.1";

    public static FmdEducationContent DefaultEducation { get; } = new(
        Version: CurrentEducationVersion,
        Title: "Chương trình Giả nhịn ăn (FMD - Fasting Mimicking Diet) & Giới hạn An toàn",
        Summary: "FMD là chế độ dinh dưỡng mô phỏng nhịn ăn trong 5 ngày do Valter Longo và cộng sự nghiên cứu. Các cơ chế tái tạo tế bào được đề cập trong sách vẫn cần được đánh giá theo bằng chứng và điều kiện cá nhân; ứng dụng không xác nhận hiệu quả chữa bệnh hay làm chậm lão hóa cho một người cụ thể.",
        ScopeDisclaimer: "Theo The Longevity Diet (Valter Longo, 2018), Chương 6, trang PDF 112–115: FMD được khuyến nghị sử dụng công thức đã thử nghiệm lâm sàng và tốt nhất có chuyên gia y tế giám sát. Ứng dụng chỉ hỗ trợ đọc thông tin và theo dõi, KHÔNG PHẢI là thiết bị y tế, KHÔNG xác nhận đủ điều kiện y khoa, KHÔNG kê đơn, KHÔNG thay thế bác sĩ; người có bệnh lý hoặc đang dùng thuốc cần được bác sĩ đánh giá trước khi cân nhắc FMD. Tác giả sách không trực tiếp khám, tư vấn hay phê duyệt sản phẩm này.",
        KeyPrinciples:
        [
            "Chu kỳ 5 ngày có kiểm soát năng lượng và thành phần thực vật chủ đạo.",
            "Ngày 1: Khoảng 1100 kcal (chất béo lành mạnh từ quả hạch/dầu ô-liu và tinh bột phức hợp, lượng đạm thấp).",
            "Ngày 2–5: sách mô tả khoảng 800 kcal/ngày, nhưng đây không phải thực đơn tự pha chế an toàn để tự thực hiện (Chương 6, trang PDF 115).",
            "Uống nước và tránh hoạt động gắng sức theo cảnh báo của tác giả; không áp dụng định mức 2–2,5 lít cho mọi người nếu không có căn cứ cá nhân hóa.",
            "Khi có triệu chứng bất thường, ngừng thử nghiệm và liên hệ nhân viên y tế; tuyệt đối không kết hợp FMD với insulin hoặc thuốc hạ đường huyết (Chương 6, trang PDF 113)."
        ],
        AbsoluteContraindications:
        [
            "Phụ nữ mang thai hoặc đang trong thời kỳ cho con bú.",
            "Trẻ em và thanh thiếu niên dưới 18 tuổi.",
            "Người nhẹ cân, chỉ số khối cơ thể BMI < 18.5 kg/m².",
            "Người trên 70 tuổi (chỉ cân nhắc ngoại lệ nếu đặc biệt khỏe và được bác sĩ chấp thuận), người suy nhược hoặc có nguy cơ mất cơ.",
            "Người có tiền sử rối loạn hành vi ăn uống (biếng ăn tâm thần, ăn ói...).",
            "Bệnh nhân đái tháo đường đang sử dụng insulin hoặc thuốc hạ đường huyết (nguy cơ hạ đường huyết nguy hiểm tính mạng).",
            "Bệnh nhân đang điều trị ung thư mà không có sự đồng thuận và theo dõi trực tiếp từ bác sĩ chuyên khoa ung bướu.",
            "Người có bệnh gan/thận, bệnh mạn tính đáng kể, huyết áp thấp, đang dùng thuốc hoặc đang luyện tập gắng sức cần được bác sĩ đánh giá theo Chương 6."
        ],
        Citations:
        [
            new(
                "Valter Longo (2018), The Longevity Diet, Chương 6, trang PDF 112–115 (sách do người dùng cung cấp)",
                "UserProvidedBook",
                "",
                "Nguồn gốc: bản tiếng Anh ISBN 9780525534075; tác giả Valter Longo, PhD. Phải đối chiếu chương và trang, không tuyên bố tác giả tham gia ứng dụng."),
            new(
                "Valter Longo (2018), The Longevity Diet, Chương 4, trang PDF 89–90",
                "UserProvidedBook",
                "",
                "Tóm tắt chế độ ăn trường thọ; không dùng thay cho đánh giá nguy cơ FMD."),
            new(
                "Valter Longo (2018), The Longevity Diet, Phụ lục A, trang PDF 212–214",
                "UserProvidedBook",
                "",
                "Thực đơn 14 ngày dành cho đối tượng tham chiếu; không phải đơn FMD hay khẩu phần chung cho mọi người.")
        ]);

    public static IReadOnlyList<FmdSafetyQuestionDto> ScreeningQuestions { get; } =
    [
        new(
            "PREGNANT_OR_BREASTFEEDING",
            "Sinh lý & Thai kỳ",
            "Bạn hiện có đang mang thai, dự định có thai trong tháng này hoặc đang cho con bú không?",
            "Thai kỳ và cho con bú đòi hỏi nguồn năng lượng và dưỡng chất liên tục cho thai nhi/trẻ nhỏ.",
            IsHighRiskIfTrue: true),
        new(
            "AGE_OUT_OF_BOUNDS",
            "Độ tuổi & Thể trạng",
            "Bạn có dưới 18 tuổi, trên 70 tuổi, chưa xác minh được tuổi, hoặc có suy nhược thể lực/suy giảm khối cơ không?",
            "Chương 6 (trang PDF 112) cảnh báo người dưới 18 tuổi, trên 70 tuổi (dù khỏe vẫn cần bác sĩ cho phép) và người suy nhược.",
            IsHighRiskIfTrue: true),
        new(
            "UNDERWEIGHT_BMI",
            "Chỉ số thể trọng",
            "Chỉ số BMI của bạn hiện có dưới 18.5 kg/m² hoặc bạn đang bị sụt cân ngoài ý muốn gần đây không?",
            "FMD gây thâm hụt calo và chống chỉ định tuyệt đối với người nhẹ cân hoặc suy dinh dưỡng.",
            IsHighRiskIfTrue: true),
        new(
            "EATING_DISORDER_HISTORY",
            "Tâm lý dinh dưỡng",
            "Bạn có từng có tiền sử hoặc đang được điều trị rối loạn ăn uống (chán ăn tâm thần, cuồng ăn...) không?",
            "Các chế độ hạn chế calo nghiêm ngặt có thể kích hoạt tái phát rối loạn ăn uống tâm lý.",
            IsHighRiskIfTrue: true),
        new(
            "DIABETES_MEDICATION",
            "Thuốc & Đường huyết",
            "Bạn có đang dùng Insulin, Sulfonylurea hoặc bất kỳ thuốc hạ đường huyết nào do bác sĩ kê đơn không?",
            "Nhịn ăn kết hợp thuốc hạ đường huyết có nguy cơ dẫn đến sốc hạ đường huyết cấp tính đe dọa tính mạng.",
            IsHighRiskIfTrue: true),
        new(
            "ACTIVE_CHEMOTHERAPY_OR_CANCER",
            "Bệnh lý mạn tính",
            "Bạn có đang mắc ung thư, đang điều trị ung thư, hoặc có bệnh lý đáng kể cần bác sĩ chuyên khoa đánh giá không?",
            "Tác giả yêu cầu có ý kiến bác sĩ chuyên khoa đối với bệnh nghiêm trọng; không dùng ứng dụng làm phác đồ điều trị (Chương 6, trang PDF 112–113).",
            IsHighRiskIfTrue: true),
        new(
            "ORGAN_FAILURE_OR_INFECTION",
            "Bệnh lý cơ quan",
            "Bạn có bệnh gan, bệnh thận, bệnh tim đáng kể hoặc nhiễm trùng cấp tính cần bác sĩ đánh giá không?",
            "Bệnh gan/thận và các bệnh lý nghiêm trọng là nhóm cần tránh hoặc phải được bác sĩ đánh giá theo Chương 6, trang PDF 112–113.",
            IsHighRiskIfTrue: true),
        new(
            "OTHER_MEDICATION",
            "Thuốc đang sử dụng",
            "Bạn có đang dùng thuốc điều trị nào khác, kể cả thuốc huyết áp, mà chưa được bác sĩ đánh giá tương tác với FMD không?",
            "Chương 6, trang PDF 113 yêu cầu có ý kiến bác sĩ khi đang dùng thuốc; không chỉ riêng thuốc đái tháo đường.",
            IsHighRiskIfTrue: true),
        new(
            "LOW_BLOOD_PRESSURE",
            "Huyết áp",
            "Bạn có huyết áp thấp hoặc đang uống thuốc điều trị tăng huyết áp không?",
            "Chương 6, trang PDF 113 cảnh báo nguy cơ tụt huyết áp và yêu cầu bác sĩ chuyên môn đánh giá.",
            IsHighRiskIfTrue: true),
        new(
            "ATHLETE_HEAVY_TRAINING",
            "Hoạt động thể lực",
            "Bạn đang thi đấu thể thao hoặc luyện tập cường độ cao trong khoảng thời gian dự định áp dụng FMD không?",
            "Chương 6, trang PDF 113 cảnh báo nguy cơ ngất do nhu cầu chuyển hóa khi gắng sức.",
            IsHighRiskIfTrue: true),
        new(
            "GLUCONEOGENESIS_DISORDER",
            "Bệnh di truyền hiếm",
            "Bạn có bệnh di truyền/rối loạn chuyển hóa được bác sĩ xác nhận ảnh hưởng đến quá trình tạo glucose không?",
            "Chương 6, trang PDF 113 lưu ý những đột biến cản trở quá trình tân tạo đường.",
            IsHighRiskIfTrue: true)
    ];

    public static (FmdSafetyStatus Status, List<string> TriggeredCodes, string Message) EvaluateScreening(
        IReadOnlyDictionary<string, bool> answers)
    {
        var triggered = new List<string>();

        foreach (var q in ScreeningQuestions)
        {
            if (answers.TryGetValue(q.QuestionId, out var answeredYes) && answeredYes && q.IsHighRiskIfTrue)
            {
                triggered.Add(q.QuestionId);
            }
        }

        if (triggered.Count > 0)
        {
            return (
                FmdSafetyStatus.ProfessionalReviewRequired,
                triggered,
                "Hệ thống phát hiện ít nhất một yếu tố rủi ro sức khỏe cao. Bạn BẮT BUỘC phải tham vấn bác sĩ chuyên khoa và KHÔNG ĐƯỢC tự ý thực hiện chu kỳ nhịn ăn FMD.");
        }

        var missing = ScreeningQuestions.Where(q => !answers.ContainsKey(q.QuestionId))
            .Select(q => q.QuestionId).ToList();
        if (missing.Count > 0)
        {
            return (
                FmdSafetyStatus.AssessmentRequired,
                missing,
                "Chưa trả lời đầy đủ các câu hỏi sàng lọc. Không thể tự động coi câu chưa trả lời là không có nguy cơ.");
        }

        return (
            FmdSafetyStatus.EligibleForTracking,
            triggered,
            "Đã trả lời đủ bảng hỏi và không khai báo yếu tố cảnh báo trong danh sách. Đây chỉ là điều kiện ghi nhật ký trong ứng dụng, KHÔNG phải xác nhận đủ điều kiện thực hiện FMD hay giấy chấp thuận của bác sĩ.");
    }

    public static int ResolveTargetCaloriesForDay(int dayNumber)
    {
        return dayNumber switch
        {
            1 => 1100,
            >= 2 and <= 5 => 800,
            _ => throw new ArgumentOutOfRangeException(nameof(dayNumber),
                "Chỉ có năm ngày FMD trong bảng tóm tắt của Chương 6, trang PDF 115.")
        };
    }
}
