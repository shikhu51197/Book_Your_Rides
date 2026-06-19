# Real-Time Driver Allocation System

A backend service that simulates the core workflow of a ride-hailing platform, supporting geo-based driver discovery, concurrency-safe ride assignment, timeout handling, and scalable state management.

## 🛠 Tech Stack

- **NestJS**: A progressive Node.js framework used for building an efficient and scalable server-side backend architecture.

- **PostgreSQL**: Used as the primary relational database to ensure ACID compliance, maintain transactional consistency, and handle pessimistic locking to guarantee safe and accurate ride assignments.



- **Redis**: Utilized for:
  - **GEO Indexing**: To perform fast and efficient spatial queries for nearby driver discovery.
  - **Distributed Locking**: To provide a fail-fast mechanism that prevents race conditions when multiple drivers try to accept the same ride concurrently.



- **Docker**: Used to containerize the application along with its dependencies (PostgreSQL and Redis images). It simplifies the setup process, providing a one-command, reproducible local development environment without the need for manual installations.

---

## 🚀 Key Features

### Driver Discovery
- Redis GEO indexing for nearest-driver lookup
- Real-time driver location updates

### Concurrency-Safe Ride Assignment
- Redis Distributed Lock + PostgreSQL Pessimistic Lock
- Guarantees only one driver can be assigned per ride
- Prevents race conditions under concurrent acceptance requests

### Ride Lifecycle Management
- REQUESTED → SEARCHING → ASSIGNED → TIMEOUT
- Automatic timeout handling and retry support

### Idempotency
- Duplicate acceptance requests are safely handled
- Prevents inconsistent ride assignments

### Dockerized Setup
- PostgreSQL + Redis containers
- One-command local development environment

---

## 🏛 Architecture Flow

```text
Rider Request
    ↓
Redis GEO Search
    ↓
Nearest Drivers
    ↓
Ride Created
    ↓
Driver Acceptance
    ↓
Redis Lock
    ↓
PostgreSQL Transaction
    ↓
Ride Assigned
```

---

## ⚡ Concurrency Strategy

The system uses a layered locking approach:

1. Redis Distributed Lock (Fast Fail-Fast Protection)
2. PostgreSQL Pessimistic Lock (Transactional Consistency)

This guarantees that at most one driver can successfully accept a ride, even under simultaneous requests across multiple application instances.

---

## 📈 Performance

| Operation | Complexity |
|------------|------------|
| Driver Location Update | O(log N) |
| Nearby Driver Search | O(log N + M) |
| Ride Assignment | O(1) |
| Lock Acquisition | O(1) |

Where:
- N = Total Drivers
- M = Nearby Drivers Returned

---

## 🔮 Production Scalability

Given more time, the system can be extended with:

- BullMQ/Kafka for distributed processing
- WebSockets for real-time driver notifications
- Redis Cluster for horizontal scaling
- ETA-based routing using Google Maps/OSRM
- Event-driven microservices architecture

---

## 📸 Execution Proof

### Create Driver
![Create Driver](ride-hailing-backend/assets/Postman_CreateDriver.png)

### Update Driver Location
![Update Driver Location](ride-hailing-backend/assets/Postman_UpdateDriver.png)

### Request Ride
![Create Ride](ride-hailing-backend//assets/Postman_CreateRide.png)

### Accept Ride
![Accept Ride](ride-hailing-backend//assets/Postman_AcceptRide_data.png)

### Concurrency Test 
![Multiple Drivers Try to Accept](ride-hailing-backend//assets/Postman_MultipleDriver_Try.png)     

### PostgreSQL Driver Data
![PostgreSQL Driver Data](ride-hailing-backend/assets/Postgresql_driver_data.png)

### PostgreSQL Rides Data
![PostgreSQL Rides Data](ride-hailing-backend/assets/Postgresql_rides_data.png)

### Redis Data
![Redis Data](ride-hailing-backend/assets/redis_data.png)

### Docker Containers
![Docker Containers](ride-hailing-backend/assets/Docker_Data.png)
