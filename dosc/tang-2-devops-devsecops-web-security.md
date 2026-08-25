# TẦNG 2 — DEVOPS → DEVSECOPS → WEB SECURITY
## Kế hoạch triển khai hệ thống Portfolio làm cầu nối với SOC Lab

> Mục tiêu: biến portfolio React/Vite hiện tại thành một hệ thống full-stack có khả năng build, test, containerize, deploy, monitor và bảo mật; sau đó nối hệ thống này với lab network/SOC hiện tại để học DevOps và Security trên một hệ thống thật.

---

## 0. Nguyên tắc của Tầng 2

Không học tool riêng lẻ.

Mỗi công nghệ phải gắn vào một hệ thống thật:

```text
Developer
   ↓
Git
   ↓
React/Vite + Node.js API + PostgreSQL
   ↓
Docker
   ↓
CI/CD
   ↓
Container Registry
   ↓
Linux Server / Lab
   ↓
Nginx + HTTPS
   ↓
Monitoring + Logging
   ↓
Wazuh / SOC
   ↓
Web Security
   ↓
DevSecOps
```

### Nguyên tắc học

- Ưu tiên hiểu luồng trước khi học command.
- Không dùng Kubernetes quá sớm.
- Không tạo microservices nếu hệ thống chưa cần.
- Không biến portfolio thành một dự án quá lớn.
- Mỗi giai đoạn phải có một sản phẩm chạy được.
- Mọi thay đổi quan trọng phải đi qua Git.
- Security được đưa vào từ đầu, không chờ đến cuối.

---

# 1. Mục tiêu cuối Tầng 2

Sau khi hoàn thành, có thể mô tả hệ thống:

```text
Internet
   │
   ▼
Firewall / Router
   │
   ▼
Nginx / Reverse Proxy
   │
   ├── Frontend
   │     React + Vite
   │
   └── Backend
         Node.js + Express
              │
              ▼
         PostgreSQL

        ┌──────────────────────┐
        │ CI/CD                │
        │ GitHub Actions       │
        └──────────┬───────────┘
                   ▼
             Docker Image
                   │
                   ▼
              Registry
                   │
                   ▼
                Deploy

Application
   ├── Logs
   ├── Metrics
   └── Security events
          │
          ▼
        Wazuh
          │
          ▼
       Detection
```

---

# 2. Giai đoạn A — Chuẩn hóa Portfolio

## Mục tiêu

Chuyển:

```text
React + Vite
```

thành:

```text
Frontend
Backend API
Database
```

## Stack đề xuất

### Frontend

- React
- Vite
- JavaScript hoặc TypeScript
- CSS/framework hiện tại

### Backend

- Node.js
- Express

### Database

- PostgreSQL

Không cần microservices.

## Backend tối thiểu

```text
GET  /api/projects
GET  /api/projects/:id
GET  /api/skills
GET  /api/experiences
POST /api/contact
```

Nếu cần khu quản trị:

```text
POST   /api/auth/login
POST   /api/projects
PUT    /api/projects/:id
DELETE /api/projects/:id
```

## Database tối thiểu

```text
projects
skills
experiences
messages
users        # chỉ khi cần admin
```

## Definition of Done

- [ ] Frontend gọi API thật.
- [ ] Backend kết nối PostgreSQL.
- [ ] CRUD cần thiết hoạt động.
- [ ] Không hard-code dữ liệu quan trọng trong frontend.
- [ ] Có `.env.example`.
- [ ] Có README chạy local.

---

# 3. Giai đoạn B — Git và cấu trúc project

## Mục tiêu

Biến project thành một repository có thể làm CI/CD.

Ví dụ:

```text
portfolio/
├── frontend/
├── backend/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
└── .github/
    └── workflows/
```

## Git workflow tối thiểu

```text
feature/*
     ↓
Pull Request
     ↓
main
     ↓
CI/CD
```

Không commit:

```text
.env
password
API key
private key
database credential
```

## Definition of Done

- [ ] Repository sạch.
- [ ] `.gitignore` đúng.
- [ ] Secrets không nằm trong Git.
- [ ] Có branch strategy đơn giản.
- [ ] README có kiến trúc và cách chạy.

---

# 4. Giai đoạn C — Docker

## Mục tiêu

Đóng gói toàn bộ hệ thống.

```text
Docker Compose
│
├── frontend
├── backend
└── postgres
```

## Kiến thức phải hiểu

- Image
- Container
- Dockerfile
- Compose
- Volume
- Network
- Port mapping
- Environment variables
- Container health

## Kiến trúc

```text
Browser
   │
   ▼
frontend:80
   │
   ▼
backend:3000
   │
   ▼
postgres:5432
```

PostgreSQL chỉ nằm trong Docker network nội bộ.

## Definition of Done

- [ ] `docker compose up` chạy toàn hệ thống.
- [ ] Frontend gọi backend bằng network phù hợp.
- [ ] Database có persistent volume.
- [ ] Database không expose public không cần thiết.
- [ ] Có healthcheck.
- [ ] Có `.env.example`.

---

# 5. Giai đoạn D — CI/CD

## Mục tiêu

Mỗi lần push code có pipeline tự động.

```text
git push
   ↓
GitHub
   ↓
CI
├── lint
├── test
├── build
└── security checks
   ↓
Docker build
   ↓
Registry
   ↓
Deploy
```

## Công cụ

- GitHub Actions
- Container Registry, ví dụ GHCR

## Pipeline tối thiểu

```text
1. Checkout
2. Install dependencies
3. Lint
4. Test
5. Build frontend
6. Test backend
7. Docker build
8. Image scan
9. Push image
10. Deploy
```

## Tag image

Ưu tiên tag có thể truy nguyên:

```text
portfolio:<git-sha>
```

Không chỉ dùng:

```text
latest
```

## Definition of Done

- [ ] Push code tạo pipeline.
- [ ] Test fail thì pipeline fail.
- [ ] Build image tự động.
- [ ] Image được push lên registry.
- [ ] Có commit SHA để truy nguyên image.
- [ ] Không hard-code secret trong workflow.

---

# 6. Giai đoạn E — Linux Server / Lab Deployment

## Mục tiêu

Đưa hệ thống từ local lên server.

```text
Developer
   ↓
GitHub
   ↓
CI/CD
   ↓
Registry
   ↓
Linux Server
   ↓
Docker
```

Ban đầu chỉ cần:

```text
1 Linux Server
1 Docker Host
```

Không cần Kubernetes.

## Phải hiểu

```text
SSH
Firewall
Process
Service
Disk
Memory
CPU
Logs
Docker
Networking
```

## Network plan

Ví dụ:

```text
Internet
   │
   ▼
Router / Firewall
   │
   ▼
Linux Server
   │
   ├── Nginx :80/:443
   ├── Frontend
   └── Backend
          │
          ▼
       PostgreSQL
```

Không expose PostgreSQL ra Internet nếu không cần.

---

# 7. Giai đoạn F — Nginx + Domain + HTTPS

## Mục tiêu

Public hệ thống đúng cách.

```text
Browser
   │
 HTTPS :443
   ▼
Nginx
   │
   ├── /
   │    ↓
   │  Frontend
   │
   └── /api
        ↓
      Backend
```

## Phải hiểu

- DNS
- A record
- CNAME
- HTTP
- HTTPS
- TLS
- Reverse proxy
- Port 80
- Port 443
- Internal port
- Public port

## Security baseline

```text
Public:
80
443

Restricted:
SSH

Private:
PostgreSQL
Backend internal port
Docker internal services
```

## Definition of Done

- [ ] Domain trỏ đúng server.
- [ ] HTTPS hoạt động.
- [ ] HTTP redirect sang HTTPS.
- [ ] Backend không cần expose trực tiếp.
- [ ] PostgreSQL không public.
- [ ] Nginx reverse proxy hoạt động.

---

# 8. Giai đoạn G — Monitoring và Logging

## Mục tiêu

Không chỉ deploy được mà phải biết hệ thống đang hoạt động thế nào.

## Monitoring

Bắt đầu đơn giản:

```text
CPU
RAM
Disk
Network
Container health
Application health
```

Sau đó:

```text
Prometheus
   ↓
Grafana
```

## Logging

```text
Nginx logs
Backend logs
Docker logs
System logs
Authentication logs
```

Sau đó có thể mở rộng:

```text
Loki / ELK
```

## Definition of Done

Có thể trả lời:

- Server còn sống không?
- Container nào chết?
- API lỗi bao nhiêu?
- Request nào lỗi?
- CPU/RAM có bất thường không?
- Có connection đáng ngờ không?

---

# 9. Giai đoạn H — Nối Portfolio vào SOC Lab

Đây là điểm đặc biệt của Tầng 2.

Không tách DevOps và SOC thành hai project.

```text
                    SOC LAB
                       │
                 ┌─────┴─────┐
                 │  Firewall │
                 └─────┬─────┘
                       │
                  Network
                       │
          ┌────────────┼────────────┐
          │            │            │
       Attacker       Web         Wazuh
         Kali        Server       Manager
```

## Mục tiêu

Khi có hoạt động:

```text
Web request
SSH login
Failed login
Suspicious process
Container event
Nginx event
Application error
```

thì hệ thống monitoring/SOC có thể quan sát được.

## Flow

```text
Attack / Request
      ↓
Web Server
      ↓
Logs
      ↓
Wazuh
      ↓
Detection
      ↓
Alert
      ↓
Analysis
```

---

# 10. Giai đoạn I — Web Security

Chỉ thực hiện trên hệ thống lab / hệ thống bạn sở hữu hoặc được phép kiểm thử.

## Học theo attack → detection → remediation

### 1. Authentication

```text
Login
Session
Password
JWT
Cookie
```

### 2. Authorization

```text
User
Admin
Resource ownership
```

### 3. IDOR

Kiểm tra:

```text
/api/projects/1
/api/projects/2
```

và xác minh authorization.

### 4. SQL Injection

Hiểu:

```text
Input
 ↓
SQL query
 ↓
Database
```

Sau đó:

```text
Parameterized query
ORM
Input validation
```

### 5. XSS

```text
Input
 ↓
HTML/JS
 ↓
Browser
```

Sau đó:

```text
Output encoding
Sanitization
CSP
```

### 6. CSRF

Hiểu:

```text
Browser
 ↓
Authenticated request
 ↓
Server
```

và cơ chế phòng thủ.

### 7. File Upload

Kiểm tra:

- Extension
- MIME
- File content
- Storage location
- Execution permission
- File size

### 8. Command Injection / SSRF

Chỉ triển khai các bài lab có kiểm soát.

---

# 11. Giai đoạn J — DevSecOps

Đây là điểm hoàn thiện Tầng 2.

Security được đưa vào pipeline:

```text
Developer
   ↓
Git
   ↓
CI
├── Unit Test
├── Lint
├── SAST
├── Dependency Scan
├── Secret Scan
└── Container Scan
   ↓
Docker Image
   ↓
Registry
   ↓
Deploy
   ↓
Monitoring
   ↓
Wazuh
```

## Security tools có thể dùng

Không cần dùng tất cả ngay.

Ưu tiên:

```text
Secret scanning
Dependency scanning
SAST
Container image scanning
OWASP testing
```

Sau đó mới mở rộng.

---

# 12. Giai đoạn K — Incident Simulation

Dùng chính lab để mô phỏng:

```text
Recon
 ↓
Scan
 ↓
Web attack
 ↓
Authentication attack
 ↓
Exploit trong lab
 ↓
Post-exploitation
 ↓
Log
 ↓
Detection
 ↓
Alert
 ↓
Investigation
 ↓
Remediation
```

Mỗi incident phải ghi:

```text
1. Attacker
2. Target
3. Source IP
4. Destination IP
5. Port
6. Protocol
7. Technique
8. Log source
9. Detection
10. Evidence
11. Impact
12. Remediation
```

---

# 13. Giai đoạn L — Documentation

Mỗi phần phải có tài liệu.

```text
docs/
├── architecture.md
├── network.md
├── deployment.md
├── docker.md
├── cicd.md
├── monitoring.md
├── security.md
├── incident-response.md
└── lessons-learned.md
```

## Architecture diagram

Phải thể hiện:

```text
Internet
   ↓
Firewall
   ↓
Nginx
   ↓
Frontend
   ↓
Backend
   ↓
Database

        ↘ Logs → Wazuh
```

## Network documentation

Ghi rõ:

```text
Network
Subnet
Gateway
Server IP
Container network
Public ports
Private ports
Firewall rules
DNS
```

---

# 14. Thứ tự triển khai thực tế

Không làm tất cả cùng lúc.

```text
[01] Portfolio React/Vite
       ↓
[02] Node/Express API
       ↓
[03] PostgreSQL
       ↓
[04] Git chuẩn
       ↓
[05] Docker Compose
       ↓
[06] GitHub Actions
       ↓
[07] Registry
       ↓
[08] Linux Server
       ↓
[09] Nginx
       ↓
[10] Domain + HTTPS
       ↓
[11] Monitoring
       ↓
[12] Logging
       ↓
[13] Wazuh
       ↓
[14] Web Security
       ↓
[15] Security trong CI/CD
       ↓
[16] Attack Simulation
       ↓
[17] Detection
       ↓
[18] Incident Response
```

---

# 15. Không làm ở Tầng 2

Tạm thời KHÔNG ưu tiên:

```text
❌ Microservices
❌ Service Mesh
❌ Kafka
❌ Terraform quá phức tạp
❌ Kubernetes production
❌ Multi-cloud
❌ GitOps phức tạp
❌ HA database
❌ Distributed tracing quá sâu
```

Những thứ này thuộc giai đoạn sau khi nền tảng đã chắc.

---

# 16. Khi nào được coi là hoàn thành Tầng 2?

Bạn phải có thể tự giải thích và vận hành flow:

```text
Code
 ↓
Git
 ↓
CI
 ↓
Test
 ↓
Docker Build
 ↓
Registry
 ↓
Deploy
 ↓
Linux
 ↓
Nginx
 ↓
HTTPS
 ↓
Application
 ↓
Database
 ↓
Logs / Metrics
 ↓
Wazuh
 ↓
Security Testing
 ↓
Detection
```

Và quan trọng nhất:

> Không chỉ biết "dùng tool X", mà biết **traffic đi đâu, process nào chạy, service nào mở port, dữ liệu nằm ở đâu, log sinh ra ở đâu và khi tấn công thì dấu vết xuất hiện ở đâu.**

---

# 17. Tầng 3 chỉ bắt đầu sau checkpoint này

```text
TẦNG 2 COMPLETE
       │
       ▼
Kubernetes
       ↓
RKE2
       ↓
CNI / Calico
       ↓
NetworkPolicy
       ↓
Ingress / Load Balancing
       ↓
Cloud VPC
       ↓
Terraform
       ↓
BGP / ECMP
       ↓
Spine / Leaf
       ↓
Production Infrastructure
```

Tầng 3 sẽ lấy **chính hệ thống ở Tầng 2** làm workload để đưa vào Kubernetes/Cloud thay vì tạo một project mới.
