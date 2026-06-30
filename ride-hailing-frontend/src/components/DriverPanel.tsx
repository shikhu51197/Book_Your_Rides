"use client";

import React, { useState } from "react";
import { Driver } from "../types";
import styles from "./DriverPanel.module.css";

interface Props {
  drivers: Driver[];
  onAddDrivers: (count: number) => Promise<void>;
  isAdding: boolean;
}

export default function DriverPanel({ drivers, onAddDrivers, isAdding }: Props) {
  const [count, setCount] = useState<number>(5);

  return (
    <div className={`glass-panel ${styles.panel}`}>
      <div className={styles.header}>
        <h2>Driver Management</h2>
        <div className={styles.controls}>
          <input 
            type="number" 
            min="1" 
            max="20" 
            value={count} 
            onChange={(e) => setCount(parseInt(e.target.value) || 1)}
            className={styles.input}
          />
          <button 
            className={`glass-button ${styles.addButton}`} 
            onClick={() => onAddDrivers(count)}
            disabled={isAdding}
          >
            {isAdding ? "Adding..." : `Add ${count} Drivers`}
          </button>
        </div>
      </div>
      
      <div className={styles.grid}>
        {drivers.length === 0 ? (
          <div className={styles.empty}>No drivers currently online. Add some to start the simulation.</div>
        ) : (
          drivers.map(d => (
            <div key={d.id} className={styles.driverCard}>
              <div className={styles.driverInfo}>
                <span className={styles.driverName}>{d.name}</span>
                <span className={styles.statusBadge}>{d.status || "ONLINE"}</span>
              </div>
              <div className={styles.driverMeta}>
                <span>ID: {d.id.substring(0, 8)}...</span>
                <span>Lat: {d.lat?.toFixed(4)} Lng: {d.lng?.toFixed(4)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
