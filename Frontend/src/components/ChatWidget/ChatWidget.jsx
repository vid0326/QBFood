/**
 * #32: Live Order Chat Widget
 * Floats as a draggable bubble on MyOrders when an order is in transit.
 * Connects to the order's socket room for real-time messages.
 */
import { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { StoreContext } from '../../context/StoreContext';
import styles from './ChatWidget.module.css';

const ChatWidget = ({ order }) => {
  const { URl, token, userData } = useContext(StoreContext);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  const orderId = order?._id;
  const myId = userData?.id || userData?._id;

  // Load history & join socket room
  useEffect(() => {
    if (!open || !orderId || !token) return;

    // Fetch history
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${URl}/api/chat/${orderId}`, { headers: { token } });
        if (res.data.success) setMessages(res.data.data);
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    fetchHistory();

    // Join socket room
    socketRef.current = io(URl, { transports: ['websocket'] });
    socketRef.current.emit('join_order', orderId);
    socketRef.current.on('chat_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [open, orderId, token]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      await axios.post(
        `${URl}/api/chat/${orderId}`,
        { text, senderName: userData?.name || 'Customer', role: 'customer' },
        { headers: { token } }
      );
    } catch { /* socket will handle delivery */ }
    finally { setSending(false); }
  };

  const timeStr = (date) => new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const isActive = ['Preparing', 'Out for delivery'].includes(order?.status);
  if (!isActive) return null;

  return (
    <div className={styles.widget}>
      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span>💬 Order Chat</span>
            <span className={styles.headerMeta}>Order #{orderId?.slice(-6).toUpperCase()}</span>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className={styles.messages}>
            {loading ? (
              <div className={styles.centerMsg}>Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className={styles.centerMsg}>
                <span>👋</span>
                <p>Chat with your delivery agent here.</p>
                <p style={{ fontSize: '11px', color: '#57534e' }}>Messages are visible to the agent once assigned.</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMine = msg.senderId === myId || msg.role === 'customer';
                return (
                  <div key={i} className={`${styles.msg} ${isMine ? styles.msgMine : styles.msgOther}`}>
                    {!isMine && <span className={styles.sender}>{msg.senderName}</span>}
                    <div className={styles.bubble}>{msg.text}</div>
                    <span className={styles.time}>{timeStr(msg.createdAt)}</span>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendMessage} className={styles.inputRow}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message..."
              className={styles.chatInput}
              maxLength={500}
              disabled={sending}
            />
            <button type="submit" className={styles.sendBtn} disabled={!input.trim() || sending}>
              {sending ? '⏳' : '➤'}
            </button>
          </form>
        </div>
      )}

      <button
        className={styles.bubble}
        onClick={() => setOpen(o => !o)}
        title="Chat with delivery agent"
      >
        💬
        {messages.length > 0 && !open && <span className={styles.unreadDot} />}
      </button>
    </div>
  );
};

export default ChatWidget;
