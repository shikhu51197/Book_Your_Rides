# Real-Time Driver Allocation System

This repository contains a backend service that simulates the core workflow of a ride-hailing platform. It efficiently handles driver discovery, high-concurrency requests, and reliable state assignment under load.

## 🛠 Technology Stack
* **Framework:** NestJS (Node.js)
* **Database:** PostgreSQL (Transactions & State Persistence)
* **Cache & Geo:** Redis (Geospatial Indexing & Distributed Locks)
* **Containerization:** Docker & Docker Compose

---

## 🚀 Setup & Run Instructions

### Prerequisites
* Docker and Docker Compose
* Node.js (v18+)

### 1. Start the Infrastructure (Database & Redis)
Ensure Docker is running, then spin up the required containers:
```bash
docker compose build
docker compose up -d
```
*(This starts PostgreSQL and Redis in the background).*

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Application
Start the application in development mode:
```bash
npm run start:dev
```
The application will be available at `http://localhost:3000`.

---

## 🛣 API Routes & Execution Proof

### 1. Driver Management

#### Create a Driver
* **Route:** `POST /drivers`
* **Description:** Registers a new driver in the system.
![Create Driver](./assets/Postman_CreateDriver.png)

#### Update Driver Location
* **Route:** `POST /drivers/:id/location`
* **Description:** Updates the driver's real-time location and status in Redis (Geospatial Index) and PostgreSQL.
![Update Driver Location](./assets/Postman_UpdateDriver.png)

### 2. Ride Management

#### Request a Ride
* **Route:** `POST /rides`
* **Description:** Requests a new ride. The system queries Redis for the nearest available drivers and creates a pending ride.
![Create Ride](./assets/Postman_CreateRide.png)

#### Accept a Ride
* **Route:** `POST /rides/:rideId/accept`
* **Description:** Allows a driver to accept a ride. Handles race conditions using distributed Redis locks and PostgreSQL pessimistic locking.
![Accept Ride](./assets/Postman_AcceptRide_data.png)

*Proof of Concurrency Handling (Multiple drivers attempting to accept at the same time, returning 409 Conflict for the slower request):*
![Multiple Drivers Try to Accept](./assets/Postman_MultipleDriver_Try.png)

---

## 🗄️ Database & Cache State Proof

### Redis Geospatial Data
Shows active drivers loaded into the Geospatial index for fast $O(\log(N))$ location queries.
![Redis Data State](./assets/redis_data.png)

### PostgreSQL Driver Data
Persistent ACID-compliant state of drivers.
![PostgreSQL Driver State](./assets/Postgresql_driver_data.png)

### PostgreSQL Rides Data
Persistent ACID-compliant state of rides, tracking their lifecycle (e.g., ASSIGNED, TIMEOUT).
![PostgreSQL Rides State](./assets/Postgresql_rides_data.png)

---

## 🏛 Architecture Flow

Rider Request
      │
      ▼
 NestJS API
      │
      ▼
 Redis GEO Search
      │
      ▼
 Find Nearest Drivers
      │
      ▼
 Create Ride (PostgreSQL)
      │
      ▼
 Driver Accept Request
      │
      ▼
 Redis Distributed Lock
      │
      ▼
 PostgreSQL Transaction
      │
      ▼
 Ride Assigned
---

## ⭐ Additional Enhancements Implemented

Beyond the assignment requirements, the following engineering improvements were implemented:

### 1. Layered Concurrency Protection
Instead of relying on a single locking mechanism, the system uses a dual-layer approach:

- Redis Distributed Lock for fast fail-fast concurrency control
- PostgreSQL Pessimistic Write Lock for transactional consistency
- The solution guarantees that at most one driver can be assigned to a ride, even under simultaneous acceptance requests from multiple drivers across multiple application instances.

This ensures race conditions are prevented even under simultaneous driver acceptance requests.

### 2. ACID-Compliant Ride Assignment
Ride assignment operations are executed inside database transactions, guaranteeing:

- Atomic state transitions
- Consistent ride assignment
- No partial updates
- Recovery from failures

### 3. Geo-Spatial Driver Discovery
Implemented Redis GEO indexing for efficient nearest-driver lookup with logarithmic search complexity.

Benefits:
- Fast driver discovery
- Scalable location queries
- Real-time location updates

### 4. Idempotent Driver Acceptance
Duplicate acceptance requests from the same driver are safely handled without creating inconsistent ride states.

### 5. Retry & Timeout Workflow
Implemented automatic timeout handling for unaccepted rides and re-allocation readiness through lifecycle state management.

### 6. Dockerized Development Environment
Complete local setup using Docker Compose:

- PostgreSQL container
- Redis container
- Application container support

Allows one-command project startup.

### 7. Production Scalability Considerations
The architecture was intentionally designed with future scalability in mind:

- Message Queue integration (BullMQ/Kafka)
- Event-driven ride processing
- WebSocket-based real-time notifications
- Distributed timeout scheduling
- ETA-based routing integrations

### 8. Concurrency Testing Demonstration
Explicitly tested and documented scenarios where multiple drivers attempt to accept the same ride simultaneously.

Verified outcomes:

- First driver successfully acquires assignment
- Subsequent requests receive HTTP 409 Conflict
- No duplicate ride assignment occurs

### 9. Separation of Real-Time and Persistent State
The system separates:

- Redis → Real-time operational state
- PostgreSQL → Persistent business state

This pattern closely resembles production ride-hailing architectures.

---
## ⚡ Performance Characteristics

| Operation | Complexity |
|------------|------------|
| Driver Location Update | O(log N) |
| Nearby Driver Search | O(log N + M) |
| Ride Assignment | O(1) |
| Driver Acceptance Validation | O(1) |
| Redis Lock Acquisition | O(1) |

Where:
- N = Number of Drivers
- M = Number of Nearby Drivers Returned

  
---

## 🏗 System Design Overview & Roadmap for Scale

The current architecture provides a robust foundation for a ride-hailing core, cleanly separating ephemeral real-time state from persistent historical state. It resolves race conditions successfully via a Layered Locking Strategy (Redis Fail-Fast Lock + Postgres Pessimistic Write Lock). 

Due to the time constraints of the assignment, certain architectural decisions were optimized for immediate delivery. Here is how the system is designed to evolve for production-grade scale, aligned with advanced system design principles:

### 1. Scaling Timeout Scheduling (Message Queues)
* **Current State:** Timeout polling is handled by a local `@nestjs/schedule` cron job.
* **The Evolution:** To prevent race conditions in a horizontally scaled environment with multiple Node instances, this will be migrated to a distributed job queue like **BullMQ** (backed by Redis) or **AWS EventBridge**. This ensures exact-once processing of ride timeouts and seamless horizontal scalability.

### 2. Optimizing High-Frequency Location Pings
* **Current State:** The `/location` endpoint synchronously updates both Redis and Postgres.
* **The Evolution:** Relational databases can bottleneck under heavy write loads from continuous GPS pings. The design will shift to writing location pings *only* to Redis for real-time dispatching. A background worker or an event streaming platform like **Apache Kafka** will asynchronously batch-sync these locations to a data warehouse for analytics and historical tracking, completely decoupling the write paths.

### 3. Real-Time Event Streaming (WebSockets/SSE)
* **Current State:** The system currently relies on HTTP responses to represent state changes.
* **The Evolution:** Ride-hailing requires push-based communication. An event bus (e.g., **RabbitMQ** or Kafka) will be introduced to broadcast `RideRequested` events. An API Gateway utilizing **WebSockets** or **Server-Sent Events (SSE)** will then push these real-time notifications directly to mobile clients, eliminating the need for client-side polling.

### 4. ETA & Routing Accuracy
* **Current State:** Driver discovery uses Redis Haversine (straight-line) distance.
* **The Evolution:** Real-world dispatching will integrate with routing engines (like **OSRM** or **Google Maps Distance Matrix API**) to calculate true ETAs based on road networks and live traffic conditions, rather than simple geospatial proximity.

This roadmap demonstrates a clear path from a robust minimum viable architecture to a highly scalable, event-driven microservices ecosystem.
