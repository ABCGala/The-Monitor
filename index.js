const axios = require("axios");

const API_URL = "https://api-galaswap.gala.com/galachain/api";
const WALLET_ADDRESSES = [
    "client|wallet_address_1",
    "client|wallet_address_2",
    "client|wallet_address_3"
]; // Replace with your wallet addresses
const DISCORD_WEBHOOK_URL = "your-discord-webhook-url"; // Replace with your Discord webhook URL

let previousBalances = {};
let previousAllowances = {};
let intervalId;

/**
 * Sends an embedded message to Discord.
 */
async function sendDiscordEmbed(title, description, color = 3447003) {
    const embed = {
        embeds: [
            {
                title,
                description,
                color,
                timestamp: new Date().toISOString(),
                footer: { text: "Gala Chain Balance Monitor" },
            },
        ],
    };

    try {
        await axios.post(DISCORD_WEBHOOK_URL, embed, {
            headers: { "Content-Type": "application/json" },
        });
        console.log(`✅ Discord alert sent: ${title}`);
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
 * Calculates the correct initial allowance balance.
 */
async function getCorrectAllowanceBalance(wallet) {
    const allowances = await fetchAllowances(wallet);
    if (allowances === null) return null;

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
        if (currentBalance === null) continue;

        if (previousBalances[wallet] !== undefined && currentBalance !== previousBalances[wallet]) {
            const diff = currentBalance - previousBalances[wallet];
            const changeText = diff > 0 ? `🟢 +${diff.toLocaleString()}` : `🔴 ${diff.toLocaleString()}`;

            await sendDiscordEmbed(
                "💰 Gala Chain Balance Updated",
                `🔹 **Wallet:** \`${wallet}\`\n` +
                `🔹 **Previous:** ${previousBalances[wallet].toLocaleString()} GALA\n` +
                `🔹 **New:** ${currentBalance.toLocaleString()} GALA\n` +
                `🔹 **Change:** ${changeText}`,
                diff > 0 ? 0x2ecc71 : 0xe74c3c
            );
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
        if (totalRemaining === null) continue;

        if (previousAllowances[wallet] !== undefined && totalRemaining !== previousAllowances[wallet]) {
            const diff = totalRemaining - previousAllowances[wallet];
            const changeText = diff > 0 ? `🟢 +${diff.toLocaleString()}` : `🔴 ${diff.toLocaleString()}`;

            await sendDiscordEmbed(
                "📦 Treasure Chest Updated",
                `🔹 **Wallet:** \`${wallet}\`\n` +
                `🔹 **Previous:** ${previousAllowances[wallet].toLocaleString()} GALA\n` +
                `🔹 **New:** ${totalRemaining.toLocaleString()} GALA\n` +
                `🔹 **Change:** ${changeText}`,
                diff > 0 ? 0x2ecc71 : 0xe74c3c
            );
        }
        previousAllowances[wallet] = totalRemaining;
    }
}

/**
 * Handles script shutdown.
 */
async function handleShutdown() {
    await sendDiscordEmbed("🛑 Balance Monitor Stopped", "The monitoring service has been stopped.", 0xe74c3c);
    clearInterval(intervalId);
    process.exit(0);
}

/**
 * Starts the monitoring script with the correct initial balances.
 */
(async () => {
    try {
        await sendDiscordEmbed("🚀 Balance Monitor Started", "The monitoring service is now active.", 0x3498db);

        for (const wallet of WALLET_ADDRESSES) {
            // Fetch and store correct initial Gala Chain balance
            const balance = await fetchAssetBalance(wallet);
            if (balance !== null) {
                previousBalances[wallet] = balance;
                await sendDiscordEmbed(
                    "💰 Initial Gala Chain Balance",
                    `🔹 **Wallet:** \`${wallet}\`\n` +
                    `🔹 **Balance:** ${balance.toLocaleString()} GALA`,
                    0x3498db
                );
            }

            // Fetch and store correct initial Treasure Chest (allowance) balance
            const correctAllowance = await getCorrectAllowanceBalance(wallet);
            if (correctAllowance !== null) {
                previousAllowances[wallet] = correctAllowance;
                await sendDiscordEmbed(
                    "📦 Initial Treasure Chest Balance",
                    `🔹 **Wallet:** \`${wallet}\`\n` +
                    `🔹 **Balance:** ${correctAllowance.toLocaleString()} GALA`,
                    0x3498db
                );
            }
        }

        intervalId = setInterval(async () => {
            console.log("🔄 Checking balances...");
            await checkAssetBalances();
            await checkAllowanceBalances();
        }, 30000);

        process.on("SIGINT", handleShutdown);
        process.on("SIGTERM", handleShutdown);
    } catch (error) {
        console.error("❌ Script error:", error.message);
        await sendDiscordEmbed("❌ Balance Monitor Error", error.message, 0xe74c3c);
        process.exit(1);
    }
})();
