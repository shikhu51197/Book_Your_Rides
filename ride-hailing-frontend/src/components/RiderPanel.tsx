"use client";

import React from "react";
import { Ride } from "../types";
import styles from "./RiderPanel.module.css";

interface Props {
  activeRide: Ride | null;
  onRequestRide: () => Promise<void>;
  isRequesting: boolean;
}

export default function RiderPanel({ activeRide, onRequestRide, isRequesting }: Props) {
  return (
    <div className={`glass-panel ${styles.panel}`}>
      <div className={styles.header}>
        <h2>Rider Simulation</h2>
      </div>
      
      <div className={styles.content}>
        <div className={styles.actionArea}>
          <button 
            className={`${styles.requestBtn} ${isRequesting ? styles.pulse : ''}`}
            onClick={onRequestRide}
            disabled={isRequesting || (activeRide !== null && activeRide.status !== 'TIMEOUT' && activeRide.status !== 'ASSIGNED')}
          >
            {isRequesting ? "Requesting..." : "Request New Ride"}
          </button>
          <p className={styles.helpText}>Generates a new ride request with random pickup coordinates.</p>
        </div>

        <div className={styles.statusArea}>
          <h3>Current Ride Status</h3>
          {activeRide ? (
            <div className={styles.rideCard}>
              <div className={styles.rideId}>Ride ID: <span>{activeRide.id}</span></div>
              <div className={styles.rideRow}>
                <span className={styles.label}>Status:</span>
                <span className={`${styles.status} ${styles[activeRide.status.toLowerCase()] || ''}`}>
                  {activeRide.status}
                </span>
              </div>
              {activeRide.assigned_driver_id && (
                <div className={styles.rideRow}>
                  <span className={styles.label}>Assigned To:</span>
                  <span className={styles.driverId}>{activeRide.assigned_driver_id}</span>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.empty}>No active ride requested yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
