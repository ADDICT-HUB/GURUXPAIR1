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

// Function to compress session data
function compressSessionData(sessionData) {
    try {
        const data = JSON.parse(sessionData);
        
        // Remove unnecessary data to make session smaller
        const compressed = {
            // Keep only essential credentials
            creds: {
                noiseKey: data.creds?.noiseKey,
                signedIdentityKey: data.creds?.signedIdentityKey,
                signedPreKey: data.creds?.signedPreKey,
                registrationId: data.creds?.registrationId,
                advSecretKey: data.creds?.advSecretKey,
                processedHistoryMessages: data.creds?.processedHistoryMessages || [],
                nextPreKeyId: data.creds?.nextPreKeyId,
                firstUnuploadedPreKeyId: data.creds?.firstUnuploadedPreKeyId,
                account: data.creds?.account,
                me: data.creds?.me,
                accountSettings: data.creds?.accountSettings || { unarchiveChats: false },
                registered: data.creds?.registered
            },
            // Remove keys to save space - they'll be regenerated
            keys: {}
        };
        
        return JSON.stringify(compressed);
    } catch (error) {
        console.error("Compression error:", error);
        return sessionData; // Return original if compression fails
    }
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

            Pair_Code_By_Mbuvi_Tech.ev.on('creds.update', saveCreds);
            Pair_Code_By_Mbuvi_Tech.ev.on('connection.update', async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection === 'open') {
                    await delay(5000);
                    let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                    await delay(1000);
                    
                    // Compress the session data
                    const originalData = data.toString();
                    const compressedData = compressSessionData(originalData);
                    
                    console.log(`Original size: ${originalData.length} bytes`);
                    console.log(`Compressed size: ${compressedData.length} bytes`);
                    console.log(`Reduction: ${Math.round((1 - compressedData.length/originalData.length) * 100)}%`);
                    
                    let b64data = Buffer.from(compressedData).toString('base64');
                    let session = await Pair_Code_By_Mbuvi_Tech.sendMessage(Pair_Code_By_Mbuvi_Tech.user.id, { text: 'Xguru~' + b64data });

                    let Mbuvi_MD_TEXT = `
█▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█
█  ⚡ 𝐗 𝐆𝐔𝐑𝐔 ᴘᴀɪʀᴇᴅ ⚡  █
█▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█
  
  ◈ Session size: ${b64data.length} chars
  ◈ ᴛʏᴘᴇ   » Base64 (Compressed)
  ◈ sᴛᴀᴛᴜs  » Online
  ◈ owɴᴇʀ  » 𝐆𝐮𝐫𝐮𝐓𝐞𝐜𝐡
  
  _Connected successfully_`;

                    await Pair_Code_By_Mbuvi_Tech.sendMessage(Pair_Code_By_Mbuvi_Tech.user.id, { text: Mbuvi_MD_TEXT }, { quoted: session });

                    await delay(100);
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
