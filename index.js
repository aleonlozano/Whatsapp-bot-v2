import * as baileys from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'

// Función para retraso aleatorio entre 2 y 5 segundos
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const getRandomDelay = () => Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000

const startSock = async () => {
    const { state, saveCreds } = await baileys.useMultiFileAuthState('baileys_auth')
    const { version } = await baileys.fetchLatestBaileysVersion()

    const sock = baileys.makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            qrcode.generate(qr, { small: true })
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode
            const shouldReconnect = reason !== baileys.DisconnectReason.loggedOut
            console.log('🔌 Conexión cerrada. Código:', reason, '| Reintentar:', shouldReconnect)
            if (shouldReconnect) {
                startSock()
            }
        } else if (connection === 'open') {
            console.log('✅ Conexión establecida con WhatsApp')

            const chats = await sock.groupFetchAllParticipating()
            const gruposObjetivo = ['Grupo 1', 'Grupo 2']

            const gruposFiltrados = Object.entries(chats).filter(
                ([_, chat]) => gruposObjetivo.includes(chat.subject)
            )

            if (gruposFiltrados.length === 0) {
                console.log('⚠️ No se encontraron grupos con los nombres: Grupo 1 o Grupo 2')
                return
            }

            for (const [id, chat] of gruposFiltrados) {
                const mensaje = `👋 ¡Hola grupo *${chat.subject}*! Este es un mensaje de prueba desde el bot. No es spam, solo estamos haciendo un test controlado.`
                try {
                    await sock.sendMessage(id, { text: mensaje })
                    console.log(`📤 Mensaje enviado a "${chat.subject}" (${id})`)
                } catch (err) {
                    console.error(`❌ Error al enviar mensaje a "${chat.subject}" (${id}):`, err)
                }

                const waitTime = getRandomDelay()
                console.log(`⏱ Esperando ${waitTime} ms antes de enviar al siguiente grupo...`)
                await delay(waitTime)
            }
        }
    })
}

startSock()
