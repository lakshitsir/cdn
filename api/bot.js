import axios from "axios";

const TOKEN = process.env.BOT_TOKEN;
const TG = `https://api.telegram.org/bot${TOKEN}`;
const ALLOWED = 5421311764;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).send("Bot Running 🚀");
    }

    const msg = req.body?.message;
    if (!msg) return res.send("No message");

    const chatId = msg.chat?.id;

    // 🔐 only you
    if (chatId !== ALLOWED || msg.chat.type !== "private") {
      return res.send("Ignored");
    }

    // 📦 detect media
    let file =
      msg.document ||
      msg.video ||
      msg.audio ||
      msg.voice ||
      msg.animation ||
      msg.video_note ||
      (msg.photo ? msg.photo[msg.photo.length - 1] : null);

    if (!file) {
      await send(chatId, "📤 Send any file/media");
      return res.send("No media");
    }

    const fileId = file.file_id;
    const size = file.file_size || 0;
    const name = file.file_name || "media";

    const sizeMB = (size / (1024 * 1024)).toFixed(2);

    // 🔗 our endpoints
    const base = "https://cdn-six-theta.vercel.app";
    const streamLink = `${base}/api/stream?id=${fileId}`;
    const downloadLink = `${base}/api/download?id=${fileId}`;

    let note = "▶️ Stream: Browser/VLC\n⬇️ Download: Save file";
    if (sizeMB > 500) {
      note = "🚨 Large file → Use VLC for smooth playback";
    }

    const text =
`📁 ${name}
📦 ${sizeMB} MB

🎬 Stream:
${streamLink}

⬇️ Download:
${downloadLink}

${note}

👨‍💻 Developer: Lakshit`;

    const buttons = {
      inline_keyboard: [
        [
          { text: "▶️ Stream", url: streamLink },
          { text: "⬇️ Download", url: downloadLink }
        ]
      ]
    };

    await axios.post(`${TG}/sendMessage`, {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      reply_markup: buttons
    });

    return res.send("OK");

  } catch (e) {
    console.error(e);
    return res.status(200).send("Handled");
  }
}

async function send(chatId, text) {
  await axios.post(`${TG}/sendMessage`, {
    chat_id: chatId,
    text
  });
      }
