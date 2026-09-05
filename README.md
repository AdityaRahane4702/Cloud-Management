# Cloud-Based Virtual Machine Monitoring Dashboard

Centralized monitoring solution for cloud virtual machines (VMs) powered by Python lightweight monitoring agents, Node.js/Express REST API backend, PostgreSQL database storage, and a React web dashboard.

---

## 1. Introduction
Cloud computing has become the foundation of modern IT infrastructure, enabling organizations to deploy multiple virtual machines (VMs) on shared physical hardware. As the number of VMs increases, monitoring their health, performance, and resource utilization becomes essential for maintaining system reliability and preventing service disruptions.

This project implements a **Cloud-Based Virtual Machine Monitoring Dashboard**, providing centralized monitoring of multiple virtual machines. Each virtual machine runs a lightweight monitoring agent developed in Python that collects system metrics such as CPU utilization, memory usage, disk usage, network statistics, and system uptime. The collected information is securely transmitted to a central monitoring server through REST APIs.

The monitoring server stores the received data in a PostgreSQL database and presents it through a responsive web-based dashboard, enabling administrators to observe the status and performance of all virtual machines from a single interface.

---

## 2. Problem Statement
Organizations often manage numerous virtual machines across different cloud platforms. Monitoring each VM individually is time-consuming and inefficient. Existing enterprise monitoring solutions may be expensive and overly complex for small organizations or educational purposes.

There is a need for a centralized, cost-effective, cloud-based monitoring system that continuously collects, stores, and visualizes the performance metrics of multiple virtual machines in real time.

---

## 3. Objectives
- **Centralized Dashboard**: Develop a single management interface for real-time monitoring of multiple VMs.
- **Metric Collection**: Gather real-time CPU, RAM, storage, and network utilization from each machine using `psutil`.
- **REST Telemetry**: Securely transmit metrics via HTTP REST APIs to the central server.
- **PostgreSQL Persistence**: Store time-series metrics, VM registry, and alert logs in PostgreSQL.
- **Interactive Visualization**: Display live statistics through interactive charts, progress meters, and status cards.
- **Alert Generation**: Automate notification triggers when resource utilization breaches configurable thresholds.

---

## 4. Scope of the Project
The proposed system can be used by:
- Educational institutions
- Small and medium businesses (SMBs)
- Cloud administrators & DevOps engineers
- System administrators
- Software development organizations & data centers

---

## 5. Proposed System Architecture

```
              +--------------------+
              |  Virtual Machine 1 |
              | Python Agent       |
              +--------------------+
                       |
                       |
              +--------------------+
              |  Virtual Machine 2 |
              | Python Agent       |
              +--------------------+
                       |
                       |
              +--------------------+
              |  Virtual Machine 3 |
              | Python Agent       |
              +--------------------+
                       |
                       |
                 REST API (HTTP)
                       |
                       |
        +-------------------------------+
        |      Monitoring Server        |
        | Node.js + Express.js          |
        +-------------------------------+
                       |
                PostgreSQL Database
                       |
                React Dashboard
```

### Components
1. **Python Monitoring Agent (`agent/agent.py`)**: Lightweight background service using `psutil` and `requests`. Collects CPU %, RAM %, Disk %, Network I/O, Uptime, Hostname, and OS info. Includes `agent/simulator.py` for simulating multi-VM environments.
2. **Backend Server (`backend/`)**: Node.js & Express REST API server. Handles VM registration, metric ingestion, time-series retrieval, and threshold evaluation.
3. **Database (`database/schema.sql`)**: PostgreSQL relational storage for `vms`, `metrics`, `alert_rules`, and `alerts`. Includes automatic pool setup and schema migration.
4. **Web Dashboard (`frontend/`)**: React.js SPA built with Vite. Displays real-time VM cards, KPI overview cards, interactive Recharts time-series graphs, alert drawer, and threshold sliders.

---

## 6. Technologies Used

| Component | Technology |
|---|---|
| **Frontend** | React.js (Vite), Recharts, Lucide Icons, Vanilla CSS |
| **Backend** | Node.js, Express.js |
| **Programming Language** | Python 3, JavaScript (Node.js) |
| **Monitoring Library** | `psutil`, `requests` |
| **Database** | PostgreSQL (`pg`), SQL Migrations |
| **API Architecture** | RESTful HTTP JSON APIs |
| **Cloud Target** | AWS EC2 / Microsoft Azure / Google Cloud / Local host |

---

## 7. Quick Start & Installation

### Prerequisites
- Node.js (v18+)
- Python 3.8+
- PostgreSQL daemon running locally on port 5432 (or automated in-memory engine fallback)

### Step 1: Install Dependencies
```bash
# Install backend and frontend dependencies
npm run setup
```

### Step 2: Start Backend Server
```bash
cd backend
npm run dev
# Running on http://localhost:5000
```

### Step 3: Start React Web Dashboard
In a new terminal:
```bash
cd frontend
npm run dev
# Running on http://localhost:5173
```

### Step 4: Run Python Monitoring Agent or Multi-VM Simulator
In a new terminal:
```bash
# Option A: Run Multi-VM Simulator (Simulates 4 VMs with dynamic workload spikes)
python3 agent/simulator.py

# Option B: Run Real System Agent on Current Host
python3 agent/agent.py
```

---

## 8. REST API Documentation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/vms` | List all registered VMs and their latest metrics snapshot |
| `GET` | `/api/vms/:vm_id` | Get metadata for a specific VM |
| `DELETE` | `/api/vms/:vm_id` | Deregister a VM |
| `POST` | `/api/metrics` | Ingest metric payload from Python agent |
| `GET` | `/api/metrics/history/:vm_id?range=1h` | Fetch historical time-series metric data (`15m`, `1h`, `6h`, `24h`) |
| `GET` | `/api/metrics/overview` | Fetch system summary stats (Avg CPU, Memory, VM status counters) |
| `GET` | `/api/alerts` | Retrieve active & resolved alert notifications |
| `PUT` | `/api/alerts/:id/resolve` | Mark an active alert as resolved |
| `GET` | `/api/alerts/rules` | Fetch configurable warning/critical alert threshold rules |
| `POST` | `/api/alerts/rules` | Update threshold rules |

---

## 9. Expected Outcomes
- Real-time observability of multiple virtual machines across cloud infrastructure.
- Instant alert generation when CPU, Memory, or Storage exceeds configured limits.
- Historical metric trends visualization for resource planning and capacity sizing.
- Zero-lockin, cost-effective open-source architecture suitable for academic and enterprise deployments.

---

## 10. Future Enhancements
- Email & SMS notification integrations via Twilio / SendGrid.
- Predictive AI failure forecasting based on time-series anomaly detection.
- Container & Kubernetes pod monitoring capabilities.
- Multi-tenant Role-Based Access Control (RBAC).

---

## 11. Conclusion
The Cloud-Based Virtual Machine Monitoring Dashboard provides an efficient, scalable, and intuitive solution for monitoring virtual machines hosted in cloud environments. By combining Python monitoring agents, Express REST APIs, PostgreSQL time-series storage, and a React dashboard, administrators can ensure high system availability, identify bottlenecks, and maintain optimal cloud performance.
