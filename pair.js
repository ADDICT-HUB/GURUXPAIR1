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
        browser: Browsers.windows("Edge"),
      });

      sock.ev.on("creds.update", saveCreds);

      // -------- REQUEST PAIRING CODE --------
      if (!state.creds.registered) {
        await delay(1500);
        const customName = "X-GURU";
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
          const SESSION_ID = `X-GURU~${base64}`;

          // Send session to the paired account itself
          const sent = await sock.sendMessage(sock.user.id, {
            text: SESSION_ID,
          });

          // Nice info message
          const info = `
╔═══════════════════════
║  『 SESSION CONNECTED 』
║  🟢 BOT NAME: X-GURU
║  🟢 OWNER: GuruTech
║  🟢 TYPE: Base64
╠═══════════════════════
║  ⚡ Status: Active
║  🔐 Keep this session safe
║  🚀 Ready for deployment
╚═══════════════════════

⭐ Star the repo & enjoy!
`;

          await sock.sendMessage(
            sock.user.id,
            { text: info },
            { quoted: sent }
          );

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
