"use client";

import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Ride } from "../../types";
import styles from "./page.module.css";
import Link from "next/link";
import dynamic from "next/dynamic";

const Map = dynamic(() => import("../../components/Map"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

export default function RiderDashboard() {
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [riderId, setRiderId] = useState("");
  const [step, setStep] = useState<"PICKUP" | "DROP" | "READY">("PICKUP");
  const [pickup, setPickup] = useState<{lat: number, lng: number}>({ lat: 40.7128, lng: -74.0060 });
  const [drop, setDrop] = useState<{lat: number, lng: number} | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRiderId(`rider-${Math.floor(Math.random() * 1000)}`);
  }, []);

  useEffect(() => {
    if (!riderId) return;

    const newSocket = io(API_BASE);

    newSocket.on("ride_status_updated", (ride: Ride) => {
      // Only update if it's our ride
      if (ride.rider_id === riderId) {
        setActiveRide(ride);
        if (ride.status === 'COMPLETED') {
          setShowPayment(true);
        }
      }
    });

    return () => {
      newSocket.close();
    };
  }, [riderId]);

  const handleRequestRide = async () => {
    setIsRequesting(true);
    try {
      const res = await fetch(`${API_BASE}/rides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riderId, pickupLat: pickup.lat, pickupLng: pickup.lng, dropLat: drop?.lat, dropLng: drop?.lng }),
      });
      
      if (!res.ok) throw new Error("Failed to request ride");
      const ride = await res.json();
      setActiveRide(ride);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.nav}>
          <Link href="/" className={styles.backBtn}>&larr; Back</Link>
          <div className={styles.userBadge}>👤 {riderId}</div>
        </div>
        <h1 className={styles.title}>Rider Dashboard</h1>
      </header>

      <main className={styles.main}>
        <div className={`glass-panel ${styles.panel}`}>
          <h2>Request a Ride</h2>
          
          <div className={styles.mapContainer}>
            <Map 
              center={step === 'PICKUP' ? [pickup.lat, pickup.lng] : drop ? [drop.lat, drop.lng] : [pickup.lat, pickup.lng]} 
              readOnly={step === 'READY'} 
              onLocationSelect={(lat, lng) => {
                if (step === 'PICKUP') setPickup({lat, lng});
                else if (step === 'DROP') setDrop({lat, lng});
              }}
              markers={[
                { id: 'pickup', lat: pickup.lat, lng: pickup.lng, title: "Pickup", type: "default" },
                ...(drop ? [{ id: 'drop', lat: drop.lat, lng: drop.lng, title: "Drop", type: "default" as const }] : [])
              ]}
              routePoints={drop ? [[pickup.lat, pickup.lng], [drop.lat, drop.lng]] : []}
            />
          </div>
          <p className={styles.mapHint}>
            {step === 'PICKUP' ? "Drag or click on the map to set pickup location" : 
             step === 'DROP' ? "Drag or click on the map to set drop location" : 
             "Review your route"}
          </p>

          {step === 'PICKUP' && (
            <button className={styles.requestBtn} onClick={() => setStep('DROP')}>Next: Set Drop Location</button>
          )}
          {step === 'DROP' && (
            <button className={styles.requestBtn} onClick={() => setStep('READY')} disabled={!drop}>Confirm Locations</button>
          )}
          {step === 'READY' && (
            <button 
              className={`${styles.requestBtn} ${isRequesting ? styles.pulse : ''}`}
              onClick={handleRequestRide}
              disabled={isRequesting || (activeRide !== null && activeRide.status !== 'TIMEOUT' && activeRide.status !== 'COMPLETED')}
            >
              {isRequesting ? "Requesting..." : "Request Ride Now"}
            </button>
          )}
        </div>

        {activeRide && (
          <div className={`glass-panel ${styles.panel}`}>
            <h2>Live Status</h2>
            <div className={styles.statusCard}>
              <div className={styles.row}>
                <span>Ride ID:</span>
                <strong>{activeRide.id.substring(0, 8)}...</strong>
              </div>
              <div className={styles.row}>
                <span>Status:</span>
                <span className={`${styles.statusBadge} ${styles[activeRide.status.toLowerCase()]}`}>
                  {activeRide.status}
                </span>
              </div>
              {activeRide.assigned_driver_id && (
                <div className={styles.row}>
                  <span>Driver Assigned:</span>
                  <strong>{activeRide.assigned_driver_id.substring(0, 8)}...</strong>
                </div>
              )}
              {activeRide.eta_minutes && (
                <div className={styles.row}>
                  <span>ETA:</span>
                  <strong>{activeRide.eta_minutes} mins</strong>
                </div>
              )}
              {activeRide.estimated_fare && (
                <div className={styles.row}>
                  <span>Est. Fare:</span>
                  <strong>${Number(activeRide.estimated_fare).toFixed(2)}</strong>
                </div>
              )}
            </div>
            
            {activeRide.status === 'SEARCHING' && (
              <div className={styles.loader}>Searching for nearby drivers...</div>
            )}
          </div>
        )}

        {showPayment && activeRide && !paymentSuccess && (
          <div className={styles.paymentOverlay}>
            <div className={`glass-panel ${styles.paymentModal}`}>
              <h2>Ride Completed!</h2>
              <div className={styles.fareAmount}>
                ${activeRide.fare ? Number(activeRide.fare).toFixed(2) : "0.00"}
              </div>
              <p>Please complete your payment.</p>
              
              <button 
                className={styles.razorpayBtn}
                onClick={() => {
                  // Mock Razorpay flow
                  setTimeout(() => setPaymentSuccess(true), 1500);
                }}
              >
                Pay with Razorpay
              </button>
            </div>
          </div>
        )}

        {paymentSuccess && (
          <div className={styles.paymentOverlay}>
            <div className={`glass-panel ${styles.paymentModal} ${styles.successModal}`}>
              <div className={styles.successCheck}>✓</div>
              <h2>Payment Successful!</h2>
              <p>Invoice has been sent to your email.</p>
              <button 
                className={styles.closeBtn}
                onClick={() => {
                  setPaymentSuccess(false);
                  setShowPayment(false);
                  setActiveRide(null);
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
