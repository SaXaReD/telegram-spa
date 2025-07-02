import { WebSocketServer } from 'ws';
import http from 'http';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3001;
const TOKEN = process.env.TELEGRAM_TOKEN;

// --- WebSocket сервер ---
const server = http.createServer();
const wss = new WebSocketServer({ server });

let currentPost = null;

wss.on('connection', (ws) => {
  console.log('🟢 Клиент подключился');
  if (currentPost) {
    ws.send(JSON.stringify(currentPost));
  }

  ws.on('close', () => console.log('🔴 Клиент отключился'));
});

function broadcastPost(post) {
  currentPost = post;
  const data = JSON.stringify(post);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(data);
    }
  });
}

// --- Telegram бот ---
const bot = new TelegramBot(TOKEN, { polling: true });

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  // /post текст
  if (!msg.caption || !msg.caption.startsWith('/post ')) {
    bot.sendMessage(chatId, 'Необходимо "/post текст новости + изображение"');
    return;
  }

  if (msg) {
    const text = msg.caption.slice(6).trim();
    const photo = msg.photo[msg.photo.length - 1];
    if (!text || !photo) {
      return bot.sendMessage(chatId, 'Укажи текст после команды: /post твой текст и изображение');
    }

    try {
      const file = await bot.getFile(photo.file_id);
      const image = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;

      const post = { text, image };
      broadcastPost(post);

      bot.sendMessage(chatId, '✅ Пост опубликован и отображён на сайте');
    } catch (err) {
      bot.sendMessage(chatId, '❌ Не удалось получить изображение');
    }
  }
});

server.listen(PORT, () => {
  console.log(`WebSocket сервер запущен на порт ${PORT}`);
});
