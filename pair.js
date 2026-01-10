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

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number || '';

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
                if (!num || num.length < 10) {
                    if (!res.headersSent) {
                        return res.status(400).json({ error: 'Invalid or missing phone number' });
                    }
                    return;
                }
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
                    await delay(8000);

                    const sessionFolder = `./temp/${id}`;
                    const credsPath = `${sessionFolder}/creds.json`;

                    if (!fs.existsSync(credsPath)) {
                        throw new Error("creds.json not found!");
                    }

                    // Mega.nz Upload - using current megajs API (2026 working version)
                    let SESSION_ID = 'Upload failed - try again';
                    try {
                        const { Storage } = require('megajs');

                        const storage = await new Storage({
                            email: process.env.MEGA_EMAIL || 'cryptixmd@gmail.com',
                            password: process.env.MEGA_PASS || '@AKIDArajab2000..'
                        }).ready;

                        const upload = storage.upload({
                            name: `guru-session-${id}.json`
                        }, fs.createReadStream(credsPath));

                        await upload.complete;

                        const fileHandle = upload.node.h; // the file key/ID

                        if (!fileHandle) {
                            throw new Error("Mega returned no file handle");
                        }

                        SESSION_ID = `GURU~${fileHandle}`;

                        console.log(`SUCCESS - SESSION_ID: ${SESSION_ID}`);
                    } catch (megaErr) {
                        console.error('Mega error details:', megaErr.message || megaErr.stack || megaErr);
                        let userMsg = 'Technical issue with Mega storage.';
                        if (megaErr.message?.includes('auth') || megaErr.message?.includes('login') || megaErr.message?.includes('credentials')) {
                            userMsg = 'Mega login failed - check email/password or disable 2FA.';
                        } else if (megaErr.message?.includes('limit') || megaErr.message?.includes('bandwidth')) {
                            userMsg = 'Mega account limit reached - try again later.';
                        }

                        await Pair_Code.sendMessage(
                            Pair_Code.user.id,
                            { text: `⚠️ ${userMsg}\n\nPlease try pairing again in 5-10 minutes or contact support.` }
                        );
                    }

                    // Always send the result message
                    const resultMessage = `
╔══════════════════════════════╗
║       ✨ GURU PAIRING ✨      ║
╚══════════════════════════════╝

🎉 Pairing completed!

Your SESSION_ID:
${SESSION_ID}

How to use:
→ Copy above SESSION_ID
→ Paste in bot .env: SESSION_ID=${SESSION_ID}
→ Restart bot

⚠️ KEEP PRIVATE!
If upload failed → retry pairing

Thank you! 💙 GURU TECH
                    `;

                    await Pair_Code.sendMessage(
                        Pair_Code.user.id,
                        { text: resultMessage }
                    );

                    await delay(5000);
                    await Pair_Code.ws.close();
                    removeFile(sessionFolder);
                }
                else if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== 401) {
                    await delay(10000);
                    GURU_PAIR_CODE();
                }
            });
        } catch (err) {
            console.error('Critical error:', err);
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Service error - try again' });
            }
        }
    }

    await GURU_PAIR_CODE();
});

module.exports = router;
