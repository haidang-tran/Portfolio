# Design System — Ricard Llop Portfolio
> Phiên bản: 1.0 | Trạng thái: Hiện hành

Tài liệu này định nghĩa bộ quy tắc giao diện cá nhân áp dụng xuyên suốt toàn bộ trang portfolio. Phong cách nền tảng là **Apple-inspired minimalism** — ưu tiên không gian trắng, kiểu chữ rõ ràng, màu có chủ đích và sự tương tác có kiểm soát.

---

## 1. Triết lý Thiết kế

**Nguyên tắc cốt lõi:**

- **Có chủ đích.** Mỗi thành phần xuất hiện đều có lý do. Không đặt element để điền khoảng trống.
- **Rõ ràng trước, đẹp sau.** Thứ đọc được luôn quan trọng hơn thứ trông đẹp.
- **Kiệm lời, nặng ý.** Typography và khoảng trắng thể hiện cá tính — không cần màu sắc lòe loẹt.
- **Không có animation không cần thiết.** Chuyển động chỉ xuất hiện khi nó phản ánh một hành động hoặc trạng thái.
- **Nghiêm túc, không lạnh lùng.** Trang web của một người thật — không phải landing page SaaS.

---

## 2. Màu sắc (Color Tokens)

Màu được sử dụng có chủ đích, không trang trí. Accent color chỉ dùng để đánh dấu thông tin quan trọng hoặc trạng thái đang active — không dùng để làm đẹp.

### 2.1 Nền (Background)

| Token | Giá trị | Mục đích |
|---|---|---|
| `--bg` | `#000000` | Nền trang chính — True Black |
| `--bg-panel` | `#1D1D1F` | Card, sidebar, panel phụ |
| `--bg-hover` | `#2A2A2C` | Trạng thái hover của panel/card |

### 2.2 Chữ (Typography Colors)

| Token | Giá trị | Mục đích |
|---|---|---|
| `--text` | `#F5F5F7` | Nội dung chính — gần trắng, không thuần trắng |
| `--text-muted` | `#86868B` | Mô tả, metadata, placeholder |
| `--text-secondary` | `#A1A1A6` | Nội dung phụ cấp 2 |

### 2.3 Accent (Điểm nhấn — dùng có kiểm soát)

| Token | Giá trị | Mục đích |
|---|---|---|
| `--accent` | `#0071E3` | Link active, tag, trạng thái, badge |
| `--accent-subtle` | `rgba(0, 113, 227, 0.12)` | Background nhẹ để highlight |

> [!NOTE]
> Accent **không được dùng** cho: nút CTA chính, màu background section, hover glow trang trí. Chỉ dùng khi nó truyền tải thông tin (ví dụ: "mục này đang active").

### 2.4 Viền & Phân tách (Border)

| Token | Giá trị | Mục đích |
|---|---|---|
| `--border` | `rgba(255,255,255,0.10)` | Viền mặc định cho card, section divider |
| `--border-strong` | `rgba(255,255,255,0.20)` | Viền cần nổi bật hơn |

---

## 3. Typography

Font chữ là ngôn ngữ chính. Không cần icon pack hay màu sắc nếu font đủ rõ ràng.

### 3.1 Font Stack

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

- **Sans-serif** dùng cho toàn bộ nội dung đọc được.
- **Monospace** dùng cho: skill tag, code snippet, metadata kỹ thuật, date label, badge.

### 3.2 Tỷ lệ kích thước chữ

| Role | Giá trị | Ghi chú |
|---|---|---|
| Hero Title | `clamp(3rem, 10vw, 7rem)` | Responsive, không vỡ layout |
| Section Title (h2) | `clamp(2rem, 4vw, 3.5rem)` | Bắt đầu mỗi section lớn |
| Card Title (h3) | `1.5rem` | Trong Bento card hoặc Docs heading |
| Body | `1rem` (16px) | Văn bản đọc chính |
| Muted / Metadata | `0.85–0.9rem` | Font-mono được ưa tiên |
| Code / Tag | `0.75–0.85rem` | Luôn dùng JetBrains Mono |

### 3.3 Quy tắc chữ

- **Font weight:** Chỉ dùng `400` (regular), `600` (semibold), `700` (bold), `800` (display). Tránh dùng quá nhiều weight trong cùng một khối.
- **Letter-spacing:** Heading lớn dùng `-0.02em` đến `-0.04em` (kiểu Apple). Body không cần chỉnh.
- **Line-height:** Body `1.6–1.7`, Heading `1.0–1.1`.

---

## 4. Khoảng trắng (Spacing)

Trang này thở bằng khoảng trắng. Section padding lớn là có chủ đích — tạo cảm giác từng block nội dung tự đứng vững.

| Ngữ cảnh | Giá trị |
|---|---|
| Padding Section lớn (Hero, Skills) | `8rem` trên dưới |
| Padding Section nội dung | `5–6rem` trên dưới |
| Padding Docs Main content | `3rem 4rem` |
| Padding trong Card / Panel | `1.5–2rem` |
| Gap giữa các Card | `1.5rem` |
| Gap giữa các item trong list | `0.5–0.8rem` |

---

## 5. Thành phần UI (Components)

### 5.1 Navbar

- **Cố định (sticky)** ở trên cùng, không cuộn theo trang.
- **Blur background:** `backdrop-filter: blur(20px)` + `rgba(0,0,0,0.7)`.
- Chỉ chứa: Logo/Tên + Navigation links. **Không có button CTA** trên navbar.
- Link active đổi màu thành `--text`, không có underline, không có highlight background.

### 5.2 Navigation Links

- Không dùng button `<button>` cho điều hướng — dùng `<a>` thuần.
- Không dùng icon trong nav.
- Active state: chữ trắng (`--text`). Default: xám mờ (`--text-muted`).

### 5.3 Bento Card (Skill UI)

- `border-radius: 24px`.
- Background: `--bg-panel`.
- Viền mỏng `1px solid --border`.
- **Hover effect duy nhất được phép:** `translateY(-5px)` và `border-color` đổi sang `--border-strong`. Không có glow, không shadow quá lớn.
- Không có icon to lớn làm điểm nhấn — text là đủ.

### 5.4 Skill Tag

- Font: JetBrains Mono.
- Background: `rgba(255,255,255,0.10)`.
- Màu chữ: `--text`.
- `border-radius: 8px`, padding: `0.3rem 0.8rem`.
- **Không có border màu,** không có icon trước text.

### 5.5 Experience Item

- Fade-in từ dưới lên (`opacity 0→1`, `translateY 40px→0`) khi scroll vào khung hình.
- Animation chỉ chạy 1 lần khi phần tử xuất hiện. Không loop, không bounce.
- Tech stack hiển thị trong block `font-mono`, background `--bg-panel`, viền `--border`.

### 5.6 Docs Layout

- 3 cột: Sidebar trái cố định | Nội dung giữa | Table of Contents phải cố định.
- TOC highlight tự động khi scroll.
- Nội dung code: background `#151516`, không highlight syntax màu sắc phức tạp.
- Không có "Copy code" button nếu chưa cần thiết.

---

## 6. Những điều KHÔNG làm

| ❌ Tránh | ✅ Thay thế |
|---|---|
| Button "Download CV" / "Hire Me" to lớn | Link text đơn giản nếu cần |
| Gradient background nhiều màu cho section | Nền đen đồng nhất, dùng border để phân tách |
| Animation bounce, shake, pulse liên tục | Fade-in một lần duy nhất khi vào viewport |
| Icon pack (FontAwesome, Hero Icons, v.v.) | Skill tag text là đủ |
| Màu accent dùng làm trang trí section | Accent chỉ dùng cho active state & link |
| Shadow quá lớn, glow nhiều màu | `box-shadow` tối giản nếu cần |
| Progress bar % cho kỹ năng | Danh sách tech stack theo nhóm |
| Parallax phức tạp | Scroll fade-in đơn giản |
| Dark/Light mode toggle | Dark mode duy nhất, không có toggle |

---

## 7. Nguyên tắc viết nội dung (Content Voice)

- **Viết bằng tiếng Anh.** Portfolio hướng tới môi trường quốc tế.
- **Không dùng buzzword không có nội dung:** "passionate", "ninja", "guru", "rockstar".
- **Mỗi câu phải mang thông tin.** Bỏ câu như *"I am a dedicated professional who loves technology."*
- **Tên công ty, tên công nghệ** viết đúng format chính thức: `AWS`, `Kubernetes`, `ArgoCD` — không viết thường.
- **Ngày tháng:** Format `Mon. YYYY – Mon. YYYY` hoặc `Present`.
