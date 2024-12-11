const express = require("express");
const bodyParser = require("body-parser");
const {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

let sock = null; // Global variable to store the WhatsApp connection
let isReconnecting = false; // Flag to prevent multiple reconnections

// Function to initialize the WhatsApp connection
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
      if (shouldReconnect && !isReconnecting) {
        console.log("Reconnecting...");
        isReconnecting = true;
        initializeWhatsApp().finally(() => {
          isReconnecting = false;
        });
      }
    } else if (connection === "open") {
      console.log("WhatsApp connection established!");
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

// Function to send a message
async function sendMessage(number, message) {
  if (!sock) {
    throw new Error("WhatsApp is not connected.");
  }

  const targetNumber = `${number}@s.whatsapp.net`;
  try {
    await sock.sendMessage(targetNumber, { text: message });
    console.log(`Message sent to ${targetNumber}`);
  } catch (error) {
    console.error("Failed to send message:", error);
    throw error;
  }
}

// Define API route
app.post("/send", async (req, res) => {
  const { number, message } = req.body;

  if (!number || !message) {
    return res.status(400).json({ error: "Number and message are required" });
  }

  try {
    await sendMessage(number, message);
    res
      .status(200)
      .json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Start the server
app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  await initializeWhatsApp();
});
