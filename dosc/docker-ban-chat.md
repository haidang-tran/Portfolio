# DOCKER — HIỂU BẢN CHẤT, KHÔNG CHỈ HỌC LỆNH

> Đọc file này **trước** khi bắt đầu Phase C trong HUONG-DAN-THUC-HANH.md.
> Mục tiêu: hiểu Docker **hoạt động như thế nào** trước khi gõ lệnh đầu tiên.

---

## 1. Docker là gì — giải thích thật sự

### Vấn đề Docker giải quyết

Trước khi có Docker, câu chuyện thường là:

```
Developer A: "Trên máy tôi chạy được mà."
Developer B: "Trên máy tôi lỗi."
Server:      "Không biết gì luôn."
```

Nguyên nhân: mỗi máy có hệ điều hành khác nhau, phiên bản thư viện khác nhau, biến môi trường khác nhau.

Docker giải quyết bằng cách đóng gói **ứng dụng + mọi thứ nó cần** vào một đơn vị gọi là **container**.

Container đó chạy giống nhau trên máy bạn, máy đồng đội, và server.

---

## 2. Ba khái niệm cốt lõi

### Image — Bản thiết kế (blueprint)

Image là một file chỉ đọc (read-only) chứa:
- Hệ điều hành tối giản (ví dụ: Alpine Linux 5MB)
- Runtime (Node.js, Python, Java...)
- Code ứng dụng
- Dependencies
- Cấu hình khởi động

Hãy nghĩ Image như **một bản vẽ nhà**. Bản thân nó không chạy được — nó chỉ mô tả sẽ tạo ra gì.

```
Image = bản thiết kế (không thay đổi, có thể share)
```

### Container — Instance đang chạy

Container là Image **được khởi chạy**. Từ 1 Image, bạn có thể tạo ra 10 container đang chạy độc lập.

```
Container = ngôi nhà được xây từ bản vẽ (đang chạy, có thể tắt)
```

Mối quan hệ:
```
Image (bản vẽ)
  ↓ docker run
Container 1 (đang chạy, port 3001)
Container 2 (đang chạy, port 3002)
Container 3 (đang chạy, port 3003)
```

### Dockerfile — Công thức tạo Image

Dockerfile là file text mô tả **từng bước** để tạo ra Image.

```
Dockerfile (công thức)
  ↓ docker build
Image (bản vẽ)
  ↓ docker run
Container (đang chạy)
```

---

## 3. Layer System — Tại sao Docker nhanh

Image được tạo thành từ các **layer** chồng lên nhau. Mỗi lệnh trong Dockerfile tạo ra một layer mới.

```dockerfile
FROM node:20-alpine    # Layer 1: OS + Node
WORKDIR /app           # Layer 2: tạo thư mục
COPY package*.json ./  # Layer 3: copy file
RUN npm ci             # Layer 4: cài dependencies
COPY . .               # Layer 5: copy source code
CMD ["node", "src/index.js"]  # Layer 6: lệnh khởi chạy
```

**Tại sao quan trọng:**
- Docker cache từng layer riêng.
- Nếu Layer 1-3 không thay đổi → Docker dùng cache, không build lại.
- Nếu bạn thay đổi source code (Layer 5) → chỉ rebuild từ Layer 5 trở đi.

**Bài học:** Luôn để những thứ **ít thay đổi lên trên**, thứ **hay thay đổi xuống dưới**.

```dockerfile
# SAI: mỗi lần thay đổi code → cài lại dependencies (chậm)
COPY . .
RUN npm ci

# ĐÚNG: chỉ cài lại dependencies khi package.json thay đổi
COPY package*.json ./
RUN npm ci
COPY . .
```

---

## 4. Dockerfile thực tế — từng dòng giải thích

### Dockerfile cho Backend (Node.js)

```dockerfile
# Bước 1: Chọn base image
# node:20-alpine = Node.js 20 trên Alpine Linux (rất nhẹ, ~5MB)
# Thay vì node:20 (Debian, ~900MB)
FROM node:20-alpine

# Bước 2: Đặt thư mục làm việc bên trong container
# Mọi lệnh COPY, RUN sau này đều chạy trong /app
WORKDIR /app

# Bước 3: Copy ONLY file khai báo dependencies trước
# Tách riêng để tận dụng Docker cache
# Nếu package.json không đổi → layer này được cache
COPY package*.json ./

# Bước 4: Cài dependencies
# npm ci = clean install (nhanh hơn npm install, đúng với lockfile)
# --production = không cài devDependencies (giảm kích thước image)
RUN npm ci --production

# Bước 5: Copy source code
# Bước này hay thay đổi → để cuối cùng
COPY src/ ./src/

# Bước 6: Tạo user non-root (bảo mật)
# Mặc định container chạy với user root — nguy hiểm
# Nếu attacker escape container, họ sẽ là root trên host
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Bước 7: Khai báo port (chỉ để documentation, không thực sự mở)
EXPOSE 3001

# Bước 8: Lệnh chạy khi container khởi động
# CMD có thể bị override khi docker run
# ENTRYPOINT không bị override (dùng khi muốn ép buộc)
CMD ["node", "src/index.js"]
```

### Dockerfile cho Frontend (Multi-stage)

```dockerfile
# === STAGE 1: BUILD ===
# Stage này chỉ tồn tại để build — không vào image cuối
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build Vite → output ra thư mục dist/
RUN npm run build

# === STAGE 2: SERVE ===
# Image cuối chỉ chứa Nginx + file đã build
# Không có Node.js, không có source code, không có node_modules
FROM nginx:alpine

# Copy file đã build từ stage 1 sang stage 2
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy cấu hình Nginx tùy chỉnh (nếu có)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Tại sao multi-stage?**

| | Single-stage | Multi-stage |
|--|--|--|
| Image size | ~800MB (có Node, node_modules) | ~25MB (chỉ Nginx + dist) |
| Attack surface | Lớn | Nhỏ |
| Build tools trong production | Còn | Không có |

---

## 5. Docker Networking — traffic đi đâu

### Khi container chạy một mình

```
Internet
  ↓
Host (máy bạn) : port 8080
  ↓ (Docker NAT)
Container : port 80
```

Lệnh:
```bash
docker run -p 8080:80 nginx
#           ^^^^  ^^
#           host  container
```

Giải thích: "Khi có traffic vào port 8080 của host, chuyển vào port 80 của container."

### Khi nhiều container cần nói chuyện với nhau

Docker tạo ra một **virtual network** riêng. Các container trong cùng network có thể gọi nhau bằng **tên container** (không cần IP).

```
docker network: portfolio-network
  ├── container: frontend  → hostname "frontend"
  ├── container: backend   → hostname "backend"
  └── container: db        → hostname "db"
```

Từ container `backend`, gọi database:
```javascript
// KHÔNG làm thế này:
const host = "172.18.0.3"  // IP thay đổi mỗi lần restart

// Làm thế này:
const host = "db"  // Tên container, Docker tự resolve
```

### Port nào ra ngoài, port nào giữ trong

```
Internet
  |
  | port 80, 443 (public)
  |
Host
  |
  | Docker network (private)
  |
  ├── frontend:80  → expose ra host:8080
  ├── backend:3001 → KHÔNG expose ra ngoài (chỉ frontend gọi được)
  └── db:5432      → KHÔNG expose ra ngoài (chỉ backend gọi được)
```

---

## 6. Docker Compose — quản lý nhiều container

### Tại sao cần Compose

Chạy từng container bằng tay:
```bash
docker run -d --name db -e POSTGRES_PASSWORD=secret postgres:16
docker run -d --name backend --link db -e DB_HOST=db portfolio-be
docker run -d --name frontend --link backend portfolio-fe
```

→ Rất phức tạp, dễ sai, khó reproduce.

Compose:
```bash
docker compose up -d
```

→ Một lệnh, chạy hết. Ai cũng reproduce được.

### Cấu trúc docker-compose.yml giải thích rõ

```yaml
# Version không còn bắt buộc với Compose v2+
services:

  # === DATABASE ===
  db:
    image: postgres:16-alpine       # Dùng image có sẵn, không cần build
    container_name: portfolio-db
    environment:
      POSTGRES_DB: portfolio_db
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}   # Đọc từ file .env
    volumes:
      # Named volume: data tồn tại kể cả khi container bị xóa
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network
    # Không có "ports:" → db KHÔNG expose ra ngoài host
    # Chỉ backend trong cùng network mới gọi được

  # === BACKEND ===
  backend:
    build:
      context: ./backend            # Thư mục chứa Dockerfile
      dockerfile: ../docker/backend.Dockerfile
    container_name: portfolio-backend
    environment:
      DB_HOST: db                   # Tên service db ở trên
      DB_PORT: 5432
      DB_NAME: portfolio_db
      DB_USER: appuser
      DB_PASSWORD: ${DB_PASSWORD}
      PORT: 3001
    depends_on:
      db:
        condition: service_healthy  # Chờ db sẵn sàng, không chỉ started
    networks:
      - app-network
    # Không expose ra ngoài — chỉ frontend trong network gọi được
    # ports:
    #   - "3001:3001"   ← comment lại, chỉ bật khi debug

  # === FRONTEND ===
  frontend:
    build:
      context: ./frontend
      dockerfile: ../docker/frontend.Dockerfile
    container_name: portfolio-frontend
    ports:
      - "8080:80"                   # Expose ra host port 8080
    depends_on:
      - backend
    networks:
      - app-network

# Named volumes — tồn tại độc lập với container lifecycle
volumes:
  postgres_data:

# Custom network — tất cả service có thể gọi nhau bằng tên
networks:
  app-network:
    driver: bridge
```

### depends_on — chú ý quan trọng

`depends_on` chỉ đảm bảo **thứ tự khởi động**, không đảm bảo service đã **sẵn sàng nhận kết nối**.

```
db container started ≠ PostgreSQL đã sẵn sàng accept connection
```

Giải pháp: dùng `healthcheck`:
```yaml
db:
  image: postgres:16-alpine
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U appuser -d portfolio_db"]
    interval: 5s
    timeout: 5s
    retries: 5

backend:
  depends_on:
    db:
      condition: service_healthy   # Chờ healthcheck pass
```

---

## 7. Volumes — dữ liệu sống ở đâu

### Vấn đề

Container là **ephemeral** (tạm thời). Khi container bị xóa → mọi dữ liệu bên trong **mất hết**.

```
docker compose down        → container bị xóa
docker compose up -d       → container mới tạo, dữ liệu cũ không còn
```

### Giải pháp: Volumes

Volume là thư mục tồn tại **ngoài** container lifecycle, do Docker quản lý.

```
Named Volume: postgres_data
  └── Nằm ở: /var/lib/docker/volumes/postgres_data/_data
  └── Mount vào container tại: /var/lib/postgresql/data
  └── Tồn tại kể cả khi container bị xóa
  └── Chỉ mất khi chạy: docker volume rm postgres_data
```

### Phân biệt các loại mount

```yaml
volumes:
  # 1. Named Volume (khuyến nghị cho database)
  - postgres_data:/var/lib/postgresql/data

  # 2. Bind Mount (dùng khi dev — sync code từ host vào container)
  - ./backend/src:/app/src

  # 3. Anonymous Volume (tránh dùng — khó quản lý)
  - /app/node_modules
```

**Khi nào dùng cái nào:**
- **Named volume:** Database, file upload, bất cứ thứ gì cần persist
- **Bind mount:** Development — để live reload code mà không cần rebuild image
- **Production:** Không dùng bind mount — dùng named volume hoặc external storage

---

## 8. Các lệnh cần biết (và hiểu tại sao)

### Image

```bash
# Build image từ Dockerfile
docker build -t portfolio-be:v1 ./backend
#            ^ tên:tag          ^ context (thư mục)

# Xem danh sách image
docker images

# Xóa image
docker rmi portfolio-be:v1

# Xem lịch sử các layer của image
docker history portfolio-be:v1
```

### Container

```bash
# Chạy container
docker run -d \           # -d = detached (chạy nền)
  --name my-backend \     # đặt tên
  -p 3001:3001 \          # map port host:container
  -e NODE_ENV=production \ # biến môi trường
  portfolio-be:v1

# Xem container đang chạy
docker ps

# Xem tất cả (kể cả đã dừng)
docker ps -a

# Xem log
docker logs my-backend
docker logs -f my-backend  # -f = follow (real-time)

# Vào trong container (debug)
docker exec -it my-backend sh
#           ^^ interactive + tty

# Dừng / xóa container
docker stop my-backend
docker rm my-backend
```

### Compose

```bash
# Khởi động (build nếu chưa có image)
docker compose up -d

# Rebuild image rồi khởi động
docker compose up -d --build

# Xem trạng thái
docker compose ps

# Xem log tất cả service
docker compose logs -f

# Xem log một service
docker compose logs -f backend

# Dừng nhưng giữ container
docker compose stop

# Dừng và xóa container (giữ volume)
docker compose down

# Dừng, xóa container VÀ xóa volume (MẤT DATA)
docker compose down -v

# Chạy lệnh trong service đang chạy
docker compose exec backend sh
docker compose exec db psql -U appuser -d portfolio_db
```

### Network và Volume

```bash
# Xem các network
docker network ls

# Inspect network (xem container nào đang trong đó)
docker network inspect portfolio-system_app-network

# Xem các volume
docker volume ls

# Xem chi tiết volume (data ở đâu trên host)
docker volume inspect postgres_data
```

---

## 9. Debug thường gặp

### Container thoát ngay lập tức

```bash
docker compose up -d
docker compose ps  # thấy container "Exit 1"

# Xem nguyên nhân
docker compose logs backend
```

Nguyên nhân thường gặp:
- Biến môi trường thiếu → app crash
- Port bị chiếm
- File không tồn tại trong image

### Backend không kết nối được DB

Kiểm tra theo thứ tự:
```bash
# 1. DB có chạy không?
docker compose ps db

# 2. DB healthcheck pass chưa?
docker inspect portfolio-db | grep -A 10 "Health"

# 3. Vào backend container, thử kết nối thủ công
docker compose exec backend sh
# Trong container:
nc -zv db 5432   # test TCP connection tới db:5432
```

### Thay đổi code không có tác dụng

```bash
# Rebuild image
docker compose up -d --build backend

# Hoặc nếu dùng bind mount khi dev:
# Code thay đổi sẽ tự động reflect (không cần rebuild)
```

---

## 10. Checklist trước khi làm Phase C

Trả lời những câu này trước khi mở terminal:

- [ ] Image và Container khác nhau như thế nào?
- [ ] Dockerfile layer cache hoạt động ra sao?
- [ ] Tại sao đặt `COPY package*.json` trước `COPY . .`?
- [ ] Container A gọi Container B bằng hostname gì?
- [ ] Port 5432 của DB có ra ngoài internet không? Tại sao?
- [ ] `docker compose down` có xóa data trong DB không?
- [ ] `docker compose down -v` có xóa data không?
- [ ] Multi-stage build giúp gì?
- [ ] Tại sao không chạy app với user root trong container?

Trả lời được hết → bắt đầu code Phase C.
