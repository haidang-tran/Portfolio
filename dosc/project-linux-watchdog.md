# PROJECT: LINUX SERVER WATCHDOG

> Bạn sẽ xây một hệ thống tự giám sát server từ đầu đến cuối, viết bằng bash thuần.
> Khi xong, hệ thống tự theo dõi CPU/RAM/Disk/Service, ghi log, gửi alert, và tự restart service khi chết.
> Mỗi bước dạy một nhóm kỹ năng Linux. Không bước nào là lý thuyết — tất cả đều tạo ra thứ chạy được.

---

## Kết quả cuối cùng

```
~/watchdog/
├── bin/
│   ├── watchdog.sh       ← Script chính, chạy như daemon
│   ├── check-system.sh   ← Kiểm tra CPU/RAM/Disk
│   ├── check-service.sh  ← Kiểm tra service còn sống không
│   ├── check-network.sh  ← Kiểm tra endpoint trả lời không
│   └── analyze-log.sh    ← Phân tích log, tìm anomaly
├── conf/
│   └── watchdog.conf     ← Cấu hình ngưỡng alert, service cần theo dõi
├── log/
│   ├── watchdog.log      ← Log của hệ thống monitoring
│   └── alert.log         ← Log alert riêng
└── report/
    └── daily-YYYY-MM-DD.txt  ← Báo cáo hàng ngày tự sinh
```

Hệ thống chạy như systemd service, khởi động cùng WSL, tự ghi log, tự restart service chết.

---

## Trước khi bắt đầu

Mở WSL Ubuntu. Tất cả lệnh trong file này chạy trong WSL.

Tạo thư mục làm việc:
```bash
mkdir -p ~/watchdog/{bin,conf,log,report}
cd ~/watchdog
```

Cài công cụ cần thiết:
```bash
sudo apt update
sudo apt install -y curl nginx net-tools bc
```

Kiểm tra:
```bash
ls -la ~/watchdog/
nginx -v
```

---

## STEP 1 — Tạo cấu trúc và file config

### Mục tiêu
- Học: filesystem, vim, here-doc, comment trong bash, file permission

### 1.1 — Tạo file cấu hình bằng vim

```bash
vim ~/watchdog/conf/watchdog.conf
```

Gõ `i` để vào INSERT mode, paste nội dung sau:

```bash
# ============================================================
# WATCHDOG CONFIGURATION
# ============================================================

# --- Ngưỡng alert ---
CPU_THRESHOLD=80        # Alert khi CPU > 80%
RAM_THRESHOLD=85        # Alert khi RAM > 85%
DISK_THRESHOLD=90       # Alert khi Disk > 90%

# --- Khoảng thời gian kiểm tra (giây) ---
CHECK_INTERVAL=30

# --- Service cần giám sát (cách nhau bằng dấu cách) ---
WATCH_SERVICES="nginx"

# --- Endpoint cần giám sát (URL cách nhau bằng dấu cách) ---
WATCH_ENDPOINTS="http://localhost:80"

# --- Thư mục log ---
LOG_DIR="$HOME/watchdog/log"
REPORT_DIR="$HOME/watchdog/report"

# --- Giữ log tối đa N ngày ---
LOG_RETENTION_DAYS=7
```

Nhấn `Esc`, gõ `:wq` để lưu.

### 1.2 — Kiểm tra file vừa tạo

```bash
cat ~/watchdog/conf/watchdog.conf
```

Bỏ comment và dòng trống để xem cấu hình thực sự:
```bash
grep -v "^#" ~/watchdog/conf/watchdog.conf | grep -v "^$"
```

**Câu hỏi:** Output của lệnh trên là gì? Có đúng không?

### 1.3 — Tạo file log rỗng với timestamp

```bash
touch ~/watchdog/log/watchdog.log
touch ~/watchdog/log/alert.log

# Ghi header vào log
echo "# Watchdog started at $(date '+%Y-%m-%d %H:%M:%S')" >> ~/watchdog/log/watchdog.log

# Xem
cat ~/watchdog/log/watchdog.log
```

### Checkpoint 1

```bash
# Chạy lệnh này để tự kiểm tra
ls -la ~/watchdog/conf/
ls -la ~/watchdog/log/
```

- [ ] Thấy `watchdog.conf` có nội dung không?
- [ ] Thấy 2 file log không?
- [ ] Bạn đã mở và sửa file bằng vim được chưa?

---

## STEP 2 — Script kiểm tra tài nguyên hệ thống

### Mục tiêu
- Học: biến bash, command substitution `$()`, awk, bc, if-else, function

### 2.1 — Viết check-system.sh

```bash
vim ~/watchdog/bin/check-system.sh
```

Nội dung:

```bash
#!/bin/bash
# check-system.sh — Kiểm tra CPU, RAM, Disk
# Trả về: OK hoặc ALERT với thông tin chi tiết

# Load cấu hình
source ~/watchdog/conf/watchdog.conf

# ---- Hàm lấy % CPU đang dùng ----
get_cpu_usage() {
    # top -bn1: chạy top 1 lần, không interactive
    # grep "Cpu(s)": lấy dòng CPU stats
    # awk: lấy số % idle, tính 100 - idle = used
    local idle
    idle=$(top -bn1 | grep "Cpu(s)" | awk '{print $8}' | tr -d '%,us')
    # Nếu awk không lấy được đúng (format khác nhau giữa các distro)
    # Dùng cách khác:
    if [ -z "$idle" ]; then
        idle=$(top -bn1 | grep "Cpu(s)" | sed 's/.*, *\([0-9.]*\)%* id.*/\1/')
    fi
    echo "scale=1; 100 - $idle" | bc
}

# ---- Hàm lấy % RAM đang dùng ----
get_ram_usage() {
    # free -m: hiện RAM theo MB
    # awk NR==2: dòng thứ 2 (dòng Mem:)
    # $3/$2*100: used/total * 100
    free -m | awk 'NR==2 {printf "%.1f", $3/$2*100}'
}

# ---- Hàm lấy % Disk đang dùng (partition /) ----
get_disk_usage() {
    # df: disk free
    # grep " /$": lấy dòng có root partition
    # awk: lấy cột 5 (% used), bỏ dấu %
    df -h | grep " /$" | awk '{print $5}' | tr -d '%'
}

# ---- Hàm in kết quả có màu ----
print_status() {
    local name=$1
    local value=$2
    local threshold=$3
    local unit=$4

    # So sánh số thực với bc
    if (( $(echo "$value > $threshold" | bc -l) )); then
        echo "ALERT  [$name] ${value}${unit} > threshold ${threshold}${unit}"
        return 1  # Return code 1 = có vấn đề
    else
        echo "OK     [$name] ${value}${unit} (threshold: ${threshold}${unit})"
        return 0
    fi
}

# ---- Main ----
echo "=== System Check @ $(date '+%Y-%m-%d %H:%M:%S') ==="

CPU=$(get_cpu_usage)
RAM=$(get_ram_usage)
DISK=$(get_disk_usage)

print_status "CPU " "$CPU"  "$CPU_THRESHOLD"  "%"
print_status "RAM " "$RAM"  "$RAM_THRESHOLD"  "%"
print_status "DISK" "$DISK" "$DISK_THRESHOLD" "%"
```

Lưu: `Esc` → `:wq`

### 2.2 — Cấp quyền thực thi và chạy thử

```bash
chmod +x ~/watchdog/bin/check-system.sh

# Chạy
~/watchdog/bin/check-system.sh
```

Đọc output. Hiểu từng dòng.

### 2.3 — Debug nếu lỗi

Nếu `get_cpu_usage` trả về số lạ:
```bash
# Xem raw output của top
top -bn1 | grep "Cpu(s)"

# Xem awk lấy được gì
top -bn1 | grep "Cpu(s)" | awk '{print NF, $0}'

# Thử format khác
top -bn1 | grep -i "cpu"
```

**Bài học:** Khi lệnh trả về sai, chia nhỏ ra debug từng phần. Đây là kỹ năng quan trọng nhất.

### Checkpoint 2

```bash
~/watchdog/bin/check-system.sh
```

- [ ] Script chạy không lỗi không?
- [ ] 3 dòng output CPU, RAM, DISK có số hợp lý không?
- [ ] Bạn hiểu tại sao dùng `awk NR==2` không?
- [ ] `bc -l` dùng để làm gì?

---

## STEP 3 — Script kiểm tra service

### Mục tiêu
- Học: exit code, vòng lặp for, mảng, xử lý chuỗi

### 3.1 — Viết check-service.sh

```bash
vim ~/watchdog/bin/check-service.sh
```

```bash
#!/bin/bash
# check-service.sh — Kiểm tra service có đang chạy không
# Nếu service chết → tự restart

source ~/watchdog/conf/watchdog.conf

LOG="$LOG_DIR/watchdog.log"

# ---- Hàm log ----
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG"
}

# ---- Hàm kiểm tra và tự heal ----
check_and_heal_service() {
    local service=$1

    # systemctl is-active trả về exit code 0 nếu active, khác nếu không
    if systemctl is-active --quiet "$service"; then
        echo "OK     [SERVICE] $service is running"
    else
        # Lấy trạng thái thực tế
        local status
        status=$(systemctl is-active "$service")
        log "ALERT  [SERVICE] $service is $status — attempting restart"

        # Thử restart
        if sudo systemctl restart "$service" 2>/dev/null; then
            log "INFO   [SERVICE] $service restarted successfully"
            echo "HEALED [SERVICE] $service was $status, now restarted"
        else
            log "ERROR  [SERVICE] $service failed to restart"
            echo "ERROR  [SERVICE] $service cannot be restarted"
        fi
    fi
}

# ---- Main ----
echo "=== Service Check @ $(date '+%Y-%m-%d %H:%M:%S') ==="

# Loop qua danh sách service trong config
for service in $WATCH_SERVICES; do
    check_and_heal_service "$service"
done
```

Lưu: `Esc` → `:wq`

### 3.2 — Cấp quyền và test

```bash
chmod +x ~/watchdog/bin/check-service.sh

# Đảm bảo nginx đang chạy
sudo systemctl start nginx

# Chạy script
~/watchdog/bin/check-service.sh
```

### 3.3 — Test tình huống service chết

```bash
# Tắt nginx
sudo systemctl stop nginx

# Chạy script → nó phải phát hiện và restart
~/watchdog/bin/check-service.sh

# Kiểm tra nginx có được restart không
systemctl status nginx

# Xem log
cat ~/watchdog/log/watchdog.log
```

**Câu hỏi:** Script đã restart nginx không? Log ghi gì?

### Checkpoint 3

- [ ] Script phát hiện nginx tắt không?
- [ ] Script restart được nginx không?
- [ ] Log file có ghi đúng không?
- [ ] Bạn hiểu exit code 0 = success trong Linux không?

---

## STEP 4 — Script kiểm tra network endpoint

### Mục tiêu
- Học: curl, HTTP status code, timeout, string comparison

### 4.1 — Viết check-network.sh

```bash
vim ~/watchdog/bin/check-network.sh
```

```bash
#!/bin/bash
# check-network.sh — Kiểm tra endpoint có trả lời không

source ~/watchdog/conf/watchdog.conf

LOG="$LOG_DIR/watchdog.log"
ALERT_LOG="$LOG_DIR/alert.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG"; }
alert() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$ALERT_LOG"; }

check_endpoint() {
    local url=$1
    local timeout=10  # giây

    # curl options:
    # -o /dev/null     → bỏ response body
    # -s               → silent (không in progress)
    # -w "%{http_code}" → chỉ in HTTP status code
    # --connect-timeout → timeout kết nối
    # --max-time        → timeout toàn bộ request
    local http_code
    http_code=$(curl -o /dev/null -s \
        --connect-timeout $timeout \
        --max-time $timeout \
        -w "%{http_code}" \
        "$url" 2>/dev/null)

    # Nếu curl không kết nối được → http_code = 000
    if [ "$http_code" = "000" ]; then
        alert "ALERT  [NETWORK] $url — Connection refused or timeout"
        echo "ERROR  [NETWORK] $url — Cannot connect"
        return 1

    # HTTP 2xx = success
    elif [[ "$http_code" =~ ^2 ]]; then
        echo "OK     [NETWORK] $url — HTTP $http_code"
        return 0

    # HTTP 4xx, 5xx = error
    else
        alert "ALERT  [NETWORK] $url — HTTP $http_code"
        echo "WARN   [NETWORK] $url — HTTP $http_code"
        return 1
    fi
}

echo "=== Network Check @ $(date '+%Y-%m-%d %H:%M:%S') ==="

for endpoint in $WATCH_ENDPOINTS; do
    check_endpoint "$endpoint"
done
```

Lưu và cấp quyền:
```bash
chmod +x ~/watchdog/bin/check-network.sh
```

### 4.2 — Test

```bash
# Nginx phải đang chạy
sudo systemctl start nginx

# Chạy
~/watchdog/bin/check-network.sh

# Test endpoint chết — thêm một endpoint giả vào config
# Mở config
vim ~/watchdog/conf/watchdog.conf
# Sửa dòng WATCH_ENDPOINTS:
# WATCH_ENDPOINTS="http://localhost:80 http://localhost:9999"
# Lưu :wq

# Chạy lại
~/watchdog/bin/check-network.sh

# Xem alert log
cat ~/watchdog/log/alert.log
```

### Checkpoint 4

- [ ] Script phát hiện endpoint 9999 không kết nối được không?
- [ ] Alert log có ghi không?
- [ ] Bạn hiểu HTTP status code 2xx, 4xx, 5xx là gì không?

---

## STEP 5 — Script phân tích log

### Mục tiêu
- Học: grep, awk, sort, uniq, pipe phức tạp, tạo report

### 5.1 — Tạo test data (giả lập Nginx access log)

Nginx thật sẽ có log thật. Nhưng để luyện, tạo log giả:

```bash
# Tạo sample nginx access log
cat << 'EOF' > /tmp/test-access.log
192.168.1.1 - - [25/Aug/2024:10:00:01 +0700] "GET / HTTP/1.1" 200 1234
192.168.1.2 - - [25/Aug/2024:10:00:02 +0700] "GET /api/health HTTP/1.1" 200 45
192.168.1.1 - - [25/Aug/2024:10:00:03 +0700] "GET /admin HTTP/1.1" 404 512
10.0.0.5   - - [25/Aug/2024:10:00:04 +0700] "POST /api/login HTTP/1.1" 401 200
10.0.0.5   - - [25/Aug/2024:10:00:05 +0700] "POST /api/login HTTP/1.1" 401 200
10.0.0.5   - - [25/Aug/2024:10:00:06 +0700] "POST /api/login HTTP/1.1" 401 200
10.0.0.5   - - [25/Aug/2024:10:00:07 +0700] "POST /api/login HTTP/1.1" 401 200
10.0.0.5   - - [25/Aug/2024:10:00:08 +0700] "POST /api/login HTTP/1.1" 401 200
192.168.1.3 - - [25/Aug/2024:10:00:09 +0700] "GET /index.html HTTP/1.1" 200 5678
192.168.1.1 - - [25/Aug/2024:10:00:10 +0700] "GET / HTTP/1.1" 200 1234
172.16.0.1 - - [25/Aug/2024:10:00:11 +0700] "GET /../../etc/passwd HTTP/1.1" 404 0
172.16.0.1 - - [25/Aug/2024:10:00:12 +0700] "GET /wp-admin HTTP/1.1" 404 0
172.16.0.1 - - [25/Aug/2024:10:00:13 +0700] "GET /.env HTTP/1.1" 404 0
192.168.1.4 - - [25/Aug/2024:10:00:14 +0700] "GET /api/data HTTP/1.1" 500 100
EOF

# Kiểm tra
cat /tmp/test-access.log
```

### 5.2 — Luyện pipe: phân tích log thủ công

Làm từng lệnh, hiểu từng bước:

```bash
# 1. Đếm tổng request
wc -l /tmp/test-access.log

# 2. Lấy danh sách HTTP status codes
awk '{print $9}' /tmp/test-access.log

# 3. Đếm theo status code
awk '{print $9}' /tmp/test-access.log | sort | uniq -c | sort -rn

# 4. Chỉ lấy request lỗi (4xx, 5xx)
awk '$9 >= 400 {print $0}' /tmp/test-access.log

# 5. IP nào request nhiều nhất
awk '{print $1}' /tmp/test-access.log | sort | uniq -c | sort -rn

# 6. Tìm dấu hiệu tấn công (path traversal, scan .env)
grep -E "\.\./|\.env|wp-admin|phpMyAdmin" /tmp/test-access.log

# 7. IP nào gửi nhiều request 401 (brute force login)
awk '$9 == "401" {print $1}' /tmp/test-access.log | sort | uniq -c | sort -rn

# 8. Tổng bytes trả về
awk '{sum += $10} END {print "Total bytes:", sum, "(" sum/1024 "KB)"}' /tmp/test-access.log
```

Chạy từng lệnh. Hiểu tại sao `$9` là status code (đếm các cột trong log format).

### 5.3 — Viết analyze-log.sh

```bash
vim ~/watchdog/bin/analyze-log.sh
```

```bash
#!/bin/bash
# analyze-log.sh — Phân tích Nginx access log, tìm anomaly

source ~/watchdog/conf/watchdog.conf

# Nhận log file làm argument, mặc định là nginx access log
LOG_FILE="${1:-/var/log/nginx/access.log}"
REPORT_FILE="$REPORT_DIR/daily-$(date +%Y-%m-%d).txt"
ALERT_LOG="$LOG_DIR/alert.log"

alert() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$ALERT_LOG"; }

# Kiểm tra file có tồn tại không
if [ ! -f "$LOG_FILE" ]; then
    # Nếu không có nginx log thật, dùng file test
    LOG_FILE="/tmp/test-access.log"
    echo "INFO: Nginx log not found, using test log: $LOG_FILE"
fi

echo "=== Log Analysis @ $(date '+%Y-%m-%d %H:%M:%S') ==="
echo "Analyzing: $LOG_FILE"
echo ""

# ---- Thống kê cơ bản ----
TOTAL=$(wc -l < "$LOG_FILE")
echo "Total requests: $TOTAL"

# Đếm theo status code
echo ""
echo "--- Status Codes ---"
awk '{print $9}' "$LOG_FILE" | sort | uniq -c | sort -rn

# ---- Top IP ----
echo ""
echo "--- Top 5 Client IPs ---"
awk '{print $1}' "$LOG_FILE" | sort | uniq -c | sort -rn | head -5

# ---- Phát hiện anomaly ----
echo ""
echo "--- Security Alerts ---"

# 1. Path traversal attempt
TRAVERSAL=$(grep -cE "\.\./|\.\.%2F" "$LOG_FILE" 2>/dev/null || echo 0)
if [ "$TRAVERSAL" -gt 0 ]; then
    alert "SECURITY Path traversal attempts: $TRAVERSAL"
    echo "ALERT: Path traversal attempts detected: $TRAVERSAL"
    grep -E "\.\./|\.\.%2F" "$LOG_FILE" | awk '{print "  IP:", $1, "URL:", $7}'
fi

# 2. Sensitive file scan
SCAN=$(grep -cE "\.env|\.git|wp-admin|phpMyAdmin|\.htaccess" "$LOG_FILE" 2>/dev/null || echo 0)
if [ "$SCAN" -gt 0 ]; then
    alert "SECURITY Sensitive file scan: $SCAN requests"
    echo "ALERT: Sensitive file scan detected: $SCAN requests"
fi

# 3. Brute force login (nhiều 401 từ 1 IP)
echo ""
echo "--- Potential Brute Force (401 by IP) ---"
awk '$9 == "401" {print $1}' "$LOG_FILE" | sort | uniq -c | sort -rn | while read count ip; do
    if [ "$count" -gt 3 ]; then
        alert "SECURITY Possible brute force from $ip: $count failed attempts"
        echo "ALERT: $ip — $count failed logins"
    fi
done

# 4. High error rate
ERRORS=$(awk '$9 >= 500' "$LOG_FILE" | wc -l)
if [ "$ERRORS" -gt 0 ]; then
    echo ""
    echo "ALERT: Server errors (5xx): $ERRORS"
fi

# ---- Ghi report ----
{
    echo "# Daily Report — $(date '+%Y-%m-%d')"
    echo "Generated: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo "## Summary"
    echo "Total requests: $TOTAL"
    echo ""
    echo "## Status Codes"
    awk '{print $9}' "$LOG_FILE" | sort | uniq -c | sort -rn
    echo ""
    echo "## Top IPs"
    awk '{print $1}' "$LOG_FILE" | sort | uniq -c | sort -rn | head -10
} > "$REPORT_FILE"

echo ""
echo "Report saved: $REPORT_FILE"
```

```bash
chmod +x ~/watchdog/bin/analyze-log.sh
~/watchdog/bin/analyze-log.sh /tmp/test-access.log
```

### Checkpoint 5

```bash
cat ~/watchdog/report/daily-$(date +%Y-%m-%d).txt
cat ~/watchdog/log/alert.log
```

- [ ] Script phát hiện path traversal từ 172.16.0.1 không?
- [ ] Script phát hiện brute force từ 10.0.0.5 (5 lần 401) không?
- [ ] Report file được tạo không?
- [ ] Bạn hiểu tại sao `awk '$9 == "401"'` lọc được không?

---

## STEP 6 — Script chính: Watchdog Daemon

### Mục tiêu
- Học: infinite loop, sleep, signal trapping, daemon pattern

### 6.1 — Viết watchdog.sh

```bash
vim ~/watchdog/bin/watchdog.sh
```

```bash
#!/bin/bash
# watchdog.sh — Script chính, chạy liên tục như daemon
# Gọi các script con theo interval, ghi log, tự quản lý

set -o pipefail

source ~/watchdog/conf/watchdog.conf

LOG="$LOG_DIR/watchdog.log"
PID_FILE="/tmp/watchdog.pid"
BIN_DIR="$HOME/watchdog/bin"

# ---- Logging ----
log() {
    local level=$1
    local msg=$2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $msg" | tee -a "$LOG"
}

# ---- Cleanup khi nhận SIGTERM hoặc SIGINT ----
cleanup() {
    log "INFO" "Watchdog stopping (PID $$)"
    rm -f "$PID_FILE"
    exit 0
}

# Bắt signal: khi ai gửi SIGTERM hoặc SIGINT → gọi cleanup
trap cleanup SIGTERM SIGINT

# ---- Ngăn chạy 2 instance cùng lúc ----
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "Watchdog already running (PID $OLD_PID)"
        exit 1
    else
        # PID file cũ nhưng process đã chết
        rm -f "$PID_FILE"
    fi
fi

# Ghi PID hiện tại
echo $$ > "$PID_FILE"

# ---- Khởi động ----
log "INFO" "Watchdog started (PID $$)"
log "INFO" "Check interval: ${CHECK_INTERVAL}s"
log "INFO" "Watching services: $WATCH_SERVICES"
log "INFO" "Watching endpoints: $WATCH_ENDPOINTS"

# ---- Main loop ----
iteration=0

while true; do
    iteration=$((iteration + 1))
    log "INFO" "--- Cycle #$iteration ---"

    # Chạy từng check, redirect stderr vào log
    "$BIN_DIR/check-system.sh"   2>> "$LOG" | while read line; do
        log "CHECK" "$line"
    done

    "$BIN_DIR/check-service.sh"  2>> "$LOG" | while read line; do
        log "CHECK" "$line"
    done

    "$BIN_DIR/check-network.sh"  2>> "$LOG" | while read line; do
        log "CHECK" "$line"
    done

    log "INFO" "Sleeping ${CHECK_INTERVAL}s..."
    sleep "$CHECK_INTERVAL"
done
```

```bash
chmod +x ~/watchdog/bin/watchdog.sh
```

### 6.2 — Test chạy thủ công

```bash
# Chạy và xem output
~/watchdog/bin/watchdog.sh

# Để 1-2 cycle rồi nhấn Ctrl+C để dừng
# Xem log
cat ~/watchdog/log/watchdog.log
```

### Checkpoint 6

- [ ] Watchdog chạy được không (ít nhất 1 cycle)?
- [ ] Log có ghi đúng không?
- [ ] Ctrl+C dừng script gọi cleanup không (xem PID file còn không)?
- [ ] Bạn hiểu `trap` dùng để làm gì không?

---

## STEP 7 — Chạy như systemd service

### Mục tiêu
- Học: tạo systemd unit file, enable/disable, journalctl

### 7.1 — Tạo systemd service file

```bash
sudo vim /etc/systemd/system/watchdog.service
```

```ini
[Unit]
Description=Linux Server Watchdog
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME_HERE
ExecStart=/home/YOUR_USERNAME_HERE/watchdog/bin/watchdog.sh
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Thay `YOUR_USERNAME_HERE` bằng username của bạn. Lấy username bằng lệnh:
```bash
whoami
```

Ví dụ nếu username là `hai`:
```
User=hai
ExecStart=/home/hai/watchdog/bin/watchdog.sh
```

### 7.2 — Enable và start service

```bash
# Load file mới
sudo systemctl daemon-reload

# Enable (tự khởi động)
sudo systemctl enable watchdog

# Start
sudo systemctl start watchdog

# Xem status
sudo systemctl status watchdog

# Xem log real-time
journalctl -u watchdog -f
```

### 7.3 — Test tình huống service bị kill

```bash
# Xem PID của watchdog
cat /tmp/watchdog.pid

# Kill process
sudo kill $(cat /tmp/watchdog.pid)

# systemd sẽ tự restart sau 5 giây
# Chờ và kiểm tra
sleep 8
systemctl status watchdog
```

### Checkpoint 7

- [ ] `systemctl status watchdog` thấy `active (running)` không?
- [ ] `journalctl -u watchdog` thấy log không?
- [ ] Sau khi kill, service có tự restart không?
- [ ] `systemctl enable` khác `systemctl start` thế nào?

---

## STEP 8 — Cron job: báo cáo hàng ngày

### Mục tiêu
- Học: crontab, scheduling, log rotation

### 8.1 — Thêm cron job

```bash
crontab -e
```

Thêm vào cuối file:

```cron
# Phân tích log mỗi ngày lúc 23:55
55 23 * * * /home/YOUR_USERNAME/watchdog/bin/analyze-log.sh >> /home/YOUR_USERNAME/watchdog/log/watchdog.log 2>&1

# Xóa log cũ hơn 7 ngày — chạy lúc 0:00 mỗi ngày
0 0 * * * find /home/YOUR_USERNAME/watchdog/log -name "*.log" -mtime +7 -delete

# Xóa report cũ hơn 30 ngày
0 0 * * * find /home/YOUR_USERNAME/watchdog/report -name "*.txt" -mtime +30 -delete
```

Kiểm tra:
```bash
crontab -l
```

### 8.2 — Test cron bằng cách chạy tay

```bash
# Giả lập cron chạy: chạy đúng như cron sẽ chạy
/home/$(whoami)/watchdog/bin/analyze-log.sh /tmp/test-access.log

# Xem report mới tạo
ls -la ~/watchdog/report/
cat ~/watchdog/report/daily-$(date +%Y-%m-%d).txt
```

### Checkpoint 8

- [ ] `crontab -l` thấy 3 job đã thêm không?
- [ ] Chạy analyze script tay ra report không?
- [ ] Bạn giải thích được `55 23 * * *` nghĩa là gì không?

---

## STEP 9 — Thêm tính năng: Vim nâng cao

### Mục tiêu
- Luyện vim thực tế bằng cách sửa script thật

### 9.1 — Bài tập vim với file thật

Mở watchdog.conf bằng vim và thực hành từng thao tác:

```bash
vim ~/watchdog/conf/watchdog.conf
```

**Bài tập trong vim (làm theo thứ tự):**

1. Nhảy đến dòng có `CPU_THRESHOLD` → gõ `/CPU_THRESHOLD` Enter
2. Đổi giá trị 80 thành 75 → đặt cursor lên số → `r75`... thực ra: `ciw` rồi gõ `75` rồi `Esc`
3. Nhảy đến cuối file → `G`
4. Thêm dòng mới ở cuối → `o` → gõ `# END OF CONFIG` → `Esc`
5. Copy dòng `CPU_THRESHOLD` → `/CPU_THRESHOLD` Enter → `yy`
6. Nhảy xuống cuối → `G` → `p` để paste
7. Undo tất cả → `u` nhiều lần đến khi về trạng thái ban đầu
8. Thoát không lưu → `:q!`

### 9.2 — Sửa script với vim: thêm tính năng

```bash
vim ~/watchdog/bin/check-system.sh
```

Tìm dòng cuối cùng (hàm `print_status`) và thêm một tính năng: in thông tin thêm.

Dùng:
- `/print_status` để tìm
- `G` để xuống cuối
- `o` để thêm dòng mới
- Gõ code
- `:wq` để lưu

Thêm vào cuối file:

```bash
# Thông tin thêm
echo ""
echo "--- Process Summary ---"
echo "Running processes: $(ps aux | grep -v grep | wc -l)"
echo "Zombie processes:  $(ps aux | awk '$8 == "Z"' | wc -l)"
echo "Top memory user:   $(ps aux --sort=-%mem | awk 'NR==2 {print $11, $4"%"}')"
```

Test:
```bash
~/watchdog/bin/check-system.sh
```

---

## STEP 10 — Debug thực tế: Tạo và giải quyết vấn đề

### Mục tiêu
- Luyện debug flow hoàn chỉnh: nhận ra vấn đề → đọc log → tìm nguyên nhân → fix

### 10.1 — Tình huống 1: Script bị permission denied

```bash
# Xóa quyền thực thi
chmod -x ~/watchdog/bin/check-system.sh

# Chạy watchdog (sẽ lỗi)
~/watchdog/bin/watchdog.sh

# Đọc error message
# Fix
chmod +x ~/watchdog/bin/check-system.sh
```

### 10.2 — Tình huống 2: Log file đầy

```bash
# Giả lập log file lớn
for i in $(seq 1 1000); do
    echo "[2024-08-25 10:00:$i] INFO fake log entry number $i" >> ~/watchdog/log/watchdog.log
done

# Xem kích thước
ls -lh ~/watchdog/log/watchdog.log
wc -l ~/watchdog/log/watchdog.log

# Xem 20 dòng cuối
tail -20 ~/watchdog/log/watchdog.log

# Giải pháp: rotate log
# Giữ 1000 dòng cuối, bỏ phần còn lại
tail -1000 ~/watchdog/log/watchdog.log > /tmp/watchdog.log.tmp
mv /tmp/watchdog.log.tmp ~/watchdog/log/watchdog.log

# Kiểm tra
wc -l ~/watchdog/log/watchdog.log
```

**Thêm log rotation vào script:**

```bash
vim ~/watchdog/bin/watchdog.sh
```

Thêm vào ngay sau phần `source`:

```bash
# Log rotation: giữ tối đa 5000 dòng
rotate_log() {
    local logfile=$1
    local max_lines=5000
    local current_lines
    current_lines=$(wc -l < "$logfile")
    if [ "$current_lines" -gt "$max_lines" ]; then
        tail -$max_lines "$logfile" > "${logfile}.tmp"
        mv "${logfile}.tmp" "$logfile"
    fi
}
```

Và gọi nó trong loop:
```bash
# Thêm vào đầu mỗi iteration trong while loop
rotate_log "$LOG"
```

### 10.3 — Tình huống 3: Watchdog không tìm được config

```bash
# Xóa file config tạm thời
mv ~/watchdog/conf/watchdog.conf ~/watchdog/conf/watchdog.conf.bak

# Chạy script
~/watchdog/bin/check-system.sh

# Xem lỗi — bash không báo rõ khi source file không tồn tại
# Thêm check vào đầu script:
```

Mở `check-system.sh` bằng vim, thêm sau `#!/bin/bash`:

```bash
CONF="$HOME/watchdog/conf/watchdog.conf"
if [ ! -f "$CONF" ]; then
    echo "ERROR: Config file not found: $CONF" >&2
    exit 1
fi
source "$CONF"
```

Restore config:
```bash
mv ~/watchdog/conf/watchdog.conf.bak ~/watchdog/conf/watchdog.conf
```

---

## BƯỚC CUỐI — Kiểm tra toàn bộ hệ thống

```bash
# 1. Tất cả script có quyền thực thi không?
ls -la ~/watchdog/bin/

# 2. Service đang chạy không?
systemctl status watchdog

# 3. Xem log
tail -50 ~/watchdog/log/watchdog.log

# 4. Xem alert
cat ~/watchdog/log/alert.log

# 5. Xem report hôm nay
cat ~/watchdog/report/daily-$(date +%Y-%m-%d).txt

# 6. Xem crontab
crontab -l

# 7. Test toàn bộ flow: tắt nginx
sudo systemctl stop nginx
# Đợi 1 cycle (30 giây)
# Watchdog phải phát hiện và restart nginx
sleep 35
systemctl status nginx
tail -20 ~/watchdog/log/watchdog.log
```

---

## TỔNG KẾT — Những gì bạn đã học qua project này

| Kỹ năng | Học ở đâu |
|---|---|
| Filesystem, cấu trúc thư mục | Step 1 — tạo cấu trúc project |
| vim thực tế | Step 1, 9 — tạo và sửa file |
| Pipe, redirect | Step 2, 5 — awk/grep/sort pipeline |
| grep, awk, sed | Step 5 — phân tích log |
| Bash function, variable | Step 2, 3, 6 |
| Exit code, if-else | Step 3, 4 |
| Process, PID, signal, trap | Step 6 |
| systemd service | Step 7 |
| Cron | Step 8 |
| Debug flow | Step 10 |
| Log management | Step 10 |
| Permission (chmod) | Step 10 — tình huống 1 |

---

## Mở rộng (tự làm sau)

Sau khi hoàn thành 10 step trên, thử thêm:

1. **Thêm Telegram alert** — khi có ALERT, gửi message qua Telegram Bot API bằng curl
2. **Thêm check disk inode** — `df -i` thay vì `df -h`
3. **Thêm check SSL cert expiry** — `echo | openssl s_client -connect domain:443 2>/dev/null | openssl x509 -noout -dates`
4. **Dashboard đơn giản** — script in bảng tổng kết ra terminal với màu sắc
5. **Chuyển từ bash sang Python** — cùng logic, học thêm Python scripting
