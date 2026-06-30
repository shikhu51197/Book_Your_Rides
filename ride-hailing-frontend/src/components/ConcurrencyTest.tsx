"use client";

import React, { useEffect, useRef } from "react";
import styles from "./ConcurrencyTest.module.css";

export interface LogEntry {
  id: string;
  message: string;
  type: "info" | "success" | "error";
  timestamp: Date;
}

interface Props {
  activeRideId: string | null;
  onTriggerTest: () => Promise<void>;
  isTesting: boolean;
  logs: LogEntry[];
}

export default function ConcurrencyTest({ activeRideId, onTriggerTest, isTesting, logs }: Props) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className={`glass-panel ${styles.panel}`}>
      <div className={styles.header}>
        <h2>Concurrency Race Simulator</h2>
        <button 
          className={styles.raceBtn}
          onClick={onTriggerTest}
          disabled={isTesting || !activeRideId}
        >
          {isTesting ? "Racing..." : "Trigger Race to Accept"}
        </button>
      </div>
      
      <div className={styles.description}>
        <p>When triggered, all online drivers will simultaneously attempt to accept the current active ride. Watch the logs below to see the Redis + Postgres locking mechanism in action.</p>
      </div>

      <div className={styles.logContainer} ref={logContainerRef}>
        {logs.length === 0 ? (
          <div className={styles.emptyLog}>Awaiting events...</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`${styles.logEntry} ${styles[log.type]}`}>
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
  );
}
