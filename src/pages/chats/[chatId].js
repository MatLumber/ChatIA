import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { sendMessage } from "../../lib/openai";
import { db } from "../../lib/firebase";
import {
  orderBy,
  collection,
  addDoc,
  query,
  onSnapshot,
  doc,
  updateDoc,
  increment,
} from "firebase/firestore";
import styles from "../../styles/Chat.module.css";
import Prism from "prismjs";
import "prismjs/themes/prism.css";
import "prismjs/components/prism-python";
import Navbar from "../../components/Navbar"; // Importar el Navbar
import { useAuth } from '../../contexts/AuthContext'; // Importa useAuth


export default function ChatPage() {
  const router = useRouter();
  const { chatId } = router.query;
  const [messages, setMessages] = useState([]);
  const [memories, setMemories] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [newMemory, setNewMemory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [fileId, setFileId] = useState(null);
  const [useFile, setUseFile] = useState(false);
  const messagesEndRef = useRef(null);
  const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  const { user } = useAuth()
  
  useEffect(() => {
    if (chatId) {
      const messagesRef = collection(db, `chats/${chatId}/messages`);
      const q = query(messagesRef, orderBy("timestamp"));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const msgs = querySnapshot.docs.map((doc) => doc.data());
        setMessages(msgs);
      });
      return () => unsubscribe();
    }
  }, [chatId]);

  useEffect(() => {
    if (chatId) {
      const memoriesRef = collection(db, `chats/${chatId}/memories`);
      const q = query(memoriesRef, orderBy("timestamp"));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const mems = querySnapshot.docs.map((doc) => doc.data());
        setMemories(mems);
      });
      return () => unsubscribe();
    }
  }, [chatId]);

  useEffect(() => {
    Prism.highlightAll();
  }, [messages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
  
    const isCodeBlock = newMessage.startsWith("```") && newMessage.endsWith("```");
    const languageMatch = newMessage.match(/```(\w+)?/);
    const language = languageMatch ? languageMatch[1] : "plaintext";
    const messageType = isCodeBlock ? "embed" : "text";
    const messageText = isCodeBlock ? newMessage.replace(/```/g, "") : newMessage;
  
    const userMessageData = {
      text: messageText,
      sender: "user",
      timestamp: new Date(),
      type: messageType,
      language: language,
    };
  
    if (chatId) {
      await addDoc(collection(db, `chats/${chatId}/messages`), userMessageData);
    }
  
    const history = messages.map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text,
    }));
  
    if (memories && memories.length > 0) {
      memories.forEach((memory) => {
        history.push({ role: "system", content: memory.text });
      });
    }
  
    if (useFile && fileContent) {
      history.push({
        role: "system",
        content: `Contenido del archivo:\n${fileContent}`,
      });
    }
  
    const prompt = newMessage;
  
    const response = await sendMessage(prompt, history);
  
    const botMessageContent = response?.choices[0]?.message?.content || "";
    const tokensUsed = response?.usage?.total_tokens || 0;
  
    const botMessageData = {
      text: botMessageContent,
      sender: "chatbot",
      timestamp: new Date(),
      type: "text",
      language: null,
    };
  
    setNewMessage("");
  
    if (chatId && botMessageData.text) {
      await addDoc(collection(db, `chats/${chatId}/messages`), botMessageData);
  
      const chatRef = doc(db, `chats`, chatId);
      await updateDoc(chatRef, {
        tokens: increment(tokensUsed),
      });
  
      // Incrementar totalTokens en el documento de usuario
      const globalRef = doc(db, 'users', user.uid);
      await updateDoc(globalRef, {
        totalTokens: increment(tokensUsed),
      });
    }
  };

  const [fileContent, setFileContent] = useState("");

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      setFileContent(content);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "assistants");

      try {
        const response = await fetch("https://api.openai.com/v1/files", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: formData,
        });

        const data = await response.json();
        setFileId(data.id);
        console.log("Archivo subido con file_id:", data.id);
      } catch (error) {
        console.error("Error al cargar el archivo:", error);
      }
    };

    reader.readAsText(file);
  };

  const handleSaveMemory = async () => {
    if (!newMemory.trim()) return;

    const memoryData = {
      text: newMemory,
      timestamp: new Date(),
    };

    if (chatId) {
      await addDoc(collection(db, `chats/${chatId}/memories`), memoryData);
      setNewMemory("");
      setShowModal(false);
    }
  };

  const formatText = (text) => {
    text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
    text = text.replace(/~~(.+?)~~/g, "<del>$1</del>");
    text = text.replace(/^- (.+)/g, "<li>$1</li>");
    text = text.replace(/^(\d+)\. (.+)/g, "<li>$2</li>");

    const unorderedList = `<ul>${text
      .split(/<li>/g)
      .filter(Boolean)
      .map((item) => `<li>${item.replace(/<\/?li>/g, "")}</li>`)
      .join("")}
      </ul>`;
    const orderedList = `<ol>${text
      .split(/<li>/g)
      .filter(Boolean)
      .map((item) => `<li>${item.replace(/<\/?li>/g, "")}</li>`)
      .join("")}
      </ol>`;

    text = text.replace(/(<ul>|<\/ul>)/g, "");
    text = text.replace(/<li>(.*)<\/li>/g, unorderedList);
    text = text.replace(/<li>(.*)<\/li>/g, orderedList);

    return text;
  };

  return (
    <>
      <Navbar />
      <div className={styles.chatContainer}>
        <button
          onClick={() => setShowModal(true)}
          className={styles.addMemoryButton}
        >
          Agregar Memoria
        </button>
        <div className={styles.messages}>
          {messages.map((msg, index) => (
            <div
              key={index}
              className={
                msg.sender === "user"
                  ? styles.userMessage
                  : styles.chatbotMessage
              }
            >
              <div className={msg.type === "embed" ? styles.messageEmbed : ""}>
                <code dangerouslySetInnerHTML={{ __html: msg.text }} />
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className={styles.inputContainer}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" ? handleSendMessage() : null)}
            placeholder="Escribe tu mensaje..."
            className={styles.messageInput}
          />
          <input
            type="file"
            id="fileInput"
            onChange={handleFileUpload}
            className={styles.fileInput}
          />
          <label htmlFor="fileInput">Subir Archivo</label>
          <div className={styles.checkboxContainer}>
            <input
              type="checkbox"
              checked={useFile}
              onChange={() => setUseFile(!useFile)}
            />
            <span>Usar archivo</span>
          </div>
          <button onClick={handleSendMessage} className={styles.sendButton}>
            Enviar
          </button>
        </div>
      </div>
      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Agregar Memoria</h2>
            <input
              type="text"
              value={newMemory}
              onChange={(e) => setNewMemory(e.target.value)}
              placeholder="Escribe una memoria..."
              className={styles.memoryInput}
            />
            <button onClick={handleSaveMemory} className={styles.saveButton}>
              Guardar
            </button>
            <button
              onClick={() => setShowModal(false)}
              className={styles.cancelButton}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
