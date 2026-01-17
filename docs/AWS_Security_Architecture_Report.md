# SNGPL IoT Dashboard - AWS Security Architecture Report

---

**Document Classification:** Internal - Security Review
**Version:** 1.0
**Date:** January 16, 2026
**Prepared By:** Infrastructure Security Team
**Review Status:** Production Ready

---

## Executive Summary

This document provides a comprehensive security architecture overview of the SNGPL IoT Dashboard deployment on Amazon Web Services (AWS). The infrastructure has been designed and hardened following AWS Well-Architected Framework security best practices and industry-standard security controls.

The deployment utilizes a defense-in-depth strategy with multiple security layers including network-level controls (Security Groups), host-based firewalls (UFW), intrusion prevention (fail2ban), encrypted communications (TLS 1.3), and secure database connectivity.

---

## 1. Infrastructure Overview

### 1.1 Deployment Architecture

| Component | Service | Configuration |
|-----------|---------|---------------|
| Compute | Amazon EC2 | t3.medium instance |
| Database | Amazon RDS | PostgreSQL 15.x |
| Static IP | Elastic IP | Persistent public endpoint |
| DNS | External | Route to Elastic IP |
| SSL/TLS | Let's Encrypt | Auto-renewal configured |

### 1.2 Instance Specifications

| Attribute | Value |
|-----------|-------|
| **Instance ID** | `i-0c9be221a7e7a3bc5` |
| **Instance Type** | t3.medium |
| **Region** | ap-southeast-1 (Singapore) |
| **Availability Zone** | ap-southeast-1a |
| **Operating System** | Ubuntu 24.04 LTS |
| **Elastic IP** | 47.130.53.251 |
| **Private IP** | 172.30.0.53 |
| **VPC ID** | vpc-0a90b28003ab00b69 |

### 1.3 Domain Configuration

| Domain | Target | SSL Status |
|--------|--------|------------|
| www.sngpldashboard.online | 47.130.53.251 | Valid (Let's Encrypt) |

---

## 2. Network Security Architecture

### 2.1 Security Group Configuration

**Security Group:** `launch-wizard-2`
**Security Group ID:** `sg-02c35a4cac9018f9f`

#### Inbound Rules

| Type | Protocol | Port Range | Source | Description |
|------|----------|------------|--------|-------------|
| HTTPS | TCP | 443 | 0.0.0.0/0 | Public web access (TLS encrypted) |
| HTTP | TCP | 80 | 0.0.0.0/0 | Redirect to HTTPS |
| SSH | TCP | 22 | Restricted IP | Administrative access only |

#### Outbound Rules

| Type | Protocol | Port Range | Destination | Description |
|------|----------|------------|-------------|-------------|
| All Traffic | All | All | 0.0.0.0/0 | Standard outbound |

### 2.2 Host-Based Firewall (UFW)

The EC2 instance runs Uncomplicated Firewall (UFW) as a secondary defense layer.

```
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing)

To                         Action      From
--                         ------      ----
80,443/tcp (Nginx Full)    ALLOW IN    Anywhere
22                         ALLOW IN    [Authorized IP Only]
```

**Key Configuration:**
- Default policy: Deny all incoming connections
- Explicit allow rules for required services only
- SSH access restricted to authorized IP addresses
- Logging enabled for security monitoring

### 2.3 Network Flow Diagram

```
                                    ┌─────────────────────────────────────┐
                                    │           AWS Cloud                 │
                                    │        (ap-southeast-1)             │
                                    │                                     │
┌──────────┐    HTTPS (443)        │  ┌─────────────────────────────┐   │
│  Users   │ ───────────────────────▶ │     Security Group          │   │
│ (Public) │                       │  │   sg-02c35a4cac9018f9f      │   │
└──────────┘                       │  │                             │   │
                                    │  │  ┌───────────────────────┐ │   │
                                    │  │  │      EC2 Instance     │ │   │
┌──────────┐    SSH (22)           │  │  │  i-0c9be221a7e7a3bc5  │ │   │
│  Admin   │ ───────────────────────▶ │  │                       │ │   │
│(Restrict)│   [IP Restricted]     │  │  │  ┌─────────────────┐ │ │   │
└──────────┘                       │  │  │  │   UFW Firewall  │ │ │   │
                                    │  │  │  │   (Layer 2)     │ │ │   │
                                    │  │  │  └─────────────────┘ │ │   │
                                    │  │  │                       │ │   │
                                    │  │  │  ┌─────────────────┐ │ │   │
                                    │  │  │  │     Nginx       │ │ │   │
                                    │  │  │  │  (Reverse Proxy)│ │ │   │
                                    │  │  │  └────────┬────────┘ │ │   │
                                    │  │  │           │          │ │   │
                                    │  │  │  ┌────────▼────────┐ │ │   │
                                    │  │  │  │  FastAPI Backend│ │ │   │
                                    │  │  │  │   (Port 8080)   │ │ │   │
                                    │  │  │  └────────┬────────┘ │ │   │
                                    │  │  └───────────│──────────┘ │   │
                                    │  └──────────────│────────────┘   │
                                    │                 │                 │
                                    │  ┌──────────────▼────────────┐   │
                                    │  │        Amazon RDS          │   │
                                    │  │   PostgreSQL Database      │   │
                                    │  │   (Private Subnet)         │   │
                                    │  └────────────────────────────┘   │
                                    └─────────────────────────────────────┘
```

---

## 3. Database Security

### 3.1 Amazon RDS Configuration

| Attribute | Value |
|-----------|-------|
| **Engine** | PostgreSQL 15.x |
| **Instance Class** | db.t3.micro |
| **Region** | ap-southeast-1 |
| **Endpoint** | sngpl-dashboard-db.cdoqisicsp59.ap-southeast-1.rds.amazonaws.com |
| **Port** | 5432 |
| **Database Name** | sngpl_dashboard |

### 3.2 Database Security Controls

| Control | Implementation |
|---------|----------------|
| **Encryption at Rest** | AWS KMS managed keys |
| **Encryption in Transit** | TLS/SSL enforced |
| **Network Access** | VPC Security Group restricted |
| **Authentication** | Username/password (stored securely) |
| **Backup** | Automated daily backups recommended |

### 3.3 Connection Security

- Database connections use SSL/TLS encryption
- Credentials stored in server environment variables (`.env`)
- Database not publicly accessible (VPC internal only)
- Application connects via private network

---

## 4. Application Security

### 4.1 Web Server Configuration (Nginx)

**Security Headers Implemented:**

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS |
| `X-Frame-Options` | `SAMEORIGIN` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer info |

### 4.2 SSL/TLS Configuration

| Attribute | Value |
|-----------|-------|
| **Certificate Authority** | Let's Encrypt |
| **Certificate Type** | Domain Validated (DV) |
| **Key Size** | 2048-bit RSA |
| **Protocol Support** | TLS 1.2, TLS 1.3 |
| **Auto-Renewal** | Certbot configured |
| **HSTS** | Enabled (1 year) |

### 4.3 Application Stack

| Layer | Technology | Security Measures |
|-------|------------|-------------------|
| Frontend | React + Vite | Static files served via Nginx |
| Backend | FastAPI (Python) | Input validation, CORS configured |
| Database | PostgreSQL | Parameterized queries (SQL injection prevention) |
| Cache | Redis | Localhost only (127.0.0.1) |
| Messaging | MQTT | External broker (broker.emqx.io) |

---

## 5. Intrusion Prevention

### 5.1 Fail2ban Configuration

Fail2ban is active and configured to protect against brute-force attacks.

| Parameter | Value |
|-----------|-------|
| **Status** | Active |
| **SSH Jail** | Enabled |
| **Max Retry** | 5 attempts |
| **Ban Time** | 10 minutes (default) |
| **Find Time** | 10 minutes |

**Active Jails:**
- `sshd` - Protects SSH service from brute-force attempts

### 5.2 Logging and Monitoring

| Log Type | Location | Purpose |
|----------|----------|---------|
| Nginx Access | `/var/log/nginx/access.log` | Web traffic monitoring |
| Nginx Error | `/var/log/nginx/error.log` | Error tracking |
| Application | systemd journal | Backend service logs |
| Authentication | `/var/log/auth.log` | SSH access attempts |
| Firewall | `/var/log/ufw.log` | Blocked connections |

---

## 6. CI/CD Security

### 6.1 Deployment Pipeline

| Component | Configuration |
|-----------|---------------|
| **Platform** | GitHub Actions |
| **Runner** | Self-hosted (on EC2 instance) |
| **Trigger** | Push to `main` branch |
| **Secrets** | Environment variables on server |

### 6.2 Deployment Security Measures

- `.env` file preserved during deployments (not in repository)
- Virtual environment isolated per deployment
- Service restart with systemd (controlled permissions)
- Nginx configuration validated before reload

---

## 7. Security Compliance Checklist

### 7.1 Implemented Controls

| Control | Status | Notes |
|---------|--------|-------|
| Network Segmentation | ✅ Implemented | Security Groups + UFW |
| Encryption in Transit | ✅ Implemented | TLS 1.2/1.3 |
| Encryption at Rest | ✅ Implemented | RDS encryption |
| Access Control | ✅ Implemented | SSH IP restriction |
| Intrusion Prevention | ✅ Implemented | fail2ban active |
| Security Headers | ✅ Implemented | HSTS, X-Frame-Options, etc. |
| Logging | ✅ Implemented | Nginx, systemd, auth logs |
| Firewall | ✅ Implemented | UFW + Security Groups |

### 7.2 Recommendations for Enhancement

| Recommendation | Priority | Status |
|----------------|----------|--------|
| Enable RDS automated backups | High | Recommended |
| Implement CloudWatch monitoring | Medium | Optional |
| Consider AWS WAF | Medium | Optional |
| Move secrets to AWS Secrets Manager | Medium | Optional |
| Implement private MQTT broker | Low | Future consideration |

---

## 8. Access Management

### 8.1 Administrative Access

| Access Type | Method | Controls |
|-------------|--------|----------|
| SSH | Key-based authentication | IP restricted, fail2ban protected |
| AWS Console | IAM credentials | MFA recommended |
| Database | Application only | No direct public access |

### 8.2 Service Accounts

| Service | User | Permissions |
|---------|------|-------------|
| Nginx | www-data | Web server operations |
| Backend | ubuntu | Application execution |
| GitHub Runner | ubuntu | CI/CD deployment |

---

## 9. Incident Response

### 9.1 Security Event Detection

| Event Type | Detection Method |
|------------|------------------|
| Failed SSH attempts | fail2ban + auth.log |
| Web attacks | Nginx error logs |
| Unauthorized access | UFW logging |
| Service failures | systemd journal |

### 9.2 Response Procedures

1. **Detection:** Monitor logs and fail2ban notifications
2. **Analysis:** Review relevant log files
3. **Containment:** Block IP via UFW or Security Group
4. **Eradication:** Apply necessary patches/updates
5. **Recovery:** Restore services if needed
6. **Lessons Learned:** Update security controls

---

## 10. Conclusion

The SNGPL IoT Dashboard infrastructure has been configured with multiple security layers following defense-in-depth principles:

1. **Network Layer:** AWS Security Groups restrict inbound traffic
2. **Host Layer:** UFW firewall provides secondary filtering
3. **Application Layer:** Nginx security headers, HTTPS enforcement
4. **Database Layer:** RDS with encryption and VPC isolation
5. **Monitoring Layer:** fail2ban, logging, and alerting

The current security posture is appropriate for a production IoT monitoring dashboard. The recommended enhancements (RDS backups, CloudWatch monitoring) would further strengthen the security profile.

---

## Document Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Security Reviewer | _________________ | ____/____/2026 | _____________ |
| Infrastructure Lead | _________________ | ____/____/2026 | _____________ |
| Project Manager | _________________ | ____/____/2026 | _____________ |

---

**Document Control:**
- Review Frequency: Quarterly
- Next Review: April 2026
- Classification: Internal Use Only

---

*This document was prepared for security architecture review purposes. All configurations should be validated against current AWS best practices.*
