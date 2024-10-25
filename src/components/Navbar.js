// src/components/Navbar.js
import { useState } from "react";
import { useRouter } from "next/router";
import { getAuth, signOut } from "firebase/auth";
import styles from "../styles/Navbar.module.css";

export default function Navbar() {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();
  const auth = getAuth();

  const handleChatsList = () => {
    router.push("/chats");
  };

  const handleLogout = async () => {
    try {
      // Cierra la sesión del usuario en Firebase
      await signOut(auth);
      console.log("Sesión de Firebase cerrada.");

      // Elimina el token de autenticación del almacenamiento local
      localStorage.removeItem("authToken");
      console.log("Token eliminado del almacenamiento local.");

      // Redirige al usuario a la página de inicio de sesión
      router.push("/");
      console.log("Redirigiendo a la página de inicio de sesión...");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const handleLogoutClick = () => {
    setShowModal(true);
  };

  const handleConfirmLogout = () => {
    setShowModal(false);
    handleLogout();
  };

  const handleCancelLogout = () => {
    setShowModal(false);
  };

  return (
    <nav className={styles.navbar}>
      <button onClick={handleChatsList} className={styles.navButton}>
        Lista de chats
      </button>
      <button onClick={handleLogoutClick} className={styles.navButton}>
        Cerrar sesión
      </button>

      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <p>¿Estás seguro de que deseas cerrar sesión?</p>
            <button onClick={handleConfirmLogout} className={styles.confirmButton}>
              Sí
            </button>
            <button onClick={handleCancelLogout} className={styles.cancelButton}>
              No
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}