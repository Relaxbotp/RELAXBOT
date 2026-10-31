const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' })
    });

    if (!sock.authState.creds.registered) {
        const phoneNumber = process.env.PHONE_NUMBER; 
        
        if (!phoneNumber) {
            console.log("❌ خطأ: لم يتم وضع رقم الهاتف في المتغيرات (PHONE_NUMBER).");
            return;
        }

        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n=========================================`);
                console.log(`🔑 كود الربط الخاص بك هو: ${code}`);
                console.log(`=========================================\n`);
            } catch (error) {
                console.log("حدث خطأ أثناء طلب الكود:", error.message);
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('تم إغلاق الاتصال. جاري إعادة المحاولة...');
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ تم ربط البوت بنجاح! البوت يعمل الآن.');
        }
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedMessage?.text;

        if (text === 'السلام عليكم') {
            await sock.sendMessage(from, { text: 'وعليكم السلام ورحمة الله وبركاته 🌹' });
        }
    });
}

startBot();
