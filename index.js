const express = require("express");
const bodyParser = require("body-parser");
const {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

let sock = null; // Global WhatsApp connection

// Initialize WhatsApp
async function initializeWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
      if (shouldReconnect) {
        reconnectWhatsApp();
      }
    } else if (connection === "open") {
      console.log("WhatsApp connection established!");
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

// Reconnect with Exponential Backoff
async function reconnectWhatsApp(delay = 1000) {
  console.log(`Reconnecting in ${delay / 1000}s...`);
  setTimeout(async () => {
    try {
      await initializeWhatsApp();
      console.log("Reconnected successfully!");
    } catch (error) {
      console.error("Reconnection failed, retrying...", error);
      reconnectWhatsApp(Math.min(delay * 2, 30000)); // Cap delay at 30 seconds
    }
  }, delay);
}

// Send Message
async function sendMessage(number, message) {
  if (!sock) throw new Error("WhatsApp is not connected.");

  const targetNumber = `${number}@s.whatsapp.net`;
  try {
    await sock.sendMessage(targetNumber, { text: message });
    console.log(`Message sent to ${targetNumber}`);
  } catch (error) {
    console.error("Failed to send message:", error);
    throw error;
  }
}

// API Route
app.post("/send", async (req, res) => {
  const { number, message } = req.body;

  if (!number || !message || !/^\d+$/.test(number)) {
    return res.status(400).json({ error: "Invalid number or message" });
  }

  try {
    await sendMessage(number, message);
    res
      .status(200)
      .json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    console.error("Message sending error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Graceful Shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  if (sock) {
    await sock.logout();
    console.log("WhatsApp connection closed.");
  }
  process.exit(0);
});

// Start Server
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await initializeWhatsApp();
});
