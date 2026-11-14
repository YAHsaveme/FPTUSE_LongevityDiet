import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CalendarDays, FileCheck2, HeartPulse, Leaf, ShieldAlert } from 'lucide-react'
import {
  LONGO_BOOK, LONGO_BOOK_CHAPTERS, LONGO_BOOK_MICRONUTRIENTS,
  LONGO_BOOK_RULES, LONGO_BOOK_TWO_WEEK_MEALS,
} from './bookReferenceData'
import './bookReference.css'

export function BookReferencePage() {
  const [week, setWeek] = useState<1 | 2>(1)
  const [selectedDay, setSelectedDay] = useState(1)
  const day = LONGO_BOOK_TWO_WEEK_MEALS.find(item => item.week === week && item.day === selectedDay)!

  return (
    <main className="book-ref-page">
      <div className="book-ref-shell">
        <header className="book-ref-top">
          <Link to="/catalog" className="book-ref-back">← Về danh mục</Link>
          <span className="book-ref-eyebrow"><BookOpen size={16} /> TÀI LIỆU NỀN TẢNG CỦA DỰ ÁN</span>
          <h1>Tra cứu kiến thức từ sách <em>Chế độ ăn trường thọ</em></h1>
          <p>
            Những nội dung dưới đây là bản lược giải tiếng Việt được đối chiếu với
            <strong> The Longevity Diet</strong> của <strong>Valter Longo, PhD</strong> (2018).
            Mỗi nguyên tắc và bữa mẫu đều có vị trí trong bản PDF gốc để bạn kiểm tra lại.
          </p>
          <div className="book-ref-facts">
            <span><FileCheck2 size={15} /> Sách phát hành năm {LONGO_BOOK.publicationYear}</span>
            <span><BookOpen size={15} /> {LONGO_BOOK.pdfPages} trang PDF</span>
            <span>ISBN {LONGO_BOOK.isbn}</span>
          </div>
          <p className="book-ref-attribution">
            <strong>Vai trò của tác giả:</strong> Valter Longo là tác giả và nguồn nghiên cứu được dẫn chiếu;
            ông không tham gia tư vấn trực tiếp, duyệt thực đơn hay bảo trợ ứng dụng này.
          </p>
        </header>

        <div className="book-ref-alert" role="note">
          <ShieldAlert size={23} />
          <div>
            <strong>Không tự áp dụng FMD hoặc thực đơn hạn chế cho người có bệnh lý.</strong>
            <p>
              Chương 6 (trang PDF 112–115) nhấn mạnh việc sàng lọc, giám sát phù hợp, thuốc đang sử dụng
              và nguy cơ của chế độ mô phỏng nhịn ăn. Các bữa của Phụ lục A là thực đơn minh họa
              cho một nhóm thể trạng nhất định, không phải đơn điều trị cho mọi người.
            </p>
          </div>
        </div>

        <section className="book-ref-section" aria-labelledby="book-rules-title">
          <div className="book-ref-heading">
            <Leaf size={22} />
            <div><span>CHƯƠNG 4</span><h2 id="book-rules-title">9 nguyên tắc cần đối chiếu</h2></div>
          </div>
          <div className="book-ref-rules">
            {LONGO_BOOK_RULES.map((rule, i) => (
              <article key={rule.id} className="book-ref-rule">
                <div className="book-ref-rule-top"><span className="book-ref-count">{i + 1}</span><h3>{rule.title}</h3></div>
                <p>{rule.explanation}</p>
                <small>Trang PDF {rule.pdfPages} · {rule.scope}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="book-ref-section" aria-labelledby="book-meals-title">
          <div className="book-ref-heading">
            <CalendarDays size={22} />
            <div><span>PHỤ LỤC A — TRANG PDF 212–242</span><h2 id="book-meals-title">Thực đơn tham khảo 14 ngày trong sách</h2></div>
          </div>
          <p className="book-ref-intro">
            Đây là tên các bữa được <strong>diễn giải bằng tiếng Việt</strong>, không phải công thức đầy đủ.
            Định lượng nguyên liệu và hướng dẫn chuẩn nằm ở trang tương ứng của sách.
            Không suy ra kcal, đạm hay khẩu phần chính xác từ tên món.
          </p>
          <div className="book-ref-controls" aria-label="Chọn tuần và ngày trong sách">
            <button type="button" className={week === 1 ? 'selected' : ''}
              onClick={() => { setWeek(1); setSelectedDay(1) }}>Tuần thứ nhất</button>
            <button type="button" className={week === 2 ? 'selected' : ''}
              onClick={() => { setWeek(2); setSelectedDay(1) }}>Tuần thứ hai</button>
          </div>
          <div className="book-ref-days">
            {Array.from({ length: 7 }, (_, i) => i + 1).map(n => (
              <button key={n} type="button" className={n === selectedDay ? 'selected' : ''}
                onClick={() => setSelectedDay(n)} aria-pressed={n === selectedDay}>Ngày {n}</button>
            ))}
          </div>
          <article className="book-ref-day-card" aria-live="polite">
            <div className="book-ref-day-heading">
              <h3>Tuần {week}, ngày {selectedDay}</h3>
              <span>Tham chiếu bắt đầu: trang PDF {day.pdfPage}</span>
            </div>
            <div className="book-ref-meal-grid">
              <div><small>BỮA SÁNG</small><p>{day.breakfast}</p><span>Trang {day.pdfPage}</span></div>
              <div><small>BỮA TRƯA</small><p>{day.lunch}</p><span>Trang {day.lunchPdfPage}</span></div>
              <div><small>BỮA PHỤ</small><p>{day.snack}</p><span>Theo thực đơn ngày trong Phụ lục A</span></div>
              <div><small>BỮA TỐI</small><p>{day.dinner}</p><span>Trang {day.dinnerPdfPage}</span></div>
            </div>
            {day.fishOrSeafood && <p className="book-ref-fish-note">Bữa này có cá hoặc hải sản trong bản sách; phải kiểm tra dị ứng, thành phần và giới hạn tần suất trước khi sử dụng.</p>}
          </article>
          <p className="book-ref-footnote">
            Phụ lục A (trang PDF 212–214) mô tả mẫu khoảng 1.700–1.800 kcal/ngày cho một đối tượng tham chiếu;
            tác giả yêu cầu điều chỉnh theo tuổi, cân nặng, nhu cầu năng lượng và vận động.
            Không mặc định áp dụng mức năng lượng này cho người dùng ứng dụng.
          </p>
        </section>

        <section className="book-ref-section" aria-labelledby="book-vitamins-title">
          <div className="book-ref-heading">
            <HeartPulse size={22} />
            <div><span>PHỤ LỤC B</span><h2 id="book-vitamins-title">Tra cứu nguồn vi chất</h2></div>
          </div>
          <p className="book-ref-intro">Trang gốc có bảng thực phẩm và lượng vi chất theo khẩu phần. Số lượng có thể thay đổi do giống, cách chế biến và thương hiệu; đây không phải khuyến nghị uống bổ sung dành riêng cho bạn.</p>
          <div className="book-ref-micronutrients">
            {LONGO_BOOK_MICRONUTRIENTS.map(item => (
              <div key={item.label}><strong>{item.label}</strong><span>Ví dụ trong sách: {item.examples}</span><span>PDF trang {item.pdfPage}</span></div>
            ))}
          </div>
        </section>

        <section className="book-ref-section" aria-labelledby="book-chapters-title">
          <div className="book-ref-heading">
            <BookOpen size={22} />
            <div><span>THƯ MỤC ĐỐI CHIẾU</span><h2 id="book-chapters-title">Vị trí 12 chương và 2 phụ lục</h2></div>
          </div>
          <div className="book-ref-chapters">
            {LONGO_BOOK_CHAPTERS.map(item => (
              <div key={item.chapter}><strong>{item.chapter}</strong><span>{item.title}</span><small>PDF trang {item.pdfPage}</small></div>
            ))}
          </div>
        </section>

        <footer className="book-ref-footer">
          <p><strong>Quy tắc chứng cứ:</strong> Không gắn nhãn “công thức gốc của tác giả” cho món ăn do nhóm tự xây dựng; không tự dựng số liệu dinh dưỡng,
            không đưa dữ liệu sức khỏe người dùng vào prompt AI và không sử dụng sách như giấy phép điều trị hoặc chứng nhận chuyên môn.</p>
          <Link to="/planner">Về thực đơn cá nhân →</Link>
        </footer>
      </div>
    </main>
  )
}
