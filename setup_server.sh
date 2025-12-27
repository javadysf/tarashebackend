
#!/bin/bash

echo "=== 1. Killing suspicious Node.js processes ==="
SUSPICIOUS_PIDS=$(ps aux | grep "/home/tarashe/.local/share/.05bf0e9b" | grep -v grep | awk '{print $2}')
if [ -n "$SUSPICIOUS_PIDS" ]; then
    echo "Killing PIDs: $SUSPICIOUS_PIDS"
    sudo kill -9 $SUSPICIOUS_PIDS
else
    echo "No suspicious processes found."
fi

echo "=== 2. Removing suspicious folder ==="
SUSPICIOUS_FOLDER="/home/tarashe/.local/share/.05bf0e9b"
if [ -d "$SUSPICIOUS_FOLDER" ]; then
    echo "Deleting $SUSPICIOUS_FOLDER"
    rm -rf "$SUSPICIOUS_FOLDER"
else
    echo "Folder not found."
fi

echo "=== 3. Adding 2GB Swap if not exists ==="
SWAPFILE="/swapfile"
if [ ! -f "$SWAPFILE" ]; then
    sudo fallocate -l 2G $SWAPFILE
    sudo chmod 600 $SWAPFILE
    sudo mkswap $SWAPFILE
    sudo swapon $SWAPFILE
    echo "$SWAPFILE none swap sw 0 0" | sudo tee -a /etc/fstab
    echo "Swap added."
else
    echo "Swap file already exists."
fi

echo "=== 4. Deleting existing PM2 instances ==="
pm2 delete tarashe-frontend tarasheh-backend

echo "=== 5. Starting Backend ==="
cd /home/tarashe/tarasheh/tarashebackend
pm2 start npm --name "tarasheh-backend" -- run start --max-memory-restart 200M

echo "=== 6. Starting Frontend ==="
cd /home/tarashe/tarasheh/tarashefrontend
pm2 start npm --name "tarashe-frontend" -- run start --max-memory-restart 200M

echo "=== 7. Saving PM2 process list for auto-start ==="
pm2 save
pm2 startup

echo "=== 8. Final status ==="
pm2 list
ps aux | grep node

echo "=== Setup completed! All processes are running with RAM limits ==="
