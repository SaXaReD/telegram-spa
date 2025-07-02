import { useEffect, useState } from 'react';
import s from './CurrentPost.module.css';
import dotenv from 'dotenv';

export default function CurrentPost() {
  const [post, setPost] = useState({ text: 'Ожидаем пост...', image: '/images/default.svg' });

  useEffect(() => {
    const socket = new WebSocket(`wss://${import.meta.env.PUBLIC_WS_URL}`);

    socket.onopen = () => console.log('✅ WebSocket открыт');
    socket.onmessage = (event) => {
      console.log('📩 Получено сообщение:', event.data);
      setPost(JSON.parse(event.data));
    };
    socket.onerror = (err) => console.error('❌ Ошибка сокета', err);

    return () => socket.close();
  }, []);

  return (
    <div className={s.appWrapper}>
      <div className={s.topButtons}>
        <button disabled>Личный кабинет</button>
        <button disabled>Настройки</button>
        <button disabled>Поделиться</button>
      </div>

      <div className={s.cardWrapper}>
        <div className={s.newsCard}>
          {post.image && <img src={post.image} alt="Новость" />}
          <p className={s.newsText}>{post.text}</p>
        </div>
      </div>
    </div>
  );
}