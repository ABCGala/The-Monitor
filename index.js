const axios = require("axios");

const API_URL = "https://api-galaswap.gala.com/galachain/api";
const WALLET_ADDRESS = "your-wallet-address"; // Replace with your wallet address
const DISCORD_WEBHOOK_URL = "your-discord-webhook-url"; // Replace with your Discord webhook URL

let previousAssetBalance = 0;
let previousAllowanceBalance = 0;
let intervalId;

/**
 * Sends a styled message to Discord.
 */
async function sendDiscordAlert(title, description, color = 3447003) {
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
 * Fetches the Gala Chain balance.
 */
async function fetchAssetBalance() {
    const params = {
        additionalKey: "none",
        category: "Unit",
        collection: "GALA",
        instance: "0",
        owner: WALLET_ADDRESS,
        type: "none",
    };

    try {
        console.log("🔍 Fetching Gala Chain balance...");
        const response = await axios.post(`${API_URL}/asset/token-contract/FetchBalances`, params, {
            headers: { "Content-Type": "application/json" },
        });

        if (!response.data || !response.data.Data) {
            throw new Error("Invalid API response: Missing Data field");
        }

        const data = response.data.Data.find(token => token.collection === "GALA");
        return data ? parseFloat(data.quantity) : 0;
    } catch (error) {
        console.error("❌ Failed to fetch asset balance:", error.response?.data || error.message);
        return 0;
    }
}

/**
 * Fetches the Treasure Chest (allowance) balance.
 */
async function fetchAllowances() {
    const params = {
        grantedTo: WALLET_ADDRESS,
        collection: "GALA",
    };

    try {
        console.log("🔍 Fetching Treasure Chest...");
        const response = await axios.post(`${API_URL}/asset/token-contract/FetchAllowances`, params, {
            headers: { "Content-Type": "application/json" },
        });

        if (!response.data || !response.data.Data) {
            throw new Error("Invalid API response: Missing Data field");
        }

        return response.data.Data;
    } catch (error) {
        console.error("❌ Failed to fetch allowances:", error.response?.data || error.message);
        return [];
    }
}

/**
 * Computes the actual remaining Treasure Chest balance.
 */
async function computeAllowanceBalance() {
    const allowances = await fetchAllowances();
    let totalRemaining = 0;

    allowances.forEach(allowance => {
        const quantity = parseFloat(allowance.quantity) || 0;
        const quantitySpent = parseFloat(allowance.quantitySpent) || 0;
        const remaining = quantity - quantitySpent;
        if (remaining > 0) totalRemaining += remaining;
    });

    return totalRemaining;
}

/**
 * Checks and updates the Gala Chain balance.
 */
async function checkAssetBalance() {
    const currentBalance = await fetchAssetBalance();

    if (currentBalance !== previousAssetBalance) {
        const difference = currentBalance - previousAssetBalance;
        const changeText = difference > 0 ? `🟢 +${difference}` : `🔴 ${difference}`;

        await sendDiscordAlert(
            "🪙 Gala Chain Balance Updated",
            `**Previous Balance:** ${previousAssetBalance} GALA\n**New Balance:** ${currentBalance} GALA\n**Change:** ${changeText}`,
            difference > 0 ? 0x2ecc71 : 0xe74c3c
        );

        previousAssetBalance = currentBalance;
    }
}

/**
 * Checks and updates the Treasure Chest balance.
 */
async function checkAllowanceBalance() {
    const totalRemaining = await computeAllowanceBalance();

    if (totalRemaining !== previousAllowanceBalance) {
        const difference = totalRemaining - previousAllowanceBalance;
        const changeText = difference > 0 ? `🟢 +${difference}` : `🔴 ${difference}`;

        await sendDiscordAlert(
            "🎁 Treasure Chest Updated",
            `**Previous Balance:** ${previousAllowanceBalance} GALA\n**New Balance:** ${totalRemaining} GALA\n**Change:** ${changeText}`,
            difference > 0 ? 0x2ecc71 : 0xe74c3c
        );

        previousAllowanceBalance = totalRemaining;
    }
}

/**
 * Handles script shutdown.
 */
async function handleShutdown() {
    await sendDiscordAlert("🛑 Gala Chain Balance Monitor", "Bot has been stopped.", 0xe74c3c);
    clearInterval(intervalId);
    process.exit(0);
}

/**
 * Starts the monitoring script.
 */
(async () => {
    try {
        await sendDiscordAlert("🚀 Gala Chain Balance Monitor", "Bot has started successfully.", 0x3498db);

        // Fetch initial balances
        previousAssetBalance = await fetchAssetBalance();
        await sendDiscordAlert("🪙 Initial Gala Chain Balance", `**Balance:** ${previousAssetBalance} GALA`, 0x3498db);

        previousAllowanceBalance = await computeAllowanceBalance();
        await sendDiscordAlert("🎁 Initial Treasure Chest Balance", `**Balance:** ${previousAllowanceBalance} GALA`, 0x3498db);

        // Start monitoring every 30 seconds
        intervalId = setInterval(async () => {
            console.log("🔄 Checking balances...");
            await checkAssetBalance();
            await checkAllowanceBalance();
        }, 30000); // 30 seconds

        process.on("SIGINT", handleShutdown);
        process.on("SIGTERM", handleShutdown);
    } catch (error) {
        console.error("❌ Script error:", error.message);
        await sendDiscordAlert("❌ Balance Monitor Error", error.message, 0xe74c3c);
        process.exit(1);
    }
})();
