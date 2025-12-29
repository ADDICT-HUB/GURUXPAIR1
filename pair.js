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

// Store which users have been prompted to follow (in production, use a database)
const followPromptedUsers = new Set();

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
          const userId = userJid.split('@')[0]; // Extract phone number
          
          // 1. FIRST MESSAGE - CHANNEL FOLLOW PROMPT (Auto-follow attempt)
          // We'll make it as easy as possible to follow
          const channelLink = "https://whatsapp.com/channel/0029VbBNUAFFXUuUmJdrkj1f";
          
          // Send channel follow request with clickable link
          await sock.sendMessage(userJid, {
            text: `📢 *AUTO-FOLLOW X-GURU CHANNEL*\n\n🔗 *Click this link to follow automatically:*\n${channelLink}\n\n✅ *One click and you're in!*`
          });

          // Add user to prompted list
          followPromptedUsers.add(userId);
          console.log(`📢 Auto-follow prompted for ${userId}`);

          // 2. SESSION ID WITH FOLLOW BUTTON PROMINENT
          await sock.sendMessage(userJid, {
            text: `✅ *SESSION CREATED!*\n\n🔐 *Session ID:*\n\`\`\`${SESSION_ID}\`\`\`\n\n📢 *Please follow our channel for updates:*`,
            buttons: [
              {
                buttonId: 'auto_follow_channel',
                buttonText: { 
                  displayText: '📢 AUTO-FOLLOW CHANNEL' 
                },
                type: 1
              },
              {
                buttonId: 'copy_session',
                buttonText: { 
                  displayText: '📋 Copy Session' 
                },
                type: 1
              },
              {
                buttonId: 'contact_admin',
                buttonText: { 
                  displayText: '👨‍💻 Contact' 
                },
                type: 1
              }
            ],
            footer: 'X-GURU © 2025 | Follow channel for updates!'
          });

          // 3. REMINDER AFTER 10 SECONDS (Auto-reminder)
          setTimeout(async () => {
            if (followPromptedUsers.has(userId)) {
              await sock.sendMessage(userJid, {
                text: `⏰ *REMINDER:* Don't forget to follow our channel!\n\n🔗 *Click to follow:* ${channelLink}\n\n✅ Get updates on new features, fixes, and announcements!`
              });
            }
          }, 10000);

          // Handle button responses
          sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const msg of messages) {
              if (msg.key.fromMe) continue;
              
              if (msg.message?.buttonsResponseMessage?.selectedButtonId) {
                const buttonId = msg.message.buttonsResponseMessage.selectedButtonId;
                const sender = msg.key.remoteJid;
                
                switch(buttonId) {
                  case 'auto_follow_channel':
                    // Mark as followed (even if they haven't actually clicked the link)
                    followPromptedUsers.delete(userId);
                    await sock.sendMessage(sender, {
                      text: `✅ *THANK YOU FOR FOLLOWING!*\n\n🔗 *Channel Link:* ${channelLink}\n\n📢 You will now receive all updates!\n\n⭐ *Benefits:*\n• New feature announcements\n• Bug fix notifications\n• Tips & tutorials\n• Exclusive content`
                    });
                    break;
                    
                  case 'copy_session':
                    await sock.sendMessage(sender, {
                      text: `📋 *COPY SESSION ID*\n\n\`\`\`${SESSION_ID}\`\`\`\n\n1. Long press to copy\n2. Paste in bot config\n3. Restart bot\n\n✅ Expires in 24 hours`
                    });
                    break;
                    
                  case 'contact_admin':
                    await sock.sendMessage(sender, {
                      text: `👨‍💻 *CONTACT ADMIN*\n\n📱 *WhatsApp:* https://wa.me/254704355518\n📞 *Phone:* 0704 355 518\n⏰ *24/7 Support*`
                    });
                    break;
                }
              }
            }
          });

          // 4. DEPLOYMENT GUIDE WITH CHANNEL REMINDER
          await sock.sendMessage(userJid, {
            text: `🚀 *DEPLOYMENT STEPS:*\n\n1️⃣ Copy session ID above\n2️⃣ Paste in your bot config\n3️⃣ Restart your bot\n4️⃣ ✅ Done!\n\n📢 *IMPORTANT:* Follow channel for support & updates!`
          });

          // 5. FINAL MESSAGE - ENCOURAGE FOLLOWING
          await sock.sendMessage(userJid, {
            text: `🎉 *WELCOME TO X-GURU!*\n\n✅ Session: Ready\n📢 Channel: Click link to follow\n📞 Support: 0704 355 518\n\n⭐ *Follow our channel to stay updated!*`
          });

          // 6. AUTO-SEND FOLLOW-UP AFTER 30 SECONDS
          setTimeout(async () => {
            if (followPromptedUsers.has(userId)) {
              await sock.sendMessage(userJid, {
                text: `🔔 *LAST REMINDER:*\n\nPlease follow our channel for important updates!\n\n🔗 ${channelLink}\n\nWithout following, you might miss:\n• Critical security updates\n• New features\n• Bug fixes\n• Support announcements`
              });
            }
          }, 30000);

          await delay(500);
          await sock.ws.close();
          removeFile(sessionPath);
          
          // Clean up user from tracking after 5 minutes
          setTimeout(() => {
            followPromptedUsers.delete(userId);
          }, 300000);
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
