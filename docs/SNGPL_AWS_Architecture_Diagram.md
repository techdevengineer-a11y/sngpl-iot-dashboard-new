# SNGPL IoT Dashboard - AWS Architecture Diagram

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    INTERNET                                             │
│                                                                                        │
│    ┌─────────────┐              ┌─────────────┐              ┌─────────────┐          │
│    │   Users     │              │   Admins    │              │  IoT Devices│          │
│    │  (Public)   │              │ (Restricted)│              │   (MQTT)    │          │
│    └──────┬──────┘              └──────┬──────┘              └──────┬──────┘          │
│           │                            │                            │                  │
│           │ HTTPS (443)                │ SSH (22)                   │ MQTT (1883)     │
│           │                            │ [IP Restricted]            │                  │
└───────────┼────────────────────────────┼────────────────────────────┼──────────────────┘
            │                            │                            │
            ▼                            ▼                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              AWS CLOUD (ap-southeast-1)                                │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐ │
│  │                         VPC: vpc-0a90b28003ab00b69                                │ │
│  │                                                                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────────┐│ │
│  │  │                    SECURITY GROUP: launch-wizard-2                          ││ │
│  │  │                    sg-02c35a4cac9018f9f                                     ││ │
│  │  │                                                                             ││ │
│  │  │  ┌───────────────────────────────────────────────────────────────────────┐ ││ │
│  │  │  │                         EC2 INSTANCE                                   │ ││ │
│  │  │  │                    i-0c9be221a7e7a3bc5                                 │ ││ │
│  │  │  │                                                                        │ ││ │
│  │  │  │   ┌────────────────┐    ┌─────────────────┐    ┌─────────────────┐   │ ││ │
│  │  │  │   │  ELASTIC IP    │    │   UFW FIREWALL  │    │   FAIL2BAN     │   │ ││ │
│  │  │  │   │ 47.130.53.251  │    │  (Host-based)   │    │  (IPS/IDS)     │   │ ││ │
│  │  │  │   └────────────────┘    └─────────────────┘    └─────────────────┘   │ ││ │
│  │  │  │                                                                        │ ││ │
│  │  │  │   ┌────────────────────────────────────────────────────────────────┐  │ ││ │
│  │  │  │   │                         NGINX                                   │  │ ││ │
│  │  │  │   │              (Reverse Proxy + SSL Termination)                 │  │ ││ │
│  │  │  │   │                                                                 │  │ ││ │
│  │  │  │   │  • Let's Encrypt SSL Certificate                               │  │ ││ │
│  │  │  │   │  • HSTS Enabled                                                │  │ ││ │
│  │  │  │   │  • Security Headers Configured                                 │  │ ││ │
│  │  │  │   │  • HTTP → HTTPS Redirect                                       │  │ ││ │
│  │  │  │   └──────────────────────────┬─────────────────────────────────────┘  │ ││ │
│  │  │  │                              │                                         │ ││ │
│  │  │  │              ┌───────────────┴───────────────┐                        │ ││ │
│  │  │  │              │                               │                        │ ││ │
│  │  │  │              ▼                               ▼                        │ ││ │
│  │  │  │   ┌─────────────────────┐       ┌─────────────────────┐              │ ││ │
│  │  │  │   │   REACT FRONTEND   │       │   FASTAPI BACKEND   │              │ ││ │
│  │  │  │   │   /var/www/html    │       │    localhost:8080   │              │ ││ │
│  │  │  │   │                     │       │                     │              │ ││ │
│  │  │  │   │  • Static Assets   │       │  • REST API         │              │ ││ │
│  │  │  │   │  • SPA Routing     │       │  • WebSocket        │              │ ││ │
│  │  │  │   │                     │       │  • MQTT Listener    │              │ ││ │
│  │  │  │   └─────────────────────┘       └──────────┬──────────┘              │ ││ │
│  │  │  │                                            │                          │ ││ │
│  │  │  │                              ┌─────────────┴─────────────┐            │ ││ │
│  │  │  │                              │                           │            │ ││ │
│  │  │  │                              ▼                           ▼            │ ││ │
│  │  │  │                   ┌─────────────────┐         ┌─────────────────┐    │ ││ │
│  │  │  │                   │     REDIS       │         │  MQTT CLIENT    │    │ ││ │
│  │  │  │                   │  localhost:6379 │         │  broker.emqx.io │    │ ││ │
│  │  │  │                   │    (Cache)      │         │   (External)    │    │ ││ │
│  │  │  │                   └─────────────────┘         └─────────────────┘    │ ││ │
│  │  │  │                                                                        │ ││ │
│  │  │  └────────────────────────────────────────────────────────────────────────┘ ││ │
│  │  │                                        │                                     ││ │
│  │  └────────────────────────────────────────┼─────────────────────────────────────┘│ │
│  │                                           │                                       │ │
│  │                                           │ PostgreSQL (5432)                     │ │
│  │                                           │ [Private Connection]                  │ │
│  │                                           ▼                                       │ │
│  │  ┌──────────────────────────────────────────────────────────────────────────────┐│ │
│  │  │                              AMAZON RDS                                       ││ │
│  │  │                                                                               ││ │
│  │  │   ┌────────────────────────────────────────────────────────────────────────┐ ││ │
│  │  │   │                      PostgreSQL 15.x                                    │ ││ │
│  │  │   │                                                                         │ ││ │
│  │  │   │  Endpoint: sngpl-dashboard-db.cdoqisicsp59.ap-southeast-1.rds.amazonaws│ ││ │
│  │  │   │  Database: sngpl_dashboard                                              │ ││ │
│  │  │   │                                                                         │ ││ │
│  │  │   │  • Encryption at Rest (AWS KMS)                                        │ ││ │
│  │  │   │  • SSL/TLS Encryption in Transit                                       │ ││ │
│  │  │   │  • Automated Backups (Recommended)                                     │ ││ │
│  │  │   │  • Not Publicly Accessible                                             │ ││ │
│  │  │   └────────────────────────────────────────────────────────────────────────┘ ││ │
│  │  └──────────────────────────────────────────────────────────────────────────────┘│ │
│  │                                                                                   │ │
│  └───────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘


                              GITHUB ACTIONS (CI/CD)
                         ┌──────────────────────────────┐
                         │     Self-Hosted Runner       │
                         │   (Running on EC2 Instance)  │
                         │                              │
                         │  • Auto-deploy on push       │
                         │  • Preserve .env file        │
                         │  • Service restart           │
                         └──────────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DEFENSE IN DEPTH                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  LAYER 1: AWS Security Group (Network Level)                                    │
│  ├── Inbound: HTTPS (443) → 0.0.0.0/0                                          │
│  ├── Inbound: HTTP (80) → 0.0.0.0/0                                            │
│  ├── Inbound: SSH (22) → [Restricted IP]                                        │
│  └── Outbound: All → 0.0.0.0/0                                                 │
│                                                                                  │
│  LAYER 2: UFW Firewall (Host Level)                                             │
│  ├── Default: Deny Incoming                                                     │
│  ├── Allow: 80/tcp, 443/tcp (Web)                                              │
│  └── Allow: 22/tcp from [Authorized IP]                                         │
│                                                                                  │
│  LAYER 3: fail2ban (Intrusion Prevention)                                       │
│  ├── SSH Protection: Enabled                                                    │
│  ├── Max Retry: 5 attempts                                                      │
│  └── Ban Time: 10 minutes                                                       │
│                                                                                  │
│  LAYER 4: Nginx (Application Level)                                             │
│  ├── SSL/TLS: Let's Encrypt (TLS 1.2/1.3)                                      │
│  ├── HSTS: max-age=31536000                                                     │
│  ├── X-Frame-Options: SAMEORIGIN                                                │
│  ├── X-Content-Type-Options: nosniff                                            │
│  └── X-XSS-Protection: 1; mode=block                                            │
│                                                                                  │
│  LAYER 5: Database (Data Level)                                                  │
│  ├── RDS Encryption at Rest                                                     │
│  ├── SSL/TLS in Transit                                                         │
│  └── VPC Private Subnet                                                         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User Request Flow:
═══════════════════════════════════════════════════════════════════════════════════

  Browser                 AWS                     Server                 Database
    │                      │                        │                       │
    │  HTTPS Request       │                        │                       │
    │─────────────────────▶│                        │                       │
    │                      │                        │                       │
    │                      │  Security Group        │                       │
    │                      │  [Port 443 Allowed]    │                       │
    │                      │───────────────────────▶│                       │
    │                      │                        │                       │
    │                      │                        │  UFW Check            │
    │                      │                        │  [443 Allowed]        │
    │                      │                        │                       │
    │                      │                        │  Nginx                │
    │                      │                        │  [SSL Termination]    │
    │                      │                        │                       │
    │                      │                        │  FastAPI              │
    │                      │                        │  [Process Request]    │
    │                      │                        │                       │
    │                      │                        │  PostgreSQL Query     │
    │                      │                        │───────────────────────▶
    │                      │                        │                       │
    │                      │                        │◀───────────────────────
    │                      │                        │  [Encrypted Response] │
    │                      │                        │                       │
    │◀─────────────────────────────────────────────│                       │
    │  HTTPS Response (Encrypted)                  │                       │
    │                      │                        │                       │

═══════════════════════════════════════════════════════════════════════════════════
```

## Port Summary

```
┌────────────────────────────────────────────────────────────────┐
│                     PORT CONFIGURATION                          │
├──────────┬──────────┬────────────────┬────────────────────────┤
│ Port     │ Protocol │ Access         │ Service                │
├──────────┼──────────┼────────────────┼────────────────────────┤
│ 443      │ TCP      │ Public         │ HTTPS (Web Traffic)    │
│ 80       │ TCP      │ Public         │ HTTP (Redirects to 443)│
│ 22       │ TCP      │ IP Restricted  │ SSH (Administration)   │
│ 8080     │ TCP      │ localhost only │ FastAPI Backend        │
│ 6379     │ TCP      │ localhost only │ Redis Cache            │
│ 5432     │ TCP      │ VPC Internal   │ PostgreSQL (RDS)       │
└──────────┴──────────┴────────────────┴────────────────────────┘
```
