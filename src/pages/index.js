// src/pages/index.js

import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import styles from '../styles/HomePage.module.css';

export default function HomePage() {
  const { user, loading } = useAuth();
  if (loading) return <p>Cargando...</p>;

  return (
    <div className={styles.container}>
      {user ? (
        <div>
          <h1 className={styles.welcomeMessage}>Bienvenido, {user.email}</h1>
          <div className={styles.linkContainer}>
            <Link href="/chats" className={styles.link}>
              Ir a los chats
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.linkContainer}>
          <Link href="/auth/login" className={styles.link}>
            Login
          </Link>
          <Link href="/auth/register" className={styles.link}>
            Register
          </Link>
        </div>
      )}
    </div>
  );
}