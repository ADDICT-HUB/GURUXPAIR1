const PastebinAPI = require('pastebin-js');
const pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');
const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
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
    let num = req.query.number;
    
    async function Mbuvi_MD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        try {
            let Pair_Code_By_Mbuvi_Tech = Mbuvi_Tech({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })),
                },
                version: [2, 3000, 1027934701],
                printQRInTerminal: false,
                logger: pino({ level: 'fatal' }).child({ level: 'fatal' }),
                browser: Browsers.windows('Edge'),
            });

            if (!Pair_Code_By_Mbuvi_Tech.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const custom = "GURUXBOT";
                const code = await Pair_Code_By_Mbuvi_Tech.requestPairingCode(num, custom);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

// Note: Use my note in every script.

Pair_Code_By_Mbuvi_Tech.ev.on('creds.update', saveCreds);
            Pair_Code_By_Mbuvi_Tech.ev.on('connection.update', async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection === 'open') {
                    await delay(10000); // Increased delay to ensure full registration
                    let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                    await delay(2000);
                    
                    // Parse and verify session data
                    const sessionData = JSON.parse(data.toString());
                    
                    // Check if session is properly registered
                    if (!sessionData.registered) {
                        console.log("Session not registered yet, waiting...");
                        await delay(5000);
                        // Read again
                        data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                        sessionData = JSON.parse(data.toString());
                    }
                    
                    if (!sessionData.registered) {
                        console.log("WARNING: Session still not registered!");
                    }
                    
                    let b64data = Buffer.from(data).toString('base64');
                    let session = await Pair_Code_By_Mbuvi_Tech.sendMessage(Pair_Code_By_Mbuvi_Tech.user.id, { text: 'Xguru~' + b64data });

                    let Mbuvi_MD_TEXT = `
█▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█
█  ⚡ 𝐗 𝐆𝐔𝐑𝐔 ᴘᴀɪʀᴇᴅ ⚡  █
█▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█
  
  ◈ ᴛʏᴘᴇ   » Base64
  ◈ sᴛᴀᴛᴜs  » Online
  ◈ Registered » ${sessionData.registered ? '✅ YES' : '❌ NO'}
  ◈ owɴᴇʀ  » 𝐆𝐮𝐫𝐮𝐓𝐞𝐜𝐡
  ◈ Session Length » ${b64data.length} chars
  
  _Connected successfully_`;

                    await Pair_Code_By_Mbuvi_Tech.sendMessage(Pair_Code_By_Mbuvi_Tech.user.id, { text: Mbuvi_MD_TEXT }, { quoted: session });

                    await delay(5000); // Wait before closing
                    await Pair_Code_By_Mbuvi_Tech.ws.close();
                    return await removeFile('./temp/' + id);
                } else if (connection === 'close' && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000);
                    Mbuvi_MD_PAIR_CODE();
                }
            });
        } catch (err) {
            console.log('Service restarted');
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: 'Service Currently Unavailable' });
            }
        }
    }
    
    return await Mbuvi_MD_PAIR_CODE();
});

module.exports = router;
