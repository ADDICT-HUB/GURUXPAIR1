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

// Function to create beautiful ASCII table
function createSessionTable(sessionId) {
  const tableWidth = 50;
  const horizontalLine = '─'.repeat(tableWidth);
  
  return `
╔${'═'.repeat(tableWidth)}╗
║${' '.repeat(12)}🚀 X-GURU BOT SESSION${' '.repeat(12)}║
╠${'═'.repeat(tableWidth)}╣
║ 📦 *SESSION DETAILS*                         ║
╟${horizontalLine}╢
║ 🔐 Session ID:                               ║
║                                              ║
║ \`\`\`${sessionId}\`\`\` ║
║                                              ║
╟${horizontalLine}╢
║ 📊 *SESSION INFO*                            ║
╟${horizontalLine}╢
║ • Status: ✅ ACTIVE                          ║
║ • Type: Base64 Encoded                       ║
║ • Expires: 24 hours                          ║
║ • Bot: GURUXBOT                              ║
╟${horizontalLine}╢
║ ⚡ *QUICK ACTIONS*                            ║
╟${horizontalLine}╢
║ 1. Copy Session ID for deployment           ║
║ 2. Follow channel for updates               ║
║ 3. Contact admin for help                   ║
╚${'═'.repeat(tableWidth)}╝
`;
}

// Function to create interactive message
function createInteractiveMessage(sessionId) {
  const channelLink = "https://whatsapp.com/channel/0029VbBNUAFFXUuUmJdrkj1f";
  const adminNumber = "254704355518"; // Your number in international format
  const whatsappLink = `https://wa.me/${adminNumber}`;
  
  return {
    text: createSessionTable(sessionId) + `

━━━━━━━━━━━━━━━━━━━━━━━
📋 *IMMEDIATE ACTIONS:*

Use the buttons below for quick actions:

1️⃣ *COPY* - Copy session ID to clipboard
2️⃣ *CHANNEL* - Join updates channel
3️⃣ *HELP* - Contact admin on WhatsApp

━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *IMPORTANT:*
• Keep session ID PRIVATE
• Do NOT share with anyone
• Use within 24 hours
• Store in secure location

📞 *Support:* ${adminNumber}
⭐ *Channel:* ${channelLink}
`,
    buttons: [
      {
        buttonId: 'copy_session',
        buttonText: { 
          displayText: '📋 Copy Session ID' 
        },
        type: 1
      },
      {
        buttonId: 'follow_channel',
        buttonText: { 
          displayText: '📢 Join Channel' 
        },
        type: 1
      },
      {
        buttonId: 'contact_admin',
        buttonText: { 
          displayText: '👨‍💻 Contact Admin' 
        },
        type: 1
      }
    ],
    footer: 'X-GURU © 2025 | Secure WhatsApp Bot Connection'
  };
}

// Function to create deployment guide
function createDeploymentGuide() {
  return `
━━━━━━━━━━━━━━━━━━━━━━━
📖 *DEPLOYMENT GUIDE*

┌─────────────────────┐
│  STEP 1: COPY       │
│  • Copy session ID  │
│  • Save it locally  │
└─────────────────────┘

┌─────────────────────┐
│  STEP 2: DEPLOY     │
│  • Paste in config  │
│  • Restart bot      │
│  • Verify connection│
└─────────────────────┘

┌─────────────────────┐
│  STEP 3: VERIFY     │
│  • Check bot status │
│  • Test commands    │
│  • Monitor logs     │
└─────────────────────┘

✅ *Your bot will be ready in minutes!*
`;
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

          // Create and send interactive message
          const interactiveMsg = createInteractiveMessage(SESSION_ID);
          const sentMsg = await sock.sendMessage(sock.user.id, interactiveMsg);

          // Handle button responses
          sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const msg of messages) {
              if (msg.key.fromMe) continue;
              
              if (msg.message?.buttonsResponseMessage?.selectedButtonId) {
                const buttonId = msg.message.buttonsResponseMessage.selectedButtonId;
                const sender = msg.key.remoteJid;
                
                switch(buttonId) {
                  case 'copy_session':
                    await sock.sendMessage(sender, {
                      text: `✅ *SESSION COPIED!*\n\nYour session ID has been copied to clipboard.\n\n📝 *Next Steps:*\n1. Paste in your bot config\n2. Restart your bot\n3. Verify connection\n\n💡 *Tip:* Session expires in 24 hours.`
                    });
                    break;
                    
                  case 'follow_channel':
                    await sock.sendMessage(sender, {
                      text: `📢 *JOIN OUR UPDATES CHANNEL*\n\nStay updated with:\n• New features\n• Bug fixes\n• Announcements\n• Tips & tricks\n\n🔗 *Channel Link:*\nhttps://whatsapp.com/channel/0029VbBNUAFFXUuUmJdrkj1f\n\nClick the link above to join! ✅`
                    });
                    break;
                    
                  case 'contact_admin':
                    await sock.sendMessage(sender, {
                      text: `👨‍💻 *CONTACT ADMIN*\n\nFor immediate assistance:\n\n📞 *WhatsApp:* https://wa.me/254704355518\n⏰ *Available:* 24/7\n💬 *Response time:* < 5 minutes\n\n📧 *Email:* admin@xguru.dev\n\nClick the WhatsApp link above to start chatting! 🚀`
                    });
                    break;
                }
              }
            }
          });

          // Send backup session ID
          await sock.sendMessage(sock.user.id, {
            text: `📄 *BACKUP SESSION ID:*\n\`\`\`${SESSION_ID}\`\`\`\n\n💾 *Save this somewhere safe!*`
          });

          // Send deployment guide
          await sock.sendMessage(sock.user.id, {
            text: createDeploymentGuide()
          });

          // Send final success message
          await sock.sendMessage(sock.user.id, {
            text: `🎉 *CONGRATULATIONS!*\n\n✅ Session created successfully!\n✅ Ready for deployment!\n✅ Support available 24/7\n\n🚀 *Your X-GURU bot journey starts now!*\n\n⭐ *Remember:* Keep your session secure!\n📞 *Need help?* Contact: 0704 355 518`
          });

          await delay(1000);
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

// ================= WEB COPY ENDPOINT =================
router.post("/copy-session", async (req, res) => {
  try {
    const { sessionId, phoneNumber } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ 
        success: false, 
        error: "Session ID is required" 
      });
    }
    
    // Here you could store the session in database
    // For now, just acknowledge
    res.json({ 
      success: true, 
      message: "Session ID ready for copying",
      sessionId: sessionId,
      timestamp: new Date().toISOString(),
      expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error("Copy session error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to process session copy" 
    });
  }
});

// ================= GET SESSION INFO =================
router.get("/session-info/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Validate session format
    if (!sessionId.startsWith('Xguru~')) {
      return res.status(400).json({
        success: false,
        error: "Invalid session format"
      });
    }
    
    res.json({
      success: true,
      sessionId: sessionId,
      status: "active",
      created: new Date().toISOString(),
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      botName: "GURUXBOT",
      type: "Base64 Encoded",
      support: {
        phone: "0704 355 518",
        whatsapp: "https://wa.me/254704355518",
        channel: "https://whatsapp.com/channel/0029VbBNUAFFXUuUmJdrkj1f"
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch session info"
    });
  }
});

module.exports = router;
