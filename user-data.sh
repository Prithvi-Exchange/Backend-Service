#!/bin/bash
set -eux

# --- Update & basic dependencies ---
apt-get update -y
apt-get upgrade -y
apt-get install -y build-essential curl git

# --- Create app user ---
useradd -m -s /bin/bash app
mkdir -p /home/app/.ssh
chmod 700 /home/app/.ssh

# --- Add GitHub Actions public key ---
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPNxDuPRbCmxBean0Nko3hbFB+s6Hb5+lcZlx6VYuxGH github-actions-deploy" > /home/app/.ssh/authorized_keys
chmod 600 /home/app/.ssh/authorized_keys
chown -R app:app /home/app/.ssh

# --- Install Node.js 20 LTS ---
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# --- Install PM2 ---
npm install -g pm2
pm2 startup systemd -u app --hp /home/app || true

# --- Install Nginx ---
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx

# --- Configure reverse proxy ---
cat > /etc/nginx/sites-available/backend <<'NGINX'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/backend /etc/nginx/sites-enabled/backend
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo "Bootstrap completed" > /var/log/bootstrap-complete
