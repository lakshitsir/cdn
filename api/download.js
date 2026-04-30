import axios from "axios";

const TOKEN = process.env.BOT_TOKEN;

export default async function handler(req, res) {
  try {
    const fileId = req.query.id;
    if (!fileId) return res.status(400).send("Missing id");

    const TG = `https://api.telegram.org/bot${TOKEN}`;
    const FILE = `https://api.telegram.org/file/bot${TOKEN}`;

    const r = await axios.get(`${TG}/getFile`, {
      params: { file_id: fileId }
    });

    const path = r.data.result.file_path;
    const url = `${FILE}/${path}`;

    // ⬇️ download hint
    res.setHeader("Content-Disposition", "attachment");

    return res.redirect(302, url);

  } catch (e) {
    console.error(e);
    return res.status(200).send("Error");
  }
}
