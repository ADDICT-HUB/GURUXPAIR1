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

                    // ─── BASE64 SESSION WITH GURU~ PREFIX ────────────────────────────────
                    let SESSION_ID = 'Base64 generation failed';
                    try {
                        const data = fs.readFileSync(credsPath);
                        const b64data = Buffer.from(data).toString('base64');

                        if (b64data.length < 500) {
                            throw new Error('Base64 string too short - session incomplete');
                        }

                        SESSION_ID = `GURU~${b64data}`;

                        console.log(`Base64 session generated successfully (length: ${b64data.length} chars)`);
                    } catch (err) {
                        console.error('Base64 generation error:', err.message || err);
                        await Pair_Code.sendMessage(
                            Pair_Code.user.id,
                            { text: `⚠️ Failed to generate base64 session: ${err.message || 'Unknown error'}\nPlease try pairing again.` }
                        );
                    }

                    // ─── 1. SESSION_ID alone (easy to copy) ─────────────────────────────
                    await Pair_Code.sendMessage(
                        Pair_Code.user.id,
                        { text: SESSION_ID }
                    );

                    // ─── 2. Cool, short & friendly captions ─────────────────────────────
                    const captionMessage = `
✨ *Pairing Success!* ✨

Your magic key is ready! 🚀

Copy SESSION_ID from message above ↑

*Quick links:*
• https://chat.whatsapp.com/LBV3oBOkwOCILSvAUQqIAY
• https://whatsapp.com/channel/0029VbBNUAFFXUuUmJdrkj1f

*Owner:* +254 778 074353

*Created by GURU 😜 FOREVER RESPECTED 👻*

Enjoy the power! 💙 GURU TECH
                    `;

                    await Pair_Code.sendMessage(
                        Pair_Code.user.id,
                        { text: captionMessage }
                    );

                    // Cleanup
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
