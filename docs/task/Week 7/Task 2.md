# Task 2 - Design System, Responsive & Accessibility Hardening

**Owner:** Thành viên 2  
**Reviewer:** Thành viên 4  
**Branch:** `feature/w7-t2-design-accessibility`

## Mục tiêu
Chuẩn hóa UI thành design system đủ dùng cho project thay vì mỗi page tự định nghĩa style.

## Design foundations
- typography tokens;
- spacing scale;
- radii;
- border/shadow;
- semantic colors;
- focus states;
- breakpoint strategy.

Giữ visual identity hiện có: botanical green, ivory/paper, restrained champagne, Cormorant Garamond + Manrope.

## Shared components
Chuẩn hóa các component có giá trị tái sử dụng:
- Button;
- Input/Select/Textarea;
- FormField;
- Card;
- Badge/Status;
- Modal/Confirm;
- EmptyState;
- Skeleton;
- Alert/ProblemMessage;
- Pagination.

Không tạo component abstraction nếu chỉ dùng một lần.

## Accessibility
- keyboard navigation;
- visible focus;
- semantic labels;
- form errors linked đúng;
- heading hierarchy;
- contrast;
- reduced-motion support;
- responsive touch targets.

## Responsive
Kiểm tra:
- mobile;
- tablet;
- desktop;
- long text;
- empty state;
- validation state;
- admin tables.

## Testing
- component behavior.
- keyboard flow.
- focus trap modal.
- responsive screenshots/manual matrix.
- reduced motion.
- form label/error semantics.

## Definition of Done
Main screens dùng shared foundations/components hợp lý và sử dụng được bằng keyboard ở các flow chính.
