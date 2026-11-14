/**
 * Lược giải có cấu trúc từ bản sách do người dùng cung cấp, không phải toàn văn.
 * Không chứa công thức từng bước, hồ sơ bệnh hoặc dữ liệu dinh dưỡng ước đoán.
 * Các trang dưới đây là số trang PDF 306 trang (không nhất thiết là số trang in).
 */
export const LONGO_BOOK = {
  id: 'longo-2018-the-longevity-diet',
  title: 'The Longevity Diet',
  titleVi: 'Chế độ ăn trường thọ',
  author: 'Valter Longo, PhD',
  publicationYear: 2018,
  isbn: '9780525534075',
  pdfPages: 306,
  sha256: 'c4e762039b877d185ae1f44035cace4ba95f1791adbafb8097a0764dd26757d6',
  attribution: 'Tác giả khoa học của sách; không phải bác sĩ tư vấn hay người phê duyệt ứng dụng.',
} as const

export type BookRule = {
  id: string
  title: string
  explanation: string
  pdfPages: string
  scope: string
}

export const LONGO_BOOK_RULES: BookRule[] = [
  { id: 'diet-pattern', title: 'Ưu tiên thực vật và dùng cá có kiểm soát',
    explanation: 'Nền tảng là rau củ, đậu, ngũ cốc và chất béo thực vật; sách nêu giới hạn khoảng 2–3 bữa có cá trong một tuần.',
    pdfPages: '89', scope: 'Nguyên tắc ăn uống phổ quát, không khẳng định cá phù hợp với người dị ứng.' },
  { id: 'protein', title: 'Đạm cần xét theo tuổi và thể trạng',
    explanation: 'Người dưới 65 tuổi được sách mô tả mức khoảng 0,31–0,36 g đạm mỗi pound cân nặng/ngày; sau tuổi 65 cần cân nhắc tăng đạm để bảo toàn khối cơ.',
    pdfPages: '89, 208–209', scope: 'Không tự kê định lượng nếu thiếu cân nặng, hoạt động, bệnh lý và đánh giá dinh dưỡng.' },
  { id: 'fat-sugar', title: 'Hạn chế đường và chất béo bão hòa',
    explanation: 'Ưu tiên chất béo không bão hòa, dầu ô-liu, các loại hạt và tinh bột phức hợp.',
    pdfPages: '89', scope: 'Không tạo số liệu dinh dưỡng chính xác cho món khi nguồn không có.' },
  { id: 'micronutrients', title: 'Kiểm tra vi chất thiết yếu',
    explanation: 'Đối chiếu các nguồn vitamin, khoáng chất và omega-3 tại Phụ lục B; thực phẩm cần được cân nhắc tổng thể.',
    pdfPages: '89, 212, 243–260', scope: 'Bảng trong sách không thay thế kết quả xét nghiệm hay đơn bổ sung cho cá nhân.' },
  { id: 'traditional', title: 'Chọn nguyên liệu có nền tảng ẩm thực truyền thống',
    explanation: 'Sách khuyến khích lựa chọn thực phẩm quen thuộc trong truyền thống gia đình khi phù hợp nguyên tắc dinh dưỡng.',
    pdfPages: '90', scope: 'Món Việt hóa là biến thể do nhóm xây dựng, không được gọi là công thức gốc của tác giả.' },
  { id: 'frequency', title: 'Số bữa phụ thuộc thể trạng',
    explanation: 'Sách phân biệt phương án hai hoặc ba bữa chính tùy cân nặng, vòng bụng, xu hướng tăng/giảm cân và tuổi.',
    pdfPages: '90', scope: 'Phải cá nhân hóa; không bắt buộc cùng một số bữa cho tất cả.' },
  { id: 'eating-window', title: 'Khung giờ ăn trong khoảng 12 tiếng',
    explanation: 'Tác giả khuyến khích giới hạn thời gian ăn trong ngày và tránh ăn sát giờ ngủ.',
    pdfPages: '90, 213', scope: 'Không tự áp dụng nhịn ăn kéo dài nếu có nguy cơ sức khỏe.' },
  { id: 'fmd', title: 'FMD là trường hợp cần thận trọng đặc biệt',
    explanation: 'Sách mô tả chu kỳ 5 ngày và nêu rõ nhóm tránh, nguy cơ tương tác thuốc và khuyến nghị dùng công thức đã thử nghiệm, có giám sát phù hợp.',
    pdfPages: '112–115', scope: 'Nội dung giáo dục, không kê đơn FMD tự làm hoặc xác nhận đủ điều kiện lâm sàng.' },
  { id: 'weight', title: 'Duy trì cân nặng và vòng bụng phù hợp',
    explanation: 'Phải điều chỉnh chế độ ăn theo thể trạng, không lấy một khẩu phần mẫu làm chuẩn bắt buộc.',
    pdfPages: '90, 212–214', scope: 'Không suy ra sức khỏe hay tuổi thọ từ một chỉ số đơn lẻ.' },
]

export type BookDay = {
  week: 1 | 2
  day: number
  pdfPage: number
  breakfast: string
  lunch: string
  lunchPdfPage: number
  dinner: string
  dinnerPdfPage: number
  snack: string
  fishOrSeafood: boolean
}

export const LONGO_BOOK_TWO_WEEK_MEALS: BookDay[] = [
  {week:1,day:1,pdfPage:215,breakfast:'Bánh focaccia nguyên cám, sữa hạt và mứt việt quất không thêm đường',lunch:'Rau bina với hạt thông và nho khô',lunchPdfPage:215,dinner:'Mì nguyên cám với bông cải xanh và đậu đen',dinnerPdfPage:216,snack:'Sữa dừa không đường và thanh hạt/ngũ cốc',fishOrSeafood:false},
  {week:1,day:2,pdfPage:217,breakfast:'Ngũ cốc với sữa hạnh nhân và trà',lunch:'Gạo hoang dã, đậu que, cà chua tươi và tỏi',lunchPdfPage:217,dinner:'Phi lê cá hồi ăn với măng tây',dinnerPdfPage:218,snack:'Sữa hạt phỉ không đường và thanh ngũ cốc',fishOrSeafood:true},
  {week:1,day:3,pdfPage:219,breakfast:'Bánh mì nguyên cám nướng với mứt quả mọng không thêm đường',lunch:'Spelt và bí ngòi với tỏi, ô-liu, mùi tây',lunchPdfPage:219,dinner:'Súp minestrone đậu gà và mì',dinnerPdfPage:220,snack:'Bánh đậu gà farinata và rau sống',fishOrSeafood:false},
  {week:1,day:4,pdfPage:221,breakfast:'Bánh mì quế nho khô hoặc bánh mì nướng với mứt mơ',lunch:'Salad lúa mạch, ô-liu và các loại hạt',lunchPdfPage:221,dinner:'Súp đậu lăng và mì',dinnerPdfPage:222,snack:'Sữa dừa không đường và thanh hạt/ngũ cốc',fishOrSeafood:false},
  {week:1,day:5,pdfPage:223,breakfast:'Yến mạch với sữa hạnh nhân và trái cây',lunch:'Rau escarole với ô-liu, cà chua và húng quế',lunchPdfPage:223,dinner:'Bạch tuộc với khoai tây',dinnerPdfPage:224,snack:'Sữa hạt phỉ không đường và thanh ngũ cốc',fishOrSeafood:true},
  {week:1,day:6,pdfPage:225,breakfast:'Focaccia nguyên cám và trái cây tươi',lunch:'Cà tím nướng với phô mai feta và cà chua',lunchPdfPage:225,dinner:'Mì với đậu que và rau kiểu Molochio',dinnerPdfPage:225,snack:'Sữa hạnh nhân không đường và thanh hạt',fishOrSeafood:false},
  {week:1,day:7,pdfPage:227,breakfast:'Ngũ cốc trái cây và hạt với sữa hạnh nhân',lunch:'Cải Brussels với tỏi, hạt thông và Parmesan',lunchPdfPage:227,dinner:'Mì spaghetti với nghêu và vẹm',dinnerPdfPage:228,snack:'Sữa chua sữa dê và thực phẩm phụ theo sách',fishOrSeafood:true},
  {week:2,day:1,pdfPage:229,breakfast:'Yến mạch cùng sữa hạnh nhân, sô-cô-la đen, hạt và quả mọng',lunch:'Salad Hy Lạp với feta, ô-liu, hành và ớt chuông',lunchPdfPage:229,dinner:'Salad đậu gà và rau, ăn kèm bánh đậu gà',dinnerPdfPage:230,snack:'Sữa hạt phỉ không đường và thanh ngũ cốc',fishOrSeafood:false},
  {week:2,day:2,pdfPage:231,breakfast:'Bánh mì óc chó và sữa hạt phỉ không đường',lunch:'Súp bí đỏ với bánh mì nướng giòn',lunchPdfPage:231,dinner:'Mì với cá ngừ, ô-liu, bạch hoa và cà chua',dinnerPdfPage:232,snack:'Sinh tố quả mọng và chuối hoặc món phụ tương đương',fishOrSeafood:true},
  {week:2,day:3,pdfPage:233,breakfast:'Bánh mì quế nho khô với mứt mận không thêm đường',lunch:'Cơm với bí ngòi và đậu Hà Lan',lunchPdfPage:233,dinner:'Salad đậu trắng với hành, hương thảo và rau diếp xoăn',dinnerPdfPage:234,snack:'Sữa dừa không đường và thanh hạt/ngũ cốc',fishOrSeafood:false},
  {week:2,day:4,pdfPage:235,breakfast:'Bánh mì nho khô và óc chó với chuối',lunch:'Salad củ thì là với cà chua, cà rốt, hành và ô-liu',lunchPdfPage:235,dinner:'Gạo đen với bí ngòi và tôm',dinnerPdfPage:236,snack:'Sữa chua sữa dê và thực phẩm phụ theo sách',fishOrSeafood:true},
  {week:2,day:5,pdfPage:237,breakfast:'Thanh ngũ cốc nguyên cám với chuối và sô-cô-la đen',lunch:'Salad spelt Địa Trung Hải với atisô và nấm',lunchPdfPage:237,dinner:'Súp rau minestrone kiểu Liguria',dinnerPdfPage:238,snack:'Sữa hạnh nhân không đường và thanh hạt',fishOrSeafood:false},
  {week:2,day:6,pdfPage:239,breakfast:'Ngũ cốc trái cây và hạt với sữa hạt phỉ',lunch:'Súp cà chua với húng quế, pesto và bánh mì giòn',lunchPdfPage:239,dinner:'Súp kem đậu gà và bông cải hấp',dinnerPdfPage:240,snack:'Sữa hạt phỉ không đường và thanh ngũ cốc',fishOrSeafood:false},
  {week:2,day:7,pdfPage:241,breakfast:'Bánh mì nam việt quất, sữa hạnh nhân và mật ong',lunch:'Salad lúa mạch với bông cải xanh, feta và cà chua',lunchPdfPage:241,dinner:'Pizza rau củ với cá cơm và cá mòi, không phô mai',dinnerPdfPage:242,snack:'Sữa dừa không đường và thanh ngũ cốc',fishOrSeafood:true},
]

export const LONGO_BOOK_MICRONUTRIENTS = [
  { label:'Vitamin B12', pdfPage:243, examples:'Nghêu, vẹm, cá thu' },
  { label:'Folate (B9)', pdfPage:245, examples:'Rau bina luộc, đậu mắt đen, măng tây' },
  { label:'Canxi', pdfPage:247, examples:'Ngũ cốc tăng cường canxi, hạnh nhân, đậu gà' },
  { label:'Sắt', pdfPage:249, examples:'Đậu trắng, bột cacao không đường, hàu' },
  { label:'Vitamin A', pdfPage:251, examples:'Khoai lang nướng, rau bina, cà rốt' },
  { label:'Vitamin C', pdfPage:253, examples:'Ớt chuông đỏ, kiwi, bông cải xanh' },
  { label:'Vitamin D', pdfPage:254, examples:'Nấm maitake, cá hồi, cá hồi vân' },
  { label:'Vitamin E', pdfPage:255, examples:'Hạt hướng dương, hạnh nhân, hạt phỉ' },
  { label:'Omega-3', pdfPage:256, examples:'Cá trích, cá thu, vẹm' },
  { label:'Magie', pdfPage:259, examples:'Hạnh nhân, rau bina, đậu đen' },
] as const

export const LONGO_BOOK_CHAPTERS = [
  { chapter:'Chương 1', title:'Câu chuyện Molochio và lối sống trường thọ', pdfPage:14 },
  { chapter:'Chương 2', title:'Lão hóa, tuổi thọ lập trình và nghiên cứu sự trẻ hóa', pdfPage:29 },
  { chapter:'Chương 3', title:'Năm trụ cột bằng chứng', pdfPage:47 },
  { chapter:'Chương 4', title:'Chế độ ăn trường thọ', pdfPage:58 },
  { chapter:'Chương 5', title:'Vận động và sống khỏe lâu dài', pdfPage:91 },
  { chapter:'Chương 6', title:'FMD, kiểm soát cân nặng và an toàn', pdfPage:99 },
  { chapter:'Chương 7', title:'Ung thư: nghiên cứu dinh dưỡng và FMD', pdfPage:117 },
  { chapter:'Chương 8', title:'Đái tháo đường: dinh dưỡng và FMD', pdfPage:137 },
  { chapter:'Chương 9', title:'Sức khỏe tim mạch', pdfPage:157 },
  { chapter:'Chương 10', title:'Alzheimer và bệnh thoái hóa thần kinh', pdfPage:172 },
  { chapter:'Chương 11', title:'Bệnh viêm và tự miễn', pdfPage:190 },
  { chapter:'Chương 12', title:'Tổng hợp cách duy trì sức khỏe', pdfPage:205 },
  { chapter:'Phụ lục A', title:'Thực đơn mẫu 14 ngày', pdfPage:212 },
  { chapter:'Phụ lục B', title:'Nguồn thực phẩm cung cấp vitamin, khoáng chất', pdfPage:243 },
] as const
