const axios = require("axios");

const API_URL = "https://api-galaswap.gala.com/galachain/api";
const WALLET_ADDRESSES = [
    "client|wallet_address_1",
    "client|wallet_address_2"
]; // Replace with your wallet addresses
const DISCORD_WEBHOOK_URL = "your-discord-webhook-url"; // Replace with your Discord webhook URL

let previousBalances = {};
let previousAllowances = {};
let intervalId;

/**
 * Sends a formatted embed message to Discord.
 */
async function sendDiscordEmbed(title, description, color) {
    try {
        const payload = {
            embeds: [{
                title: title,
                description: description,
                color: color,
                timestamp: new Date().toISOString()
            }]
        };

        await axios.post(DISCORD_WEBHOOK_URL, payload, {
            headers: { "Content-Type": "application/json" },
        });

        console.log("✅ Discord alert sent:", title);
    } catch (error) {
        console.error("❌ Failed to send Discord alert:", error.message);
    }
}

/**
 * Fetches the GALA asset balance for a specific wallet.
 */
async function fetchAssetBalance(wallet) {
    const params = {
        additionalKey: "none",
        category: "Unit",
        collection: "GALA",
        instance: "0",
        owner: wallet,
        type: "none",
    };

    try {
        const response = await axios.post(`${API_URL}/asset/token-contract/FetchBalances`, params, {
            headers: { "Content-Type": "application/json" },
        });

        if (!response.data || !response.data.Data) return null;

        const data = response.data.Data.find(token => token.collection === "GALA");
        return data ? parseFloat(data.quantity) : 0;
    } catch (error) {
        console.error(`❌ Failed to fetch asset balance for ${wallet}:`, error.response?.data || error.message);
        return null;
    }
}

/**
 * Fetches the GALA allowances for a specific wallet.
 */
async function fetchAllowances(wallet) {
    const params = {
        grantedTo: wallet,
        collection: "GALA",
    };

    try {
        const response = await axios.post(`${API_URL}/asset/token-contract/FetchAllowances`, params, {
            headers: { "Content-Type": "application/json" },
        });

        if (!response.data || !response.data.Data) return null;

        return response.data.Data;
    } catch (error) {
        console.error(`❌ Failed to fetch allowances for ${wallet}:`, error.response?.data || error.message);
        return null;
    }
}

/**
 * Fetches and calculates the correct initial allowance balance.
 */
async function getCorrectAllowanceBalance(wallet) {
    const allowances = await fetchAllowances(wallet);
    if (allowances === null) return 0;

    let totalRemaining = 0;
    const currentTime = Date.now();

    allowances.forEach(allowance => {
        const quantity = parseFloat(allowance.quantity) || 0;
        const quantitySpent = parseFloat(allowance.quantitySpent) || 0;
        const remaining = quantity - quantitySpent;
        if (remaining > 0 && (allowance.expires === 0 || allowance.expires > currentTime)) {
            totalRemaining += remaining;
        }
    });

    return totalRemaining;
}

/**
 * Checks and updates the asset balance for all wallets.
 */
async function checkAssetBalances() {
    for (const wallet of WALLET_ADDRESSES) {
        const currentBalance = await fetchAssetBalance(wallet);
        if (currentBalance === null) continue; // Skip if the API failed

        if (previousBalances[wallet] !== undefined && currentBalance !== previousBalances[wallet]) {
            const diff = currentBalance - previousBalances[wallet];
            if (Math.abs(diff) > 0.0001) { // Ensure there's a significant change
                await sendDiscordEmbed(
                    "💰 Gala Chain Balance Updated",
                    `🔹 **Wallet:** \`${wallet}\`\n🔹 **Previous:** ${previousBalances[wallet].toLocaleString()} GALA\n🔹 **New:** ${currentBalance.toLocaleString()} GALA\n🔹 **Difference:** ${diff.toLocaleString()} GALA`,
                    0x2ECC71 // Green color
                );
            }
        }
        previousBalances[wallet] = currentBalance;
    }
}

/**
 * Checks and updates the allowance balance for all wallets.
 */
async function checkAllowanceBalances() {
    for (const wallet of WALLET_ADDRESSES) {
        const totalRemaining = await getCorrectAllowanceBalance(wallet);

        if (previousAllowances[wallet] !== undefined && totalRemaining !== previousAllowances[wallet]) {
            const diff = totalRemaining - previousAllowances[wallet];
            if (Math.abs(diff) > 0.0001) { // Ensure there's a significant change
                await sendDiscordEmbed(
                    "📦 Treasure Chest Updated",
                    `🔹 **Wallet:** \`${wallet}\`\n🔹 **Previous:** ${previousAllowances[wallet].toLocaleString()} GALA\n🔹 **New:** ${totalRemaining.toLocaleString()} GALA\n🔹 **Difference:** ${diff.toLocaleString()} GALA`,
                    0xF1C40F // Yellow color
                );
            }
        }
        previousAllowances[wallet] = totalRemaining;
    }
}

/**
 * Handles script shutdown.
 */
async function handleShutdown() {
    await sendDiscordEmbed("🛑 Balance Monitor Stopped", "The monitoring service has been stopped.", 0xE74C3C);
    clearInterval(intervalId);
    process.exit(0);
}

/**
 * Starts the monitoring script with the correct initial balances.
 */
(async () => {
    try {
        await sendDiscordEmbed("🚀 Balance Monitor Started", "The monitoring service is now active.", 0x3498DB);

        for (const wallet of WALLET_ADDRESSES) {
            // Fetch and store correct initial Gala Chain balance
            const balance = await fetchAssetBalance(wallet);
            if (balance !== null) {
                previousBalances[wallet] = balance;
                await sendDiscordEmbed("💰 Initial Gala Chain Balance", `🔹 **Wallet:** \`${wallet}\`\n🔹 **Balance:** ${balance.toLocaleString()} GALA`, 0x2ECC71);
            }

            // Fetch and store correct initial Treasure Chest (allowance) balance
            const correctAllowance = await getCorrectAllowanceBalance(wallet);
            previousAllowances[wallet] = correctAllowance;
            await sendDiscordEmbed("📦 Initial Treasure Chest", `🔹 **Wallet:** \`${wallet}\`\n🔹 **Balance:** ${correctAllowance.toLocaleString()} GALA`, 0xF1C40F);
        }

        intervalId = setInterval(async () => {
            console.log("🔄 Checking balances...");
            await checkAssetBalances();
            await checkAllowanceBalances();
        }, 30000); // 30 seconds

        process.on("SIGINT", handleShutdown);
        process.on("SIGTERM", handleShutdown);
    } catch (error) {
        console.error("❌ Script error:", error.message);
        await sendDiscordEmbed("❌ Balance Monitor Error", error.message, 0xE74C3C);
        process.exit(1);
    }
})();
