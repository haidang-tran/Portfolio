# HƯỚNG DẪN THỰC HÀNH — TẦNG 2

> Đây là hướng dẫn từng bước để bạn **tự làm**. Mỗi bước có mục tiêu rõ, câu hỏi kiểm tra bản thân, và dấu hiệu biết mình xong.
> Không cần làm nhanh. Làm chắc từng bước.

---

## Cách dùng tài liệu này

- Mỗi bước → đọc **Mục tiêu** trước.
- Làm xong → tự trả lời **Câu hỏi kiểm tra**.
- Trả lời được hết → tick `[ ]` → sang bước kế.
- Bị kẹt → tra cứu, thử lại. Không nhờ AI làm thay.

---

## PHASE A — Chuẩn hóa Project (Git + Cấu trúc thư mục)

> Mục đích: Trước khi đụng Docker hay CI/CD, phải có một project sạch, cấu trúc đúng, git commit rõ ràng.

### Bước A1 — Tạo repo GitHub mới

**Việc cần làm:**
- Tạo repo `portfolio-system` trên GitHub (private hoặc public tùy bạn).
- Clone về máy.
- Tạo cấu trúc thư mục ban đầu:

```
portfolio-system/
├── frontend/          ← React/Vite portfolio hiện tại
├── backend/           ← Node.js API (chưa có → tạo sau)
├── docker/            ← Dockerfile các service
├── nginx/             ← Cấu hình Nginx (sau)
├── docs/              ← Tài liệu
└── .github/
    └── workflows/     ← CI/CD (sau)
```

**Câu hỏi tự kiểm tra:**
- [ ] Repo có trên GitHub chưa?
- [ ] Clone về máy chạy được không?
- [ ] Thư mục `frontend/` chứa code Vite hiện tại chưa?
- [ ] Commit đầu tiên có message rõ ràng không? (vd: `chore: init project structure`)

---

### Bước A2 — Git workflow chuẩn

**Việc cần làm:**
- Tạo nhánh `main` là nhánh bảo vệ (production).
- Mọi thay đổi đi qua nhánh feature, ví dụ: `feat/add-backend`.
- Tập viết commit message theo quy tắc:

```
feat:     thêm tính năng mới
fix:      sửa lỗi
chore:    cấu hình, tooling
docs:     tài liệu
ci:       CI/CD
refactor: tái cấu trúc
```

**Câu hỏi tự kiểm tra:**
- [ ] Có biết `git branch`, `git checkout -b`, `git merge` không?
- [ ] Thử tạo nhánh `feat/test-branch`, commit gì đó, merge vào `main` chưa?
- [ ] Xoá nhánh sau khi merge được không?

---

## PHASE B — Backend API (Node.js + Express)

> Mục đích: Portfolio hiện tại là static. Phase này thêm backend thật — API đơn giản để có gì đó cần Docker, CI/CD, và database sau này.

### Bước B1 — Tạo Express API cơ bản

**Việc cần làm:**
- Vào thư mục `backend/`.
- Khởi tạo Node.js project: `npm init -y`
- Cài Express: `npm install express`
- Tạo file `src/index.js` với route đơn giản:

```
GET /health    → { status: "ok", timestamp: ... }
GET /api/info  → thông tin cơ bản (tên, vị trí, etc.)
```

- Chạy được bằng `node src/index.js`.

**Câu hỏi tự kiểm tra:**
- [ ] Gõ `curl http://localhost:3001/health` ra JSON không?
- [ ] Hiểu `app.get()`, `res.json()` là gì chưa?
- [ ] File `package.json` có script `start` chưa?

---

### Bước B2 — Thêm PostgreSQL

**Việc cần làm:**
- Cài PostgreSQL local (hoặc dùng Docker để chạy thử).
- Tạo database `portfolio_db`, user riêng (không dùng `postgres` root).
- Dùng thư viện `pg` hoặc `knex` để kết nối.
- Tạo bảng đơn giản (ví dụ: `feedbacks` — tên, vị trí, message).
- API có thêm route:

```
POST /api/feedback   → lưu vào DB
GET  /api/feedbacks  → trả về danh sách
```

**Câu hỏi tự kiểm tra:**
- [ ] Kết nối DB thành công chưa?
- [ ] Gửi POST → dữ liệu có vào DB không? (kiểm tra bằng `psql` hoặc DBeaver)
- [ ] GET → có trả về đúng không?
- [ ] Database credentials có nằm trong `.env` không? (không commit vào git)
- [ ] File `.env` đã thêm vào `.gitignore` chưa?

---

### Bước B3 — Cấu hình biến môi trường đúng cách

**Việc cần làm:**
- Tạo file `.env.example` (commit vào git, không có giá trị thật):

```
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
PORT=
```

- File `.env` thật → KHÔNG commit.
- Backend đọc từ `process.env.*`.

**Câu hỏi tự kiểm tra:**
- [ ] Nếu tôi xoá file `.env` và chạy lại, app báo lỗi rõ ràng (không crash im lặng)?
- [ ] `git status` không thấy `.env` không?

---

## PHASE C — Docker hóa toàn bộ hệ thống

> Mục đích: Mọi thứ chạy trong container. Không phụ thuộc môi trường máy.

### Bước C1 — Dockerfile cho Frontend

**Việc cần làm:**
- Tạo `docker/frontend.Dockerfile`.
- Stage 1 (`builder`): cài deps, build Vite.
- Stage 2: Nginx serve file tĩnh từ `/usr/share/nginx/html`.

Multi-stage Dockerfile cơ bản:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

**Câu hỏi tự kiểm tra:**
- [ ] Build image thành công không? (`docker build -f docker/frontend.Dockerfile -t portfolio-fe .`)
- [ ] Chạy container và vào `localhost:8080` thấy web không?
- [ ] Image size có hợp lý không (< 50MB)?
- [ ] Hiểu tại sao cần multi-stage không?

---

### Bước C2 — Dockerfile cho Backend

**Việc cần làm:**
- Tạo `docker/backend.Dockerfile`.
- Chú ý:
  - Dùng `node:20-alpine` để nhẹ.
  - Chỉ copy file cần thiết (không copy `node_modules`).
  - Dùng `npm ci --production` trong container.
  - Chạy với user non-root (bảo mật).

**Câu hỏi tự kiểm tra:**
- [ ] Build image thành công không?
- [ ] Container chạy và `/health` trả về `ok` không?
- [ ] Container chạy với user gì? (`docker exec <container> whoami`)

---

### Bước C3 — Docker Compose

**Việc cần làm:**
- Tạo `docker-compose.yml` ở root.
- 3 services: `db`, `backend`, `frontend`.
- `backend` `depends_on: [db]`.
- `frontend` `depends_on: [backend]`.
- Chạy toàn bộ: `docker compose up -d`
- Tắt: `docker compose down`

**Câu hỏi tự kiểm tra:**
- [ ] `docker compose up` → cả 3 container chạy không?
- [ ] Frontend kết nối được Backend không?
- [ ] Backend kết nối được DB không?
- [ ] Restart container `backend` → DB có mất data không? Nếu mất → chưa dùng volume đúng.
- [ ] `docker compose logs backend` in ra gì?

---

### Bước C4 — Hiểu Docker Networking (không phải code, là hiểu)

Tự vẽ sơ đồ trả lời:
- Container `frontend` gọi `backend` bằng địa chỉ gì?
- Container `backend` gọi `db` bằng địa chỉ gì?
- Port nào expose ra host? Port nào chỉ nội bộ?

**Câu hỏi tự kiểm tra:**
- [ ] Tôi giải thích được Docker bridge network là gì không?
- [ ] Tôi biết khác nhau giữa `ports` và `expose` trong compose không?

---

## PHASE D — CI/CD với GitHub Actions

> Mục đích: Mỗi lần push code → pipeline tự chạy test → build image → push lên registry.

### Bước D1 — Pipeline cơ bản (test + build)

**Việc cần làm:**
- Tạo `.github/workflows/ci.yml`.
- Pipeline chạy khi push lên nhánh `main`:

```
Trigger: push to main
  Step 1: Checkout code
  Step 2: Setup Node
  Step 3: Install deps
  Step 4: Run lint
  Step 5: Run tests
  Step 6: Build (nếu test pass)
```

**Câu hỏi tự kiểm tra:**
- [ ] Push code → GitHub Actions tab có pipeline chạy không?
- [ ] Nếu cố tình sửa test để fail → pipeline dừng ở step test không?
- [ ] Có thể đọc log từng step không?

---

### Bước D2 — Build và Push Docker Image lên Registry

**Việc cần làm:**
- Chọn registry: GitHub Container Registry (`ghcr.io`) hoặc Docker Hub.
- Thêm step vào pipeline: login → build → tag bằng commit SHA → push.
- Lưu secret vào GitHub Settings → Secrets and variables → Actions.
- Trong workflow dùng: `${{ secrets.REGISTRY_TOKEN }}`.
- Tag image: `ghcr.io/username/portfolio-be:${GITHUB_SHA}` — KHÔNG dùng `latest`.

**Câu hỏi tự kiểm tra:**
- [ ] Pipeline push thành công → thấy image trên registry không?
- [ ] Image được tag bằng commit SHA không?
- [ ] Xem file `ci.yml` → không có token thật không?
- [ ] Tôi giải thích được tại sao không dùng tag `latest` trong production không?

---

## PHASE E — Deploy lên Linux Server (bắt đầu bằng WSL)

> **Chiến lược:**
> - **Bây giờ:** Dùng WSL làm "server" test local — miễn phí, không cần mạng, học được 90% kỹ năng.
> - **Sau này:** Chuyển sang EC2 / VPS — chỉ đổi địa chỉ host, còn lại giữ nguyên.

---

### Bước E0 — Chuẩn bị WSL

**Việc cần làm:**

Mở PowerShell (Admin):
```
wsl --install -d Ubuntu
wsl --list --verbose
```

Phải thấy Ubuntu chạy với **VERSION 2**.

Nếu thấy VERSION 1:
```
wsl --set-version Ubuntu 2
```

**Câu hỏi tự kiểm tra:**
- [ ] `wsl -d Ubuntu` mở được terminal Ubuntu không?
- [ ] Trong Ubuntu, gõ `uname -r` thấy kernel Linux không?
- [ ] `wsl --list --verbose` thấy VERSION 2 không?

---

### Bước E1 — Cấu hình WSL như Linux Server thật

**Trong terminal Ubuntu (WSL), lần lượt làm:**

**1. Update hệ thống:**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git
```

**2. Tạo user deploy riêng:**
```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
```

> Tại sao cần user riêng? Khi chạy trên server thật, không bao giờ dùng user mặc định hay root để chạy app. Tập thói quen này ngay từ WSL.

**3. Cài Docker trong WSL:**
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo usermod -aG docker deploy
```

Sau đó **đóng terminal và mở lại** (để group có hiệu lực).

Kiểm tra:
```bash
docker run hello-world
```

Thấy "Hello from Docker!" → thành công.

**4. Cài ufw (firewall):**
```bash
sudo apt install ufw
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
sudo ufw status
```

> Trong WSL, ufw không thực sự filter traffic từ Windows như server thật. Nhưng cứ tập — khi lên EC2 cùng lệnh, cùng logic, không cần học lại.

**Câu hỏi tự kiểm tra:**
- [ ] `docker run hello-world` thành công không?
- [ ] `docker ps` chạy được không cần `sudo` không?
- [ ] User `deploy` tồn tại và `sudo ls /root` được không?
- [ ] `sudo ufw status` thấy các rule 22, 80, 443 không?

---

### Bước E2 — Hiểu network giữa WSL và Windows

**Việc cần làm (hiểu trước khi làm):**

Trong WSL:
```bash
ip addr show eth0
hostname -I
```

Ghi lại IP, ví dụ: `172.28.16.5`

Trong PowerShell Windows:
```powershell
ipconfig
# Tìm adapter "vEthernet (WSL)"
```

Thử từ PowerShell:
```powershell
curl http://172.28.16.5:3001/health
# hoặc
curl http://localhost:3001/health
```

Vẽ sơ đồ (bằng tay, giấy hoặc file txt):
```
Windows Host
  ├── localhost:3001 → forward vào → WSL:3001
  └── 172.28.16.5:3001 → trực tiếp vào WSL:3001

WSL (Ubuntu)
  └── container backend chạy port 3001
```

**Câu hỏi tự kiểm tra:**
- [ ] IP của WSL là bao nhiêu?
- [ ] Từ Windows, curl vào WSL được không?
- [ ] Tôi giải thích được tại sao IP WSL thay đổi mỗi lần restart Windows không?
- [ ] Localhost từ Windows có vào được WSL không?

---

### Bước E3 — Clone repo và chạy Docker Compose trong WSL

**Quan trọng:** Clone code vào trong WSL filesystem, không dùng `/mnt/d/`.

> Lý do: Docker volume trên `/mnt/d/` (Windows filesystem) rất chậm vì phải qua lớp dịch dữ liệu. Code trong WSL filesystem (`~/`) nhanh hơn nhiều.

```bash
# Trong WSL
cd ~
git clone https://github.com/username/portfolio-system.git
cd portfolio-system
```

Tạo file `.env`:
```bash
cp backend/.env.example backend/.env
nano backend/.env
# Điền giá trị thật
```

Chạy:
```bash
docker compose up -d
docker compose ps
```

Kiểm tra từng service:
```bash
# Kiểm tra backend
curl http://localhost:3001/health

# Kiểm tra database
docker compose exec db psql -U appuser -d portfolio_db -c "\dt"

# Xem log nếu có lỗi
docker compose logs backend
docker compose logs db
```

**Câu hỏi tự kiểm tra:**
- [ ] `docker compose ps` thấy 3 container đang `Up` không?
- [ ] `curl http://localhost:3001/health` trong WSL trả về `ok` không?
- [ ] Từ Windows browser, vào `http://localhost:8080` thấy frontend không?
- [ ] `docker compose logs db` không có error không?
- [ ] Restart container backend → data trong DB vẫn còn không?

---

### Bước E4 — Giả lập SSH deploy (tập đúng quy trình)

> Mục đích: tập toàn bộ flow deploy qua SSH. Khi chuyển sang EC2 chỉ đổi địa chỉ host.

**1. Cài SSH server trong WSL:**
```bash
sudo apt install openssh-server
sudo service ssh start

# Kiểm tra đang chạy
sudo service ssh status
```

**2. Cấu hình SSH:**
```bash
sudo nano /etc/ssh/sshd_config
```

Tìm và sửa (hoặc thêm):
```
PubkeyAuthentication yes
PasswordAuthentication no
PermitRootLogin no
```

Restart SSH:
```bash
sudo service ssh restart
```

**3. Tạo SSH key trên Windows (PowerShell):**
```powershell
ssh-keygen -t ed25519 -C "deploy-key" -f "$env:USERPROFILE\.ssh\wsl_deploy"
# Nhấn Enter để không đặt passphrase
```

**4. Copy public key vào WSL:**
```bash
# Trong WSL, chuyển sang user deploy
su - deploy
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

Từ PowerShell, lấy nội dung public key:
```powershell
Get-Content "$env:USERPROFILE\.ssh\wsl_deploy.pub"
```

Copy nội dung đó, paste vào WSL:
```bash
echo "paste-public-key-here" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**5. Test SSH từ Windows:**
```powershell
$wslIp = (wsl hostname -I).Trim().Split(" ")[0]
ssh -i "$env:USERPROFILE\.ssh\wsl_deploy" deploy@$wslIp
```

Kết nối được không cần password → thành công.

**6. Script deploy thủ công (không cần CI/CD trước):**

Tạo file `scripts/deploy.sh` trong repo:
```bash
#!/bin/bash
set -e

echo "==> Pulling latest code..."
git pull origin main

echo "==> Pulling new images..."
docker compose pull

echo "==> Restarting services..."
docker compose up -d --remove-orphans

echo "==> Checking health..."
sleep 5
curl -f http://localhost:3001/health && echo "Backend OK" || echo "Backend FAIL"

echo "==> Done."
```

Chạy deploy từ Windows qua SSH:
```powershell
$wslIp = (wsl hostname -I).Trim().Split(" ")[0]
ssh -i "$env:USERPROFILE\.ssh\wsl_deploy" deploy@$wslIp "cd ~/portfolio-system && bash scripts/deploy.sh"
```

**Câu hỏi tự kiểm tra:**
- [ ] SSH vào WSL bằng key, không cần password, được không?
- [ ] `PasswordAuthentication no` có hiệu lực chưa? (Thử SSH không có key → phải bị từ chối)
- [ ] Script deploy.sh chạy được từ Windows qua SSH không?
- [ ] Sau khi deploy, thay đổi trong code có được apply không?

---

### Bước E5 — Khi chuyển sang EC2 / VPS thật

Đây là bảng so sánh — nhìn vào để thấy gần như không có gì thay đổi:

| Thành phần | WSL (bây giờ) | EC2 / VPS (sau này) |
|---|---|---|
| `DEPLOY_HOST` | IP của WSL | IP public của EC2 |
| SSH key setup | Bước E4 trên | Dùng key pair của EC2 |
| Firewall | `ufw` | `ufw` + AWS Security Group |
| Cài Docker | Bước E1 | Cùng lệnh trên EC2 |
| Docker Compose | Giống hệt | Giống hệt |
| Script deploy.sh | Giống hệt | Giống hệt |
| Nginx + HTTPS | Phase F trên WSL | Phase F trên EC2 (thêm domain thật) |

> Toàn bộ kỹ năng từ WSL dùng lại 100% trên server thật.

---## PHASE F — Nginx + Domain + HTTPS

### Bước F1 — Cài Nginx reverse proxy

**Việc cần làm:**
- Cài Nginx: `sudo apt install nginx`
- Cấu hình reverse proxy:
  - `/` → frontend container
  - `/api/` → backend container
- Không expose container port trực tiếp ra internet.

**Câu hỏi tự kiểm tra:**
- [ ] `curl http://yourdomain.com` trả về frontend không?
- [ ] `curl http://yourdomain.com/api/health` trả về `ok` không?
- [ ] Tôi giải thích được reverse proxy là gì không?

---

### Bước F2 — HTTPS với Let's Encrypt (Certbot)

**Việc cần làm:**
- Cài Certbot: `sudo apt install certbot python3-certbot-nginx`
- Chạy: `sudo certbot --nginx -d yourdomain.com`
- Kiểm tra auto-renewal: `sudo certbot renew --dry-run`

**Câu hỏi tự kiểm tra:**
- [ ] `https://yourdomain.com` hoạt động không?
- [ ] `http://` tự redirect sang `https://` không?
- [ ] PostgreSQL có expose ra internet không? (Không được)

---

## PHASE G — Monitoring và Logging

### Bước G1 — Monitoring cơ bản → Prometheus + Grafana

Bắt đầu đơn giản:
- `htop`, `docker stats` để xem resource.
- Script bash check health endpoint mỗi 5 phút.

Sau đó:
- Thêm Prometheus + Grafana vào docker-compose.
- Dashboard tối thiểu: CPU, RAM, request count, error rate.

**Câu hỏi tự kiểm tra:**
- [ ] Tôi biết CPU/RAM của mỗi container hiện tại không?
- [ ] Nếu container backend chết, tôi biết trong vòng bao lâu?
- [ ] Grafana dashboard có ít nhất 3 panel không?

---

### Bước G2 — Logging

- Đọc log đúng cách: `docker logs`, `journalctl`.
- Cấu hình Nginx access log format rõ (response time, status code, IP).
- Tùy chọn: thêm Loki để xem log tập trung trong Grafana.

**Câu hỏi tự kiểm tra:**
- [ ] Khi tôi gửi request lỗi (404, 500), log ở đâu?
- [ ] `/var/log/auth.log` có ai đang thử SSH vào không?

---

## PHASE H — Kết nối vào SOC Home Lab (Wazuh)

### Bước H1 — Cài Wazuh Agent trên Web Server

- Wazuh Manager đã chạy trên SOC Lab.
- Cài Wazuh Agent trên Linux server.
- Kết nối Agent → Manager.

**Câu hỏi tự kiểm tra:**
- [ ] Wazuh Dashboard thấy agent ở trạng thái Active không?
- [ ] Khi SSH vào server, có alert trên Wazuh không?
- [ ] Nginx access log được Wazuh đọc không?

---

### Bước H2 — Cấu hình Wazuh đọc log ứng dụng

- Cấu hình agent đọc: Nginx log, Docker events, Backend log.
- Tạo custom rule: alert khi có nhiều 401 liên tiếp.

**Câu hỏi tự kiểm tra:**
- [ ] Gửi 10 request sai password liên tiếp → Wazuh có alert không?
- [ ] Wazuh thấy Docker container start/stop event không?

---

## PHASE I — Web Security Testing (chỉ trên lab của mình)

Với mỗi loại lỗ hổng, học theo thứ tự:
**Hiểu → Tấn công trong lab → Phát hiện trong log → Sửa**

| # | Loại | Công cụ thử | Cách fix |
|---|------|-------------|----------|
| 1 | SQL Injection | sqlmap, thử tay | Parameterized query |
| 2 | XSS | Browser DevTools | Output encoding, CSP header |
| 3 | Broken Authentication | Burp Suite | Rate limit, lockout |
| 4 | IDOR | thử tay đổi ID | Authorization check |
| 5 | CSRF | Burp / thử tay | CSRF token |
| 6 | File Upload | Upload file PHP | Validate type + content |

**Câu hỏi tự kiểm tra (sau mỗi loại):**
- [ ] Tôi khai thác được lỗ hổng này trong lab không?
- [ ] Log/Wazuh có phát hiện cuộc tấn công không?
- [ ] Tôi fix được không? Fix xong tấn công có còn được không?

---

## PHASE J — DevSecOps: Security vào CI/CD Pipeline

Thêm từng cái theo thứ tự ưu tiên:

**1. Secret Scanning** (ưu tiên cao nhất)
- Dùng `gitleaks` hoặc GitHub secret scanning.
- Pipeline fail nếu phát hiện token/password trong code.

**2. Dependency Scanning**
- `npm audit` cho Node.js.
- Hoặc `trivy` scan dependencies.

**3. SAST**
- `eslint` với security rules.
- Hoặc `semgrep` free tier.

**4. Container Image Scanning**
- Sau khi build image → `trivy image portfolio-be:latest`
- Pipeline fail nếu có lỗ hổng CRITICAL.

**Câu hỏi tự kiểm tra:**
- [ ] Commit "fake secret" → pipeline có bắt không?
- [ ] `trivy image` trả về bao nhiêu lỗ hổng?
- [ ] Đã fix ít nhất 1 lỗ hổng từ `npm audit` chưa?

---

## PHASE K — Incident Simulation

### Kịch bản đầu tiên

1. Từ máy Kali: Scan port bằng `nmap` vào web server.
2. Thử brute force SSH với `hydra` (wordlist nhỏ).
3. Xem Wazuh có alert không.
4. Ghi lại incident report.

**Template incident report:**

```
## Incident Report - [Tên kịch bản]

Ngày:
Attacker IP:
Target IP:

Timeline:
- HH:MM - Attacker bắt đầu scan
- HH:MM - Wazuh alert đầu tiên

Evidence (log):
[paste log liên quan]

Detection:
- Rule nào trigger?
- Severity?

Impact:
- Có xâm nhập thành công không?

Remediation:
- Đã làm gì để ngăn chặn?
```

**Câu hỏi tự kiểm tra:**
- [ ] Tôi có thể kể lại incident từ log không (không cần nhớ)?
- [ ] Wazuh alert có đủ thông tin để tôi phân tích không?

---

## PHASE L — Tài liệu hóa (xuyên suốt)

```
docs/
├── architecture.md       ← Sơ đồ hệ thống
├── network.md            ← IP, port, firewall rules
├── deployment.md         ← Cách deploy
├── docker.md             ← Giải thích Dockerfile, compose
├── cicd.md               ← Pipeline flow
├── monitoring.md         ← Grafana, Prometheus setup
├── security.md           ← Kết quả security testing
├── incident-response.md  ← Các incident đã xử lý
└── lessons-learned.md    ← Học được gì
```

Mỗi file phải trả lời được:
- Tại sao làm vậy? (không chỉ là cái gì)
- Traffic đi đường nào?
- Nếu cái này chết thì sao?

---

## CHECKPOINT — Khi nào xong Tầng 2?

Tự hỏi và trả lời **không xem tài liệu**:

```
Tôi push code lên GitHub
  → CI chạy gì? Ở đâu?
  → Test fail thì sao?
  → Build image xong đẩy đi đâu?
  → Deploy vào server bằng cách nào?
  → Nginx nhận request rồi forward đến đâu?
  → Backend kết nối DB thế nào?
  → Log sinh ra ở đâu?
  → Wazuh đọc log từ đâu?
  → Nếu có tấn công SQL Injection vào API, dấu vết ở đâu?
  → Tôi phát hiện bằng cách nào?
  → Tôi fix thế nào?
  → Incident report ghi gì?
```

Trả lời được hết → **Tầng 2 hoàn thành**.

---

## Thứ tự ưu tiên thực tế

```
1.  Git chuẩn + cấu trúc thư mục     ← Bắt đầu ngay
2.  Backend API đơn giản              ← Bắt đầu ngay
3.  PostgreSQL cơ bản                 ← Bắt đầu ngay
4.  Dockerfile từng service           ← Tuần tới
5.  Docker Compose chạy local         ← Tuần tới
6.  GitHub Actions (test + build)     ← Sau compose
7.  Push image lên registry           ← Sau pipeline
8.  Linux Server cơ bản              ← Sau registry
9.  Deploy lên server                 ← Sau server
10. Nginx + HTTPS                     ← Sau deploy
11. Monitoring (Prometheus/Grafana)   ← Sau Nginx
12. Wazuh Agent                       ← Sau monitoring
13. Security testing                  ← Sau Wazuh
14. Security trong CI/CD             ← Sau testing
15. Incident Simulation               ← Gần cuối
16. Documentation đầy đủ             ← Xuyên suốt
```

---

> Không cần hoàn hảo. Cần chạy được và hiểu tại sao nó chạy.
> Tầng 3 (Kubernetes, Terraform, Cloud) chỉ bắt đầu khi Tầng 2 đã vững.

