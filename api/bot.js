import axios from "axios";

const TOKEN = process.env.BOT_TOKEN;
const TG = `https://api.telegram.org/bot${TOKEN}`;
const FILE = `https://api.telegram.org/file/bot${TOKEN}`;
const ALLOWED = 5421311764;

// utils
const MB = (b) => (b / (1024 * 1024)).toFixed(2);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).send("🚀 Bot Running");
    }

    const msg = req.body?.message;
    if (!msg) return res.send("No message");

    const chatId = msg.chat?.id;

    // 🔐 secure filter
    if (chatId !== ALLOWED || msg.chat.type !== "private") {
      return res.send("Ignored");
    }

    // 🎬 typing animation
    await action(chatId, "upload_document");

    // 📦 detect ANY media
    let file =
      msg.document ||
      msg.video ||
      msg.audio ||
      msg.voice ||
      msg.animation ||
      msg.video_note ||
      (msg.photo ? msg.photo[msg.photo.length - 1] : null);

    if (!file) {
      await send(chatId, "📤 Send any media/file");
      return res.send("No media");
    }

    const fileId = file.file_id;
    const size = file.file_size || 0;
    const name = file.file_name || "media";
    const mime = file.mime_type || "unknown";

    // 🔗 get file path
    const r = await axios.get(`${TG}/getFile`, {
      params: { file_id: fileId }
    });

    if (!r.data?.ok) throw new Error("getFile failed");

    const path = r.data.result.file_path;
    const link = `${FILE}/${path}`;

    // 🧠 smart logic
    let note = "";
    const sizeMB = parseFloat(MB(size));

    if (sizeMB < 100) {
      note = "✅ Smooth in browser";
    } else if (sizeMB < 500) {
      note = "⚠️ Medium file → VLC recommended";
    } else {
      note = "🚨 Large file → Use VLC / MX Player";
    }

    if (mime.includes("mp4")) {
      note += "\n🎞️ MP4 → best browser support";
    } else if (mime.includes("mkv")) {
      note += "\n🎞️ MKV → better in VLC";
    }

    // 🎨 UI caption
    const caption =
`📁 ${name}
📦 ${MB(size)} MB
📄 ${mime}

${note}

👨‍💻 Developer: Lakshit`;

    // 🔘 buttons
    const buttons = {
      inline_keyboard: [
        [
          { text: "▶️ Stream", url: link },
          { text: "⬇️ Download", url: link }
        ],
        [
          { text: "📋 Copy Link", url: link }
        ]
      ]
    };

    // 🎬 best UX (auto preview)
    if (msg.video) {
      await axios.post(`${TG}/sendVideo`, {
        chat_id: chatId,
        video: fileId,
        caption,
        supports_streaming: true,
        reply_markup: buttons
      });
    } else if (msg.photo) {
      await axios.post(`${TG}/sendPhoto`, {
        chat_id: chatId,
        photo: fileId,
        caption,
        reply_markup: buttons
      });
    } else {
      await axios.post(`${TG}/sendMessage`, {
        chat_id: chatId,
        text: `${caption}\n\n🎬 Stream:\n${link}`,
        disable_web_page_preview: true,
        reply_markup: buttons
      });
    }

    return res.send("OK");

  } catch (e) {
    console.error("ERROR:", e.message);
    return res.status(200).send("Handled");
  }
}

// send msg
async function send(chatId, text) {
  try {
    await axios.post(`${TG}/sendMessage`, {
      chat_id: chatId,
      text
    });
  } catch {}
}

// typing animation
async function action(chatId, type) {
  try {
    await axios.post(`${TG}/sendChatAction`, {
      chat_id: chatId,
      action: type
    });
  } catch {}
        }
