import { WebSocketServer } from 'ws';
import http from 'http';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3001;
const TOKEN = process.env.TELEGRAM_TOKEN;
const site = process.env.URL;

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
const pendingPosts = {};

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  if (msg.text && msg.text.startsWith('/url')) {
    bot.sendMessage(chatId, `${site}`);
    return;
  }

  // /post текст
  if (msg.text && msg.text.startsWith('/post ')) {
    const text = msg.text.slice(6).trim();
    if (!text) {
      return bot.sendMessage(chatId, 'Укажи текст после команды: /post твой текст');
    }

    pendingPosts[chatId] = { text };

    // Очистка через 2 минуты
    setTimeout(() => delete pendingPosts[chatId], 120000);

    bot.sendMessage(chatId, 'Теперь отправь изображение к посту');
    return;
  }

  // получение сообщения после отправки текста
  if (msg.photo && pendingPosts[chatId]) {
    const photo = msg.photo[msg.photo.length - 1];

    try {
      const file = await bot.getFile(photo.file_id);
      const image = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
      const text = pendingPosts[chatId].text;

      const post = { text, image };
      broadcastPost(post);

      bot.sendMessage(chatId, '✅ Пост опубликован и отображён на сайте');
    } catch (err) {
      bot.sendMessage(chatId, '❌ Не удалось получить изображение');
    }

    delete pendingPosts[chatId];
    return;
  }

  // Если прислали просто фото или текст без указания /post
  if (!pendingPosts[chatId] && msg.photo) {
    bot.sendMessage(chatId, 'Сначала отправь /post текст, потом фото');
  }
});

server.listen(PORT, () => {
  console.log(`WebSocket сервер запущен на порт ${PORT}`);
});
