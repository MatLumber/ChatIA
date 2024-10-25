// src/pages/index.js

import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import styles from '../styles/HomePage.module.css';

export default function HomePage() {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading...</p>;

  return (
    <div className={styles.container}>
      {user ? (
        <div>
          <h1 className={styles.welcomeMessage}>Welcome, {user.email}</h1>
          <div className={styles.linkContainer}>
            <Link href="/chats" className={styles.link}>
              Go to Chats
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