const PastebinAPI = require("pastebin-js");
const pastebin = new PastebinAPI("EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL");
const { makeid } = require("./id");
const express = require("express");
const fs = require("fs");
const path = require("path");
const pino = require("pino");
const router = express.Router();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
} = require("@whiskeysockets/baileys");

// ================= UTIL =================
function removeFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { recursive: true, force: true });
    }
  } catch {}
}

// ================= ROUTE =================
router.get("/", async (req, res) => {
  const id = makeid();
  let num = req.query.number;

  // -------- BASIC VALIDATION --------
  if (!num || num.length < 8) {
    return res.status(400).json({ error: "Invalid phone number" });
  }

  num = num.replace(/[^0-9]/g, "");

  async function X_GURU_PAIR() {
    const sessionPath = path.join(__dirname, "temp", id);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    try {
      const sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(
            state.keys,
            pino({ level: "fatal" }).child({ level: "fatal" })
          ),
        },
        logger: pino({ level: "fatal" }).child({ level: "fatal" }),
        printQRInTerminal: false,
        browser: Browsers.macOS('Chrome'),
      });

      sock.ev.on("creds.update", saveCreds);

      // -------- REQUEST PAIRING CODE --------
      if (!state.creds.registered) {
        await delay(1500);
        const customName = "GURUXBOT";
        const code = await sock.requestPairingCode(num, customName);

        if (!res.headersSent) {
          res.json({ code });
        }
      }

      // -------- CONNECTION HANDLER --------
      sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        if (connection === "open") {
          await delay(3000);

          const credsFile = path.join(sessionPath, "creds.json");
          if (!fs.existsSync(credsFile)) throw new Error("Creds not found");

          const data = fs.readFileSync(credsFile);
          const base64 = Buffer.from(data).toString("base64");
          const SESSION_ID = `Xguru~${base64}`;

          // Get user's JID
          const userJid = sock.user.id;
          
          // Channel link
          const channelLink = "https://whatsapp.com/channel/0029VbBNUAFFXUuUmJdrkj1f";
          const whatsappLink = "https://wa.me/254704355518";

          // Send session ID
          await sock.sendMessage(userJid, {
            text: `✅ *SESSION CREATED SUCCESSFULLY!*\n\n🔐 *Your Session ID:*\n\`\`\`${SESSION_ID}\`\`\`\n\n📋 *To copy:* Long press the code above\n\n⏰ *Expires in:* 24 hours`
          });

          // Send channel follow link
          await sock.sendMessage(userJid, {
            text: `📢 *FOLLOW OUR CHANNEL FOR UPDATES*\n\n🔗 ${channelLink}\n\n✅ Get news about:\n• New features\n• Bug fixes\n• Tutorials\n• Announcements`
          });

          // Send contact information
          await sock.sendMessage(userJid, {
            text: `👨‍💻 *NEED HELP?*\n\n📱 *WhatsApp:* ${whatsappLink}\n📞 *Phone:* 0704 355 518\n⏰ *Available 24/7*`
          });

          // Send deployment instructions
          await sock.sendMessage(userJid, {
            text: `🚀 *DEPLOYMENT STEPS:*\n\n1. Copy session ID\n2. Paste in bot config\n3. Restart bot\n4. Check bot status\n\n✅ Your bot is ready!`
          });

          await delay(500);
          await sock.ws.close();
          removeFile(sessionPath);
        }

        // -------- AUTO RETRY (SAFE) --------
        if (
          connection === "close" &&
          lastDisconnect?.error?.output?.statusCode !== 401
        ) {
          await delay(8000);
          X_GURU_PAIR();
        }
      });
    } catch (err) {
      console.error("Pairing service error:", err.message);
      removeFile(sessionPath);
      if (!res.headersSent) {
        res.status(503).json({ error: "Service unavailable" });
      }
    }
  }

  await X_GURU_PAIR();
});

module.exports = router;
