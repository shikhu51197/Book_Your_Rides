"use client";

import React, { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { Driver, Ride } from "../../types";
import styles from "./page.module.css";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

interface IncomingRequest {
  ride: Ride;
  candidates: string[];
}

export default function DriverDashboard() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState<IncomingRequest | null>(null);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [acceptResult, setAcceptResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const newSocket = io(API_BASE);
    setSocket(newSocket);

    newSocket.on("ride_requested", (data: IncomingRequest) => {
      // If we are a candidate, show the request
      if (driver && data.candidates.includes(driver.id)) {
        setIncomingRequest(data);
        setAcceptResult(null);
      }
    });

    return () => {
      newSocket.close();
    };
  }, [driver]);

  const handleGoOnline = async () => {
    try {
      const name = `Driver ${Math.floor(Math.random() * 1000)}`;
      const res = await fetch(`${API_BASE}/drivers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      
      const newDriver = await res.json();
      
      // Random location near city center
      const lat = 40.7128 + (Math.random() * 0.02 - 0.01);
      const lng = -74.0060 + (Math.random() * 0.02 - 0.01);
      
      await fetch(`${API_BASE}/drivers/${newDriver.id}/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, status: "ONLINE" }),
      });

      setDriver({ ...newDriver, lat, lng });
      setIsOnline(true);
      
      if (socket) {
        socket.emit('identify_driver', newDriver.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptRide = async () => {
    if (!incomingRequest || !driver) return;
    setIsAccepting(true);
    try {
      const res = await fetch(`${API_BASE}/rides/${incomingRequest.ride.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: driver.id }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setAcceptResult({ success: true, message: "Ride accepted successfully!" });
        setActiveRide(data);
      } else {
        setAcceptResult({ success: false, message: data.message || "Someone else accepted the ride." });
      }
    } catch (err: any) {
      setAcceptResult({ success: false, message: err.message });
    } finally {
      setIsAccepting(false);
      setIncomingRequest(null);
    }
  };

  const handleCompleteRide = async () => {
    if (!activeRide || !driver) return;
    setIsCompleting(true);
    try {
      const res = await fetch(`${API_BASE}/rides/${activeRide.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: driver.id }),
      });

      if (res.ok) {
        setActiveRide(null);
        setAcceptResult({ success: true, message: "Ride completed successfully!" });
      } else {
        const errData = await res.json();
        setAcceptResult({ success: false, message: errData.message });
      }
    } catch (err: any) {
      setAcceptResult({ success: false, message: err.message });
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.nav}>
          <Link href="/" className={styles.backBtn}>&larr; Back</Link>
          <div className={`${styles.statusDot} ${isOnline ? styles.online : styles.offline}`}>
            {isOnline ? "Online" : "Offline"}
          </div>
        </div>
        <h1 className={styles.title}>Driver Dashboard</h1>
      </header>

      <main className={styles.main}>
        {!isOnline ? (
          <div className={`glass-panel ${styles.panel} ${styles.centerPanel}`}>
            <h2>Ready to drive?</h2>
            <p>Go online to start receiving ride requests.</p>
            <button className={styles.onlineBtn} onClick={handleGoOnline}>
              Go Online
            </button>
          </div>
        ) : (
          <div className={styles.onlineContainer}>
            <div className={`glass-panel ${styles.infoPanel}`}>
              <div className={styles.driverInfo}>
                <div className={styles.avatar}>👤</div>
                <div>
                  <h3>{driver?.name}</h3>
                  <p>ID: {driver?.id.substring(0, 8)}...</p>
                </div>
              </div>
            </div>

            {acceptResult && (
              <div className={`glass-panel ${styles.resultPanel} ${acceptResult.success ? styles.success : styles.error}`}>
                {acceptResult.message}
              </div>
            )}

            {activeRide ? (
              <div className={`glass-panel ${styles.activeRidePanel}`}>
                <h2>Active Ride</h2>
                <div className={styles.requestDetails}>
                  <p><strong>Ride ID:</strong> {activeRide.id.substring(0, 8)}...</p>
                  <p><strong>Pickup:</strong> Lat {activeRide.pickup_lat}, Lng {activeRide.pickup_lng}</p>
                  <p><strong>Status:</strong> IN PROGRESS</p>
                </div>
                <button 
                  className={styles.completeBtn} 
                  onClick={handleCompleteRide}
                  disabled={isCompleting}
                >
                  {isCompleting ? "Completing..." : "Complete Ride"}
                </button>
              </div>
            ) : incomingRequest ? (
              <div className={`glass-panel ${styles.requestPanel} ${styles.pulseBorder}`}>
                <div className={styles.requestHeader}>
                  <div className={styles.newBadge}>NEW REQUEST</div>
                  <span className={styles.timer}>Accept quickly!</span>
                </div>
                <div className={styles.requestDetails}>
                  <p><strong>Ride ID:</strong> {incomingRequest.ride.id.substring(0, 8)}...</p>
                  <p><strong>Pickup:</strong> Lat {incomingRequest.ride.pickup_lat}, Lng {incomingRequest.ride.pickup_lng}</p>
                </div>
                <button 
                  className={styles.acceptBtn} 
                  onClick={handleAcceptRide}
                  disabled={isAccepting}
                >
                  {isAccepting ? "Accepting..." : "Accept Ride"}
                </button>
              </div>
            ) : (
              <div className={`glass-panel ${styles.waitingPanel}`}>
                <div className={styles.radar}></div>
                <p>Waiting for ride requests...</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
