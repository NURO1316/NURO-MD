const axios = require("axios");
const ytdl = require("ytdl-core");
const fs = require("fs");
const { exec } = require("child_process");

async function downloadSong(url, output) {
    return new Promise((resolve, reject) => {
        ytdl(url, { filter: "audioonly" })
            .pipe(fs.createWriteStream(output))
            .on("finish", resolve)
            .on("error", reject);
    });
}

async function fetchSongInfo(query) {
    try {
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl);
        const videoId = data.match(/"videoId":"(.*?)"/)[1];
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        return { title: query, url: videoUrl };
    } catch (error) {
        return null;
    }
}

async function songHandler(m, sock) {
    const chatId = m.key.remoteJid;
    const command = m.message.conversation || m.message.extendedTextMessage?.text;
    
    if (command.startsWith(".song ")) {
        const songName = command.replace(".song ", "").trim();
        
        if (!songName) return sock.sendMessage(chatId, { text: "⛔ කරුණාකර සින්දුවේ නම සඳහන් කරන්න!" }, { quoted: m });

        const songInfo = await fetchSongInfo(songName);
        if (!songInfo) return sock.sendMessage(chatId, { text: "❌ සින්දුව හම්බ උන්නෑ...!" }, { quoted: m });

        sock.sendMessage(chatId, { text: `🔍 *${songInfo.title}* සොයමින්...` }, { quoted: m });

        const audioPath = `./temp/${songInfo.title}.mp3`;
        await downloadSong(songInfo.url, audioPath);

        const audioBuffer = fs.readFileSync(audioPath);
        
        await sock.sendMessage(chatId, { audio: audioBuffer, mimetype: "audio/mp4" }, { quoted: m });
        await sock.sendMessage(chatId, { document: audioBuffer, mimetype: "audio/mpeg", fileName: `${songInfo.title}.mp3` }, { quoted: m });

        fs.unlinkSync(audioPath); // Delete after sending
    }
}

module.exports = songHandler;
