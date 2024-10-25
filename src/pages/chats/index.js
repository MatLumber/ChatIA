import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, where, getDocs,getDoc, setDoc,deleteDoc, doc, Timestamp, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import styles from '../../styles/Chats.module.css';
import Navbar from '../../components/Navbar'; // Importar el Navbar


export default function ChatsPage() {
  const { user, loading } = useAuth();
  
  const [chats, setChats] = useState([]);
  const [chatName, setChatName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalTokens, setTotalTokens] = useState(0); // Nuevo estado para el total de tokens
  
  useEffect(() => {
    if (user) {
      const fetchChats = async () => {
        const now = new Date();
        const q = query(
          collection(db, 'chats'),
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
  
        const userChats = querySnapshot.docs.map((doc) => {
          const chatData = doc.data();
          const lastReset = chatData.lastReset ? chatData.lastReset.toDate() : null;
          const oneMonthPassed = lastReset && (now - lastReset) > 30 * 24 * 60 * 60 * 1000;
          if (oneMonthPassed) {
            updateDoc(doc.ref, { tokens: 0, lastReset: Timestamp.fromDate(now) });
            chatData.tokens = 0;
            chatData.lastReset = Timestamp.fromDate(now);
          }
          return { id: doc.id, ...chatData };
        });
        setChats(userChats);
      };
      fetchChats();
  
      const globalRef = doc(db, 'users', user.uid);
  
      const fetchTotalTokens = async () => {
        const globalDoc = await getDoc(globalRef);
        if (!globalDoc.exists()) {
          // Crear el documento si no existe y definir el total de tokens en 0
          await setDoc(globalRef, {
            totalTokens: 0,
            lastReset: Timestamp.fromDate(new Date()),
          });
          setTotalTokens(0);
        } else {
          setTotalTokens(globalDoc.data().totalTokens || 0);
        }
      
      };
  
      fetchTotalTokens();
  
      // Escuchar cambios en totalTokens en tiempo real
      const unsubscribe = onSnapshot(globalRef, (doc) => {
        if (doc.exists()) {
          const tokens = doc.data().totalTokens || 0;
         
          setTotalTokens(tokens);
        }
      });
  
      return () => unsubscribe();
    }
  }, [user]);

  const handleCreateChat = async () => {
    if (!chatName.trim()) {
      alert('Por favor, introduce un nombre para el chat.');
      return;
    }
  
    const newChat = {
      userId: user.uid,
      name: chatName,
      createdAt: Timestamp.fromDate(new Date()),
      tokens: 0,
      lastReset: Timestamp.fromDate(new Date()),
    };
    try {
      const docRef = await addDoc(collection(db, 'chats'), newChat);
      setChats([...chats, { id: docRef.id, ...newChat }]);
      setIsModalOpen(false);
      setChatName('');
    } catch (error) {
      console.error('Error creating chat: ', error);
      alert('Hubo un error al crear el chat. Por favor, inténtalo de nuevo.');
    }
  };
  
  const handleDeleteChat = async (chatId) => {
    try {
      await deleteDoc(doc(db, "chats", chatId));
      setChats(chats.filter((chat) => chat.id !== chatId));
    } catch (error) {
      console.error("Error deleting chat: ", error);
      alert("Hubo un error al eliminar el chat. Por favor, inténtalo de nuevo.");
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>Please log in to view your chats.</p>;
  
  return (
    <>
      <Navbar /> {/* Añadir el Navbar */}
      <div className={styles.container}>
      <h2>Total de tokens gastados: {totalTokens}</h2>
        {/* Mostrar el total de tokens */}
        <h1 className={styles.title}>Tus chats</h1>
        {chats.length === 0 ? (
          <p>No tienes ningún chat, crea uno.</p>
        ) : (
          <ul className={styles["chat-list"]}>
            {chats.map((chat) => (
              <li key={chat.id} className={styles["chat-item"]}>
                <Link href={`/chats/${chat.id}`}>
                  {chat.name || `Chat ${chat.id}`}
                </Link>
                <span>Tokens: {chat.tokens || 0}</span>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDeleteChat(chat.id, chat.tokens)}
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
        <button className={styles.button} onClick={() => setIsModalOpen(true)}>
          Crear un nuevo chat
        </button>
        {isModalOpen && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h2>Crear un nuevo chat</h2>
              <input
                type="text"
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
                placeholder="Nombre del chat"
                className={styles.input}
              />
              <div className={styles.buttonGroup}>
                <button className={styles.button} onClick={handleCreateChat}>
                  Crear
                </button>
                <button
                  className={styles.button}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
