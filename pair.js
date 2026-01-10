const PastebinAPI = require('pastebin-js');
const pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');
const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
const router = express.Router();
const pino = require('pino');
const {
    default: Mbuvi_Tech,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require('@whiskeysockets/baileys');
require('dotenv').config(); // ← Add this to load .env file

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    async function GURU_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        try {
            let Pair_Code = Mbuvi_Tech({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })),
                },
                version: [2, 3000, 1027934701],
                printQRInTerminal: false,
                logger: pino({ level: 'fatal' }).child({ level: 'fatal' }),
                browser: Browsers.windows('chrome'),
            });

            if (!Pair_Code.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const custom = "GURUXBOT";
                const code = await Pair_Code.requestPairingCode(num, custom);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            Pair_Code.ev.on('creds.update', saveCreds);

            Pair_Code.ev.on('connection.update', async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === 'open') {
                    await delay(8000); // Give time for creds to fully save

                    const sessionFolder = `./temp/${id}`;
                    const credsPath = `${sessionFolder}/creds.json`;

                    if (!fs.existsSync(credsPath)) {
                        throw new Error("creds.json not found!");
                    }

                    // ─── Mega.nz Upload ───────────────────────────────────────
                    const Mega = require('mega');

                    const megaStorage = Mega({
                        email: process.env.MEGA_EMAIL || 'cryptixmd@gmail.com',
                        password: process.env.MEGA_PASS || '@AKIDArajab2000..'
                    });

                    const uploadName = `guru-session-${id}.json`;

                    const upload = megaStorage.upload(
                        { name: uploadName },
                        fs.createReadStream(credsPath)
                    );

                    upload.complete(async () => {
                        const fileHandle = upload.node.h; // Mega file ID
                        const SESSION_ID = `GURU~${fileHandle}`;

                        // ─── Friendly & Beautiful Success Message ───────────────
                        const successMessage = `
╔══════════════════════════════╗
║       ✨ GURU PAIRING ✨      ║
╚══════════════════════════════╝

🎉 Pairing completed successfully!

Your SESSION_ID (ready to use):
${SESSION_ID}

📋 How to use:
1. Copy the full SESSION_ID above
2. Paste in your bot .env file:
   SESSION_ID=${SESSION_ID}
3. Restart your bot

⚠️ Important:
• Keep this ID private
• Works perfectly with MEGA-MD style bots
• Stored safely on Mega.nz

Thank you for using GURU TECH pairing service 💙

Made with love by GURU
                        `;

                        await Pair_Code.sendMessage(
                            Pair_Code.user.id,
                            { text: successMessage }
                        );

                        console.log(`New SESSION_ID generated: ${SESSION_ID}`);

                        // Cleanup
                        await delay(5000);
                        await Pair_Code.ws.close();
                        removeFile(sessionFolder);
                    });

                    upload.error(async (err) => {
                        console.error('Mega upload error:', err);
                        await Pair_Code.sendMessage(
                            Pair_Code.user.id,
                            { text: `❌ Sorry! Mega upload failed: ${err.message || 'Unknown error'}\n\nPlease try again later.` }
                        );
                    });
                }
                else if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== 401) {
                    await delay(10000);
                    GURU_PAIR_CODE(); // retry on disconnect
                }
            });
        } catch (err) {
            console.log('Pairing service error:', err);
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                res.send({ error: 'Service temporarily unavailable. Please try again.' });
            }
        }
    }

    await GURU_PAIR_CODE();
});

module.exports = router;
