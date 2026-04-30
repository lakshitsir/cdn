import axios from "axios";

const TOKEN = process.env.BOT_TOKEN;
const TG_API = `https://api.telegram.org/bot${TOKEN}`;
const FILE_API = `https://api.telegram.org/file/bot${TOKEN}`;

// 🔐 Single-user lock
const ALLOWED_USER_ID = 5421311764;

// helpers
const mb = (b) => (b / (1024 * 1024)).toFixed(2);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  try {
    const update = req.body;
    const msg = update.message;
    if (!msg) return res.send("No message");

    const chatId = msg.chat.id;

    // 🔒 strict: only you, only private
    if (chatId !== ALLOWED_USER_ID || msg.chat.type !== "private") {
      return res.send("Ignored");
    }

    // 🎬 small UX touch (shows “working…”)
    await sendChatAction(chatId, "upload_document");

    // 🎯 detect ANY media
    let file = null;
    if (msg.document) file = msg.document;
    else if (msg.video) file = msg.video;
    else if (msg.audio) file = msg.audio;
    else if (msg.voice) file = msg.voice;
    else if (msg.animation) file = msg.animation;
    else if (msg.video_note) file = msg.video_note;
    else if (msg.photo) file = msg.photo[msg.photo.length - 1]; // best quality

    if (!file) {
      await sendText(chatId, "📤 Send any media/file to generate stream link.");
      return res.send("No media");
    }

    const fileId = file.file_id;
    const fileSize = file.file_size || 0;
    const fileName = file.file_name || "media";
    const mime = file.mime_type || "unknown";

    // 🔗 get file path
    const { data } = await axios.get(`${TG_API}/getFile`, {
      params: { file_id: fileId },
      timeout: 15000
    });
    if (!data?.ok) throw new Error("getFile failed");

    const filePath = data.result.file_path;
    const link = `${FILE_API}/${filePath}`;

    // 🧠 intelligent playback hint
    const sizeNum = parseFloat(mb(fileSize));
    let note = "";
    if (sizeNum < 100) {
      note = "✅ Smooth in browser • ⚡ Instant play";
    } else if (sizeNum < 500) {
      note = "⚠️ Medium file • Browser ok, VLC better";
    } else {
      note = "🚨 Large file • Use VLC / MX Player for best streaming";
    }

    if (/mp4/i.test(mime)) {
      note += "\n🎞️ MP4 → best browser support";
    } else if (/mkv|matroska/i.test(mime)) {
      note += "\n🎞️ MKV → prefer VLC";
    }

    // 💎 caption (clean + pro)
    const caption =
`📁 Name: ${fileName}
📦 Size: ${mb(fileSize)} MB
📄 Type: ${mime}

${note}

👨‍💻 Developer: Lakshit`;

    // 🔘 inline buttons (animated-feel UX)
    const keyboard = {
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

    // 🎬 best UX: if it’s a video/photo, send preview with buttons
    if (msg.video) {
      await axios.post(`${TG_API}/sendVideo`, {
        chat_id: chatId,
        video: fileId, // reuse Telegram file (no reupload cost)
        caption,
        reply_markup: keyboard,
        supports_streaming: true
      }, { timeout: 20000 });
    } else if (msg.photo) {
      await axios.post(`${TG_API}/sendPhoto`, {
        chat_id: chatId,
        photo: fileId,
        caption,
        reply_markup: keyboard
      }, { timeout: 20000 });
    } else {
      // fallback: text message with buttons
      await axios.post(`${TG_API}/sendMessage`, {
        chat_id: chatId,
        text: `${caption}\n\n🎬 Stream:\n${link}\n\n⬇️ Download:\n${link}`,
        disable_web_page_preview: true,
        reply_markup: keyboard
      }, { timeout: 20000 });
    }

    return res.send("Done");

  } catch (err) {
    console.error("ERROR:", err?.response?.data || err.message);
    // silent fail (no spam), but keep webhook OK
    return res.status(200).send("Handled");
  }
}

// helpers
async function sendText(chatId, text) {
  return axios.post(`${TG_API}/sendMessage`, {
    chat_id: chatId,
    text,
    disable_web_page_preview: true
  });
}

async function sendChatAction(chatId, action) {
  try {
    await axios.post(`${TG_API}/sendChatAction`, {
      chat_id: chatId,
      action
    });
    // tiny delay so user sees it
    await sleep(300);
  } catch {}
}
