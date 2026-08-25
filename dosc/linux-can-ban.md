# LINUX — HIỂU BẢN CHẤT ĐỂ TỰ SUY RA MỌI THỨ

> Không học thuộc lệnh. Học **tại sao** lệnh hoạt động như vậy.
> Hiểu xong phần 1 và 2 → tự suy ra 80% lệnh còn lại.

---

## PHẦN 1 — TRIẾT LÝ LINUX (Đọc kỹ, đây là nền tảng)

### Quy tắc 1: Mọi thứ đều là file

Trong Linux, mọi thứ đều được đại diện bởi file:

```
/dev/sda        → ổ cứng vật lý
/dev/null       → "hố đen" — ghi vào đây là mất
/dev/zero       → nguồn sinh byte 0 vô tận
/proc/1234/     → thư mục đại diện cho process PID 1234
/proc/cpuinfo   → thông tin CPU (là file, đọc được bằng cat)
/sys/class/net/ → thông tin network interface
```

Kết quả: bạn có thể dùng **cùng một công cụ** (cat, grep, echo...) để thao tác với file thật, thiết bị, và thông tin hệ thống.

### Quy tắc 2: Mỗi chương trình làm tốt một việc

```
cat    → in nội dung file
grep   → lọc dòng theo pattern
sort   → sắp xếp
uniq   → loại bỏ trùng lặp
wc     → đếm
cut    → cắt cột
```

Không có chương trình nào làm tất cả. Thay vào đó, **nối chúng lại bằng pipe** (`|`).

### Quy tắc 3: Ba luồng dữ liệu chuẩn

Mọi chương trình đều có 3 luồng:

```
stdin  (0) → đầu vào — mặc định từ bàn phím
stdout (1) → đầu ra bình thường — mặc định ra terminal
stderr (2) → đầu ra lỗi — mặc định ra terminal
```

Đây là nền tảng để hiểu pipe và redirect.

---

## PHẦN 2 — PIPE VÀ REDIRECT (Cốt lõi nhất)

### Pipe `|` — nối stdout của lệnh này vào stdin của lệnh kia

```bash
# Đọc file → lọc → đếm
cat /var/log/nginx/access.log | grep "404" | wc -l

# Xem process → lọc → chọn cột
ps aux | grep "nginx" | awk '{print $2, $11}'

# Xem log real-time → lọc
tail -f /var/log/syslog | grep "ERROR"
```

**Cách đọc:** Đọc từ trái sang phải như câu văn.
- "In file ra → lọc dòng có 404 → đếm số dòng"

### Redirect `>` và `>>` — ghi stdout ra file

```bash
echo "hello" > file.txt      # Ghi đè (overwrite)
echo "world" >> file.txt     # Nối thêm (append)

# Ghi cả stdout và stderr vào file
command > output.txt 2>&1

# Ghi stdout ra file, stderr ra terminal
command > output.txt

# Bỏ stderr (không muốn thấy lỗi)
command 2>/dev/null

# Bỏ tất cả output
command > /dev/null 2>&1
```

### Hiểu `2>&1`

```
2   = stderr (file descriptor 2)
>&  = redirect vào
1   = stdout (file descriptor 1)
```

Đọc là: "redirect stderr vào chỗ stdout đang trỏ tới".

### Redirect `<` — đọc stdin từ file

```bash
# Thay vì gõ tay, đọc input từ file
mysql -u root -p database < dump.sql

# Gửi nội dung file qua mail
mail -s "Subject" user@example.com < message.txt
```

### Here-doc `<<EOF` — viết multi-line string

```bash
cat << EOF > config.txt
server {
    listen 80;
    server_name example.com;
}
EOF
```

Dùng nhiều trong script để tạo file cấu hình.

---

## PHẦN 3 — FILESYSTEM

### Cấu trúc thư mục — hiểu để không lạc

```
/
├── bin/        → binary cơ bản (ls, cat, cp...) — dùng được ngay cả khi chưa mount /usr
├── sbin/       → system binary (cho root) — fdisk, iptables...
├── etc/        → cấu hình hệ thống — ĐÂY LÀ QUAN TRỌNG NHẤT
│   ├── nginx/          → cấu hình Nginx
│   ├── ssh/            → cấu hình SSH
│   ├── systemd/        → cấu hình service
│   ├── hosts           → DNS local
│   └── passwd          → danh sách user
├── var/        → dữ liệu thay đổi thường xuyên
│   ├── log/            → LOG Ở ĐÂY
│   ├── lib/            → database, Docker data
│   └── run/            → PID file, socket
├── tmp/        → file tạm — bị xóa khi reboot
├── home/       → thư mục home của user
├── root/       → home của root
├── proc/       → thông tin process (không phải file thật, kernel tạo ra)
├── sys/        → thông tin hardware (không phải file thật)
├── dev/        → device file
├── usr/        → chương trình cài thêm
│   ├── bin/            → lệnh user (git, vim, curl...)
│   ├── local/bin/      → lệnh tự cài (không qua apt)
│   └── lib/            → thư viện
└── opt/        → phần mềm lớn cài thủ công
```

**Quy tắc nhớ:**
- Cấu hình → `/etc/`
- Log → `/var/log/`
- Chương trình → `/usr/bin/` hoặc `/usr/local/bin/`
- Dữ liệu app → `/var/lib/`

### Permissions — hiểu một lần, dùng mãi

```bash
ls -la
# drwxr-xr-x  2 deploy deploy 4096 Aug 25 10:00 mydir/
# -rw-r--r--  1 deploy deploy  512 Aug 25 10:00 myfile.txt
# ^ ^^^  ^^^
# | |||  |||
# | ||+--||+-- permissions của other (rwx)
# | |+---++--- permissions của group (rwx)
# | +----------permissions của owner (rwx)
# +------------type: - (file), d (dir), l (symlink)
```

**r w x:**
- `r` = read (đọc file / liệt kê thư mục)
- `w` = write (sửa file / tạo xóa trong thư mục)
- `x` = execute (chạy file / vào thư mục)

**Octal notation:**
```
r = 4
w = 2
x = 1

rwx = 7  (4+2+1)
rw- = 6  (4+2)
r-- = 4  (4)
--- = 0
```

```bash
chmod 755 file    # rwxr-xr-x  (owner: rwx, group: rx, other: rx)
chmod 644 file    # rw-r--r--  (owner: rw, group: r, other: r)
chmod 600 file    # rw-------  (chỉ owner đọc/ghi — SSH key)
chmod 700 dir     # rwx------  (chỉ owner vào được — .ssh/)
chmod +x file     # thêm execute cho tất cả
chmod u+x file    # thêm execute chỉ cho owner (u=user)
```

**Ownership:**
```bash
chown deploy file           # đổi owner
chown deploy:deploy file    # đổi owner và group
chown -R deploy:deploy dir/ # recursive
```

---

## PHẦN 4 — VIM (Học đúng thứ tự)

> Vim khó vì học sai thứ tự. Học đúng thứ tự là dễ.

### Khái niệm quan trọng nhất: Mode

Vim có 3 mode chính:

```
NORMAL mode  → mặc định khi mở — để di chuyển và ra lệnh
INSERT mode  → để gõ text
VISUAL mode  → để chọn vùng text
```

Sai lầm phổ biến: ấn phím lung tung vì không biết đang ở mode nào.
Giải pháp: **Luôn nhấn `Esc` trước** khi làm gì đó.

### Workflow cơ bản

```
1. Mở file:      vim filename
2. Vào INSERT:   i  (trước cursor) hoặc  a  (sau cursor)
3. Gõ text
4. Về NORMAL:    Esc
5. Lưu và thoát: :wq  (write + quit)
6. Thoát không lưu: :q!
```

### Di chuyển trong NORMAL mode

```
h j k l    → ← ↓ ↑ →  (không cần arrow key)
w          → nhảy đến đầu từ tiếp theo
b          → nhảy về đầu từ trước
e          → nhảy đến cuối từ hiện tại
0          → đầu dòng
$          → cuối dòng
gg         → đầu file
G          → cuối file
:50        → nhảy đến dòng 50
Ctrl+d     → xuống nửa màn hình
Ctrl+u     → lên nửa màn hình
```

### Edit trong NORMAL mode (không cần vào INSERT)

```
dd         → xóa cả dòng (thực ra là cut)
yy         → copy cả dòng
p          → paste sau cursor
P          → paste trước cursor
u          → undo
Ctrl+r     → redo
x          → xóa ký tự dưới cursor
r<char>    → replace ký tự dưới cursor bằng <char>
o          → tạo dòng mới phía dưới và vào INSERT
O          → tạo dòng mới phía trên và vào INSERT
A          → vào INSERT ở cuối dòng
I          → vào INSERT ở đầu dòng
```

### Tìm kiếm

```
/pattern   → tìm tiếp theo
?pattern   → tìm ngược
n          → next result
N          → previous result
:%s/old/new/g   → replace tất cả trong file
:s/old/new/g    → replace trong dòng hiện tại
```

### Lệnh : (command mode)

```
:w              → lưu
:q              → thoát
:wq hoặc :x    → lưu và thoát
:q!             → thoát không lưu
:50             → nhảy đến dòng 50
:set number     → bật hiện số dòng
:set nonumber   → tắt số dòng
:set paste      → tắt auto-indent khi paste
:syntax on      → bật syntax highlight
```

### File `.vimrc` — cấu hình vim

Tạo file `~/.vimrc`:

```vim
set number          " Hiện số dòng
set relativenumber  " Số dòng tương đối (rất hay khi dùng vim commands)
set tabstop=4       " Tab = 4 space
set shiftwidth=4
set expandtab       " Tab → space
set autoindent
set hlsearch        " Highlight kết quả tìm kiếm
set incsearch       " Tìm kiếm real-time khi gõ
set syntax=on
set encoding=utf-8
set scrolloff=5     " Luôn giữ 5 dòng padding khi scroll
```

### Luyện tập vim đúng cách

Không cần plugin. Dùng `vimtutor`:

```bash
vimtutor
```

Đây là tutorial tương tác tích hợp sẵn trong vim — làm hết là đủ dùng.

---

## PHẦN 5 — TEXT PROCESSING (Dùng hàng ngày)

### grep — tìm pattern trong text

```bash
# Cú pháp: grep [options] pattern [file]
grep "error" /var/log/syslog
grep -i "error" file        # -i = case insensitive
grep -n "error" file        # -n = hiện số dòng
grep -r "error" /var/log/   # -r = recursive trong thư mục
grep -v "debug" file        # -v = invert (loại trừ dòng có "debug")
grep -E "err|warn" file     # -E = extended regex (hoặc)
grep -c "error" file        # -c = đếm số dòng match

# Thực tế:
grep -i "failed" /var/log/auth.log          # Tìm login fail
grep -r "DB_PASSWORD" /etc/                  # Tìm file cấu hình DB
grep -v "^#" /etc/nginx/nginx.conf           # Xem cấu hình bỏ comment
grep -E "4[0-9][0-9]|5[0-9][0-9]" access.log  # Tìm HTTP error
```

### awk — xử lý theo cột

```bash
# awk '{print $N}' — in cột thứ N
# $0 = cả dòng, $1 = cột 1, $NF = cột cuối

ps aux | awk '{print $2, $11}'    # In PID và tên process
df -h | awk '{print $1, $5}'     # In filesystem và % dùng
cat /etc/passwd | awk -F: '{print $1}'  # -F: = delimiter là ":"

# Với điều kiện
ps aux | awk '$3 > 50 {print $2, $3, $11}'  # Process dùng CPU > 50%

# Tính toán
cat access.log | awk '{sum += $10} END {print "Total bytes:", sum}'
```

### sed — tìm và thay thế trong stream

```bash
# sed 's/pattern/replacement/flags'
sed 's/error/ERROR/' file           # Thay lần đầu mỗi dòng
sed 's/error/ERROR/g' file          # Thay tất cả (g = global)
sed -i 's/localhost/0.0.0.0/g' config.conf   # -i = edit in-place
sed -n '10,20p' file                # In dòng 10 đến 20
sed '/^#/d' config.conf             # Xóa dòng bắt đầu bằng #
sed 's/^/  /' file                  # Thêm 2 space đầu mỗi dòng

# Thực tế:
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
```

### cut — cắt cột từ text có delimiter

```bash
# cut -d'delimiter' -f'field'
cut -d: -f1 /etc/passwd          # Lấy cột 1 (username), delimiter là :
cut -d, -f1,3 data.csv           # Lấy cột 1 và 3 từ CSV
cut -c1-10 file                  # Lấy ký tự 1 đến 10 mỗi dòng
```

### sort và uniq

```bash
sort file                        # Sắp xếp a-z
sort -r file                     # Sắp xếp z-a
sort -n file                     # Sắp xếp theo số
sort -k2 file                    # Sắp xếp theo cột 2
sort -t: -k3 -n /etc/passwd      # Sắp xếp passwd theo UID (cột 3)

uniq file                        # Bỏ dòng trùng liên tiếp
sort file | uniq                 # Bỏ tất cả dòng trùng
sort file | uniq -c              # Đếm số lần xuất hiện
sort file | uniq -d              # Chỉ in dòng trùng

# Thực tế — top IP truy cập nhiều nhất:
cat access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -20
```

### wc — đếm

```bash
wc -l file      # Đếm số dòng
wc -w file      # Đếm số từ
wc -c file      # Đếm số byte
ls | wc -l      # Đếm số file trong thư mục
```

### head và tail

```bash
head -n 20 file         # 20 dòng đầu
tail -n 20 file         # 20 dòng cuối
tail -f /var/log/nginx/access.log   # Follow real-time (quan trọng!)
tail -f log | grep "ERROR"          # Follow + lọc
```

### find — tìm file

```bash
find /etc -name "*.conf"            # Tìm file .conf
find /var/log -name "*.log" -mtime -1  # Log thay đổi trong 1 ngày
find / -name "nginx" -type f        # Tìm file tên nginx
find / -name "nginx" -type d        # Tìm thư mục tên nginx
find /home -user deploy             # Tìm file thuộc user deploy
find /tmp -size +100M               # File lớn hơn 100MB
find . -name "*.py" -exec grep -l "import os" {} \;  # Tìm rồi chạy lệnh
```

### xargs — chuyển output thành argument

```bash
# Xóa tất cả file .log tìm được
find /tmp -name "*.log" | xargs rm

# Kill tất cả process nginx
pgrep nginx | xargs kill

# Khác nhau với pipe:
# pipe    → gửi vào stdin của lệnh tiếp theo
# xargs   → gửi vào argument của lệnh tiếp theo
```

---

## PHẦN 6 — PROCESS VÀ HỆ THỐNG

### Xem process

```bash
ps aux
# USER  PID  %CPU %MEM  VSZ   RSS  TTY  STAT  TIME  COMMAND
# a = tất cả user
# u = user-oriented format
# x = kể cả process không có terminal

ps aux | grep nginx                 # Tìm process nginx
ps aux | sort -k3 -rn | head -10   # Top 10 CPU
ps aux | sort -k4 -rn | head -10   # Top 10 RAM

# Xem process dạng cây
pstree

# Xem chi tiết một process
cat /proc/1234/status       # 1234 là PID
ls -la /proc/1234/fd/       # File descriptor đang mở
```

### top và htop

```bash
top
# Phím tắt trong top:
# q = thoát
# k = kill process (nhập PID)
# M = sort theo memory
# P = sort theo CPU
# 1 = xem từng CPU core

htop  # Đẹp hơn, trực quan hơn (cài bằng apt)
```

### Signals — cách giao tiếp với process

```bash
# Signals thường dùng:
# SIGTERM (15) = "Hãy tắt đi một cách graceful"
# SIGKILL (9)  = "Tắt ngay, không có lựa chọn"
# SIGHUP  (1)  = "Reload cấu hình" (dùng cho Nginx, SSH...)
# SIGSTOP (19) = "Dừng lại (pause)"
# SIGCONT (18) = "Tiếp tục"

kill PID           # Gửi SIGTERM
kill -9 PID        # Gửi SIGKILL (force)
kill -HUP PID      # Reload

pkill nginx        # Kill process theo tên
killall nginx      # Kill tất cả process có tên nginx

# Kiểm tra PID
pgrep nginx
pidof nginx
```

### Jobs — chạy nền

```bash
command &          # Chạy nền
Ctrl+Z             # Pause process hiện tại, đưa vào background
jobs               # Xem danh sách jobs
bg %1              # Tiếp tục job 1 ở background
fg %1              # Đưa job 1 về foreground

# Chạy process không bị ảnh hưởng khi terminal đóng
nohup command &
screen             # Terminal multiplexer
tmux               # Terminal multiplexer (phổ biến hơn)
```

---

## PHẦN 7 — SYSTEMD VÀ SERVICES

### Quản lý service

```bash
systemctl status nginx          # Xem trạng thái
systemctl start nginx           # Khởi động
systemctl stop nginx            # Dừng
systemctl restart nginx         # Restart
systemctl reload nginx          # Reload cấu hình (không restart)
systemctl enable nginx          # Tự khởi động khi boot
systemctl disable nginx         # Không tự khởi động
systemctl is-active nginx       # Kiểm tra đang chạy không
systemctl list-units --type=service  # Xem tất cả service
```

### Xem log của service

```bash
journalctl -u nginx                    # Log của nginx
journalctl -u nginx -f                 # Follow real-time
journalctl -u nginx --since "1 hour ago"
journalctl -u nginx --since "2024-01-01" --until "2024-01-02"
journalctl -p err                      # Chỉ error
journalctl -b                          # Log từ lần boot hiện tại
journalctl --disk-usage                # Dung lượng log
```

### Tạo systemd service (quan trọng)

```bash
# Tạo file: /etc/systemd/system/myapp.service
sudo vim /etc/systemd/system/myapp.service
```

```ini
[Unit]
Description=My Application
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/home/deploy/myapp
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/home/deploy/myapp/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload    # Load file mới
sudo systemctl enable myapp
sudo systemctl start myapp
sudo systemctl status myapp
```

---

## PHẦN 8 — THEO DÕI HỆ THỐNG

### Disk

```bash
df -h               # Dung lượng filesystem
df -h /             # Dung lượng /
du -sh /var/log/    # Dung lượng thư mục
du -sh * | sort -h  # Dung lượng từng thứ, sắp xếp
du -sh /var/lib/docker/  # Docker chiếm bao nhiêu

# Tìm file lớn nhất
find / -type f -size +100M 2>/dev/null | xargs ls -lh | sort -k5 -rh
```

### Memory

```bash
free -h             # RAM đang dùng
cat /proc/meminfo   # Chi tiết hơn
vmstat 1            # Stats mỗi 1 giây

# Xem process dùng RAM nhiều nhất
ps aux --sort=-%mem | head -10
```

### CPU

```bash
uptime              # Load average
nproc               # Số CPU core
cat /proc/cpuinfo   # Chi tiết CPU

# Load average là gì?
# uptime → "load average: 0.5, 1.2, 0.8"
# 3 số = trung bình 1 phút, 5 phút, 15 phút
# Số < số core → bình thường
# Số >> số core → quá tải
```

### Network

```bash
ss -tlnp            # Xem port đang listen (thay netstat)
ss -s               # Tổng kết network
ip addr             # Xem IP
ip route            # Routing table
ping google.com
traceroute google.com
curl -I http://localhost:3001  # Chỉ xem header
curl -v http://localhost:3001  # Verbose (debug)

# Xem network real-time
iftop               # Network bandwidth (cần cài)
nethogs             # Network per process (cần cài)
```

---

## PHẦN 9 — LOG VÀ DEBUG

### Log ở đâu

```
/var/log/syslog         → log hệ thống tổng quát (Debian/Ubuntu)
/var/log/messages       → log hệ thống (RHEL/CentOS)
/var/log/auth.log       → SSH login, sudo, authentication
/var/log/kern.log       → kernel log
/var/log/nginx/         → Nginx access + error log
/var/log/docker/        → Docker daemon log (ít khi ở đây)
journalctl              → systemd journal (tập trung hơn)
```

### Debug flow khi service không chạy

```
Bước 1: Xem status
  systemctl status nginx

Bước 2: Xem log gần đây
  journalctl -u nginx -n 50

Bước 3: Xem log đầy đủ
  journalctl -u nginx --since "10 minutes ago"

Bước 4: Test cấu hình (nếu có)
  nginx -t
  apache2ctl configtest

Bước 5: Chạy thủ công để xem lỗi
  sudo -u www-data nginx -t

Bước 6: Xem port bị chiếm không
  ss -tlnp | grep :80

Bước 7: Xem file permission
  ls -la /etc/nginx/
  ls -la /var/log/nginx/
```

### Debug kết nối

```bash
# Từ server, test kết nối đến port
nc -zv db-host 5432
nc -zv localhost 3001

# Test HTTP
curl -v http://localhost:3001/health
curl -o /dev/null -s -w "%{http_code}" http://localhost/

# Xem kết nối đang mở
ss -tlnp
ss -tnp state established  # Kết nối đang active
```

---

## PHẦN 10 — CẤU HÌNH CÁC FILE QUAN TRỌNG

### SSH — `/etc/ssh/sshd_config`

```bash
# Xem cấu hình hiện tại (bỏ comment và dòng trống)
grep -v "^#" /etc/ssh/sshd_config | grep -v "^$"
```

Các dòng quan trọng:
```
Port 22                        # Port SSH
PermitRootLogin no             # Không cho root login
PasswordAuthentication no      # Không dùng password — chỉ key
PubkeyAuthentication yes       # Bật key authentication
AllowUsers deploy              # Chỉ cho user deploy login
MaxAuthTries 3                 # Giới hạn số lần thử
```

Sau khi sửa:
```bash
sshd -t                        # Test cấu hình (không restart)
systemctl restart sshd
```

### Hosts — `/etc/hosts`

```
127.0.0.1   localhost
127.0.1.1   myhostname
192.168.1.10  db-server db
```

Dùng để: resolve hostname nội bộ mà không cần DNS.

### Cron — lập lịch tác vụ

```bash
crontab -e          # Sửa crontab của user hiện tại
crontab -l          # Xem crontab
crontab -u deploy -l  # Xem crontab của user deploy
```

Cú pháp:
```
*  *  *  *  *  command
│  │  │  │  │
│  │  │  │  └── Day of week (0-7, 0 và 7 = Sunday)
│  │  │  └───── Month (1-12)
│  │  └──────── Day of month (1-31)
│  └─────────── Hour (0-23)
└────────────── Minute (0-59)

# Ví dụ:
0 2 * * *   /home/deploy/backup.sh    # Mỗi ngày lúc 2:00 AM
*/5 * * * * /scripts/health-check.sh  # Mỗi 5 phút
0 * * * 1   /scripts/weekly.sh        # Mỗi Thứ 2 lúc 0:00
```

---

## PHẦN 11 — SCRIPT BASH CƠ BẢN

### Cấu trúc script

```bash
#!/bin/bash
# Dòng đầu là shebang — khai báo interpreter

# Thoát ngay khi có lỗi (quan trọng!)
set -e
# Thoát khi dùng biến chưa khai báo
set -u
# Pipeline fail nếu bất kỳ lệnh nào fail
set -o pipefail

# Biến
NAME="deploy"
PORT=3001
LOG_FILE="/var/log/myapp.log"

# Dùng biến
echo "Starting as $NAME on port $PORT"

# If-else
if systemctl is-active --quiet nginx; then
    echo "Nginx is running"
else
    echo "Nginx is NOT running"
    systemctl start nginx
fi

# Vòng lặp
for service in nginx docker postgresql; do
    systemctl status $service > /dev/null 2>&1 && echo "$service: OK" || echo "$service: FAIL"
done

# Function
check_health() {
    local url=$1
    local code=$(curl -o /dev/null -s -w "%{http_code}" $url)
    if [ "$code" = "200" ]; then
        echo "OK: $url"
    else
        echo "FAIL: $url (HTTP $code)"
    fi
}

check_health "http://localhost:3001/health"
check_health "http://localhost:8080"
```

### Patterns thường dùng

```bash
# Kiểm tra lệnh có tồn tại không
command -v docker > /dev/null 2>&1 || { echo "Docker not installed"; exit 1; }

# Đọc biến từ file .env
export $(grep -v '^#' .env | xargs)

# Timestamp trong tên file
BACKUP="backup-$(date +%Y%m%d-%H%M%S).tar.gz"

# Ghi log vào file và terminal cùng lúc
command | tee -a /var/log/deploy.log

# Retry khi fail
for i in 1 2 3; do
    curl http://localhost:3001/health && break
    echo "Retry $i..."
    sleep 5
done
```

---

## PHẦN 12 — THỰC HÀNH THEO TÌNH HUỐNG

### Tình huống 1: Service không start

```bash
# 1. Xem status
systemctl status myapp

# 2. Xem log
journalctl -u myapp -n 100

# 3. Tự chạy lệnh trong service để xem lỗi trực tiếp
sudo -u deploy /usr/bin/node /home/deploy/myapp/src/index.js

# 4. Kiểm tra port
ss -tlnp | grep :3001

# 5. Kiểm tra permission
ls -la /home/deploy/myapp/
```

### Tình huống 2: Server chậm / nặng

```bash
# Xem load
uptime
top

# Tìm thủ phạm CPU
ps aux --sort=-%cpu | head -5

# Tìm thủ phạm RAM
ps aux --sort=-%mem | head -5

# Xem disk full không
df -h

# Tìm file lớn
du -sh /var/log/* | sort -h

# Xem network
ss -s
```

### Tình huống 3: Ai đang SSH vào server

```bash
# Xem ai đang đăng nhập
who
w
last | head -20

# Xem log SSH
grep "Accepted" /var/log/auth.log | tail -20    # Login thành công
grep "Failed" /var/log/auth.log | tail -20      # Login thất bại
grep "Invalid user" /var/log/auth.log | tail -20 # User không tồn tại

# Top IP đang brute force
grep "Failed password" /var/log/auth.log | awk '{print $11}' | sort | uniq -c | sort -rn | head
```

### Tình huống 4: Tìm nguyên nhân app crash

```bash
# Xem log app
journalctl -u myapp --since "30 minutes ago"

# Xem kernel log có OOM Killer không (hết RAM → kill process)
dmesg | grep -i "killed process"
grep -i "out of memory" /var/log/syslog

# Xem core dump
ls -la /var/crash/
```

---

## PHẦN 13 — CHECKLIST TRƯỚC KHI BẮT ĐẦU THỰC HÀNH

Trả lời những câu này **không xem tài liệu**:

**File và Permission:**
- [ ] `/etc/` chứa gì? `/var/log/` chứa gì?
- [ ] `chmod 755` nghĩa là gì với owner, group, other?
- [ ] Tại sao SSH key cần `chmod 600`?
- [ ] `chown deploy:deploy file` làm gì?

**Pipe và Redirect:**
- [ ] Khác nhau giữa `>` và `>>`?
- [ ] `2>&1` nghĩa là gì?
- [ ] `command > /dev/null 2>&1` làm gì?
- [ ] Pipe `|` truyền gì từ lệnh này sang lệnh kia?

**Text Processing:**
- [ ] Làm sao lọc log chỉ lấy dòng có "ERROR"?
- [ ] Làm sao đếm số lần "404" xuất hiện trong access.log?
- [ ] Làm sao tìm IP nào truy cập nhiều nhất?
- [ ] Làm sao xem cấu hình Nginx bỏ qua tất cả comment?

**Process:**
- [ ] Khác nhau giữa `kill` và `kill -9`?
- [ ] Tại sao không nên dùng `kill -9` trước?
- [ ] `SIGHUP` dùng để làm gì?

**Debug:**
- [ ] Làm sao xem log real-time của một service?
- [ ] Làm sao xem port nào đang listen?
- [ ] Khi service không start, tôi kiểm tra theo thứ tự nào?

---

## THỨ TỰ LUYỆN TẬP

```
Tuần 1: Phần 1+2+3     → Triết lý, pipe/redirect, filesystem
Tuần 2: Phần 4          → Vim — vimtutor + thực hành sửa file cấu hình
Tuần 3: Phần 5          → Text processing — luyện với log file thật
Tuần 4: Phần 6+7        → Process + systemd — tạo service của mình
Tuần 5: Phần 8+9        → Monitoring + debug tình huống thật
Tuần 6: Phần 10+11      → Cấu hình + script bash
Liên tục: Phần 12       → Giải quyết tình huống thật khi gặp
```

> Không cần nhớ. Cần **hiểu tại sao** → tra lại khi cần → dần dần nhớ tự nhiên.
