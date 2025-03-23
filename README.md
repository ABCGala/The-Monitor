# 📌 The-Monitor: Gala Chain & Treasure Chest Balance Monitor  

## Overview  
The-Monitor is a **Node.js** bot developed by **ABC** that monitors your **Gala Chain balance** and **Treasure Chest (allowance) balance** in real-time. It sends **Discord notifications** when your balances change.  

### Features  
✅ **Tracks Gala Chain balance** (`GALA` tokens)  
✅ **Monitors Treasure Chest (allowances)** and updates when allocations change  
✅ **Sends real-time alerts** to a **Discord webhook**  
✅ **Formatted notifications** showing previous and new balances with color-coded changes  
✅ **Supports background execution with PM2**  

---

## 🚀 Installation & Setup  

### 1️⃣ Install Node.js  
You need **Node.js** and **npm** installed to run The-Monitor.  

#### On Linux/macOS  
Run the following commands to install Node.js:  
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```
Or using **Homebrew** on macOS:  
```bash
brew install node
```

#### On Windows  
Download and install Node.js from:  
[https://nodejs.org/en/download/](https://nodejs.org/en/download/)  

To verify installation, run:  
```bash
node -v
npm -v
```

---

### 2️⃣ Download & Setup The-Monitor  
You can install **The-Monitor** using any of the following methods:  

#### Option 1: Clone from GitHub  
```bash
git clone https://github.com/ABCGala/The-Monitor
cd The-Monitor
```

#### Option 2: Download ZIP  
1. Download the latest version from **GitHub**.  
2. Extract the ZIP file and navigate to the folder.  

---

### 3️⃣ Install Dependencies  
```bash
npm install
```

---

### 4️⃣ Configure Your Wallet & Webhook  
Edit the configuration file (`config.js`) or modify `index.js` directly:  
- **Set your GalaChain wallet address**  
- **Set your Discord webhook URL**  

Example:  
```js
const WALLET_ADDRESS = "client|your_wallet_address";
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/your_webhook";
```

---

## ▶️ Running The-Monitor  

### On Linux/macOS  
Run the bot:  
```bash
node index.js
```
To keep it running in the background:  
```bash
nohup node index.js &  
```
To stop it:  
```bash
pkill -f "node index.js"
```

---

### On Windows  
Run:  
```bash
node index.js
```
To run in the background:  
1. Open **Command Prompt (cmd)**  
2. Run:  
   ```bash
   start /B node index.js
   ```
3. To stop the bot, find the process:  
   ```bash
   tasklist | find "node"
   ```
   Then terminate it:  
   ```bash
   taskkill /F /PID <Process_ID>
   ```

---

## 🛠 Running The-Monitor with PM2 (Recommended for Continuous Execution)  

To keep **The-Monitor** running automatically, use **PM2**:  

### 1️⃣ Install PM2  
```bash
npm install -g pm2
```

### 2️⃣ Start The-Monitor  
```bash
pm2 start index.js --name The-Monitor
```

### 3️⃣ Check Logs & Status  
```bash
pm2 logs The-Monitor
pm2 status
```

### 4️⃣ Restart Automatically on Reboot  
Run:  
```bash
pm2 startup
```
Then execute the command PM2 provides to enable auto-start.  

### 5️⃣ Stop or Restart The-Monitor  
```bash
pm2 stop The-Monitor  # Stop the bot
pm2 restart The-Monitor  # Restart the bot
pm2 delete The-Monitor  # Remove from PM2
```

---

## 📜 Logs & Errors  
If the bot encounters errors, they will be logged in the console.  
To save logs to a file manually:  
```bash
node index.js > monitor.log 2>&1 &
```

---

## 🛑 Stopping The-Monitor  
- **Linux/macOS**: `pkill -f "node index.js"`  
- **Windows**: `taskkill /F /PID <Process_ID>`  
- **PM2**: `pm2 stop The-Monitor`  

---

## 💰 Donations  
If you find **The-Monitor** useful, consider supporting the project:  
**Donate: eth|8C1C40a9df32D7460cb387FBf6Ede6cD9Ec5689e**  

---

Developed by **ABC**. Enjoy tracking your Gala Chain assets with **The-Monitor! 🚀**  
