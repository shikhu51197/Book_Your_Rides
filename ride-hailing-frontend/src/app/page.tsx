"use client";

import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Vybe Cabs Platform</h1>
        <p className={styles.subtitle}>Select a portal to continue</p>
      </header>

      <main className={styles.portalGrid}>
        <Link href="/rider" className={`glass-panel ${styles.portalCard}`}>
          <h2>Rider App</h2>
          <p>Request a ride and track status in real-time.</p>
        </Link>
        <Link href="/driver" className={`glass-panel ${styles.portalCard}`}>
          <h2>Driver App</h2>
          <p>Go online, receive incoming requests, and accept rides.</p>
        </Link>
        <Link href="/admin" className={`glass-panel ${styles.portalCard}`}>
          <h2>Admin Dashboard</h2>
          <p>Monitor system events and active rides globally.</p>
        </Link>
      </main>
    </div>
  );
}
