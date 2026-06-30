"use client";

import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import styles from "./page.module.css";
import Link from "next/link";
import dynamic from "next/dynamic";

const Map = dynamic(() => import("../../components/Map"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

interface AdminLog {
  id: string;
  message: string;
  timestamp: Date;
}

export default function AdminDashboard() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [drivers, setDrivers] = useState<Record<string, { lat: number, lng: number, name: string }>>({});
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io(API_BASE);
    setSocket(newSocket);

    const addLog = (message: string) => {
      setLogs(prev => [...prev, {
        id: Math.random().toString(36).substring(7),
        message,
        timestamp: new Date()
      }]);
    };

    newSocket.on("system_log", (message: string) => {
      addLog(message);
    });

    newSocket.on("ride_requested", (data: any) => {
      addLog(`Ride ${data.ride.id} requested. Candidates: ${data.candidates.length}`);
    });

    newSocket.on("ride_status_updated", (ride: any) => {
      addLog(`Ride ${ride.id} status changed to ${ride.status}`);
    });

    newSocket.on("driver_location_updated", (driver: any) => {
      setDrivers(prev => ({
        ...prev,
        [driver.id]: { lat: driver.current_lat, lng: driver.current_lng, name: driver.name }
      }));
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.nav}>
          <Link href="/" className={styles.backBtn}>&larr; Back</Link>
          <div className={styles.adminBadge}>Admin Mode</div>
        </div>
        <h1 className={styles.title}>System Monitor</h1>
      </header>

      <main className={styles.main}>
        <div className={`glass-panel ${styles.panel} ${styles.mapPanel}`}>
          <h2>Global Radar</h2>
          <div className={styles.adminMapContainer}>
            <Map 
              center={[40.7128, -74.0060]} 
              zoom={12}
              readOnly={true} 
              markers={Object.entries(drivers).map(([id, d]) => ({
                id,
                lat: d.lat,
                lng: d.lng,
                title: `Driver: ${d.name}`,
                type: 'car'
              }))}
            />
          </div>
        </div>

        <div className={`glass-panel ${styles.panel}`}>
          <div className={styles.panelHeader}>
            <h2>Global Event Stream</h2>
            <div className={styles.liveIndicator}>
              <span className={styles.dot}></span> Live
            </div>
          </div>
          
          <div className={styles.logContainer} ref={logContainerRef}>
            {logs.length === 0 ? (
              <div className={styles.emptyLog}>Waiting for system events via WebSockets...</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={styles.logEntry}>
                  <span className={styles.timestamp}>
                    {log.timestamp.toLocaleTimeString(undefined, { 
                      hour12: false, 
                      hour: "2-digit", 
                      minute: "2-digit",
                      second: "2-digit",
                      fractionalSecondDigits: 3 
                    })}
                  </span>
                  <span className={styles.message}>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
