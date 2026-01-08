"""Email notification service for critical alarms"""

import os
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from datetime import datetime
from jinja2 import Template

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.models import Alarm, Device

logger = get_logger(__name__)


class EmailService:
    """Service for sending email notifications"""

    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@sngpl.com")
        self.enabled = bool(self.smtp_user and self.smtp_password)

        if not self.enabled:
            logger.warning("Email service disabled - SMTP credentials not configured")
        else:
            logger.info(f"Email service enabled - {self.smtp_host}:{self.smtp_port}")

    async def send_email(
        self,
        to_emails: List[str],
        subject: str,
        html_body: str,
        text_body: Optional[str] = None
    ) -> bool:
        """Send email to recipients"""
        if not self.enabled:
            logger.warning("Email service is disabled - skipping email")
            return False

        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.from_email
            message["To"] = ", ".join(to_emails)

            # Add text and HTML parts
            if text_body:
                text_part = MIMEText(text_body, "plain")
                message.attach(text_part)

            html_part = MIMEText(html_body, "html")
            message.attach(html_part)

            # Send email
            async with aiosmtplib.SMTP(
                hostname=self.smtp_host,
                port=self.smtp_port,
                use_tls=False
            ) as smtp:
                await smtp.starttls()
                await smtp.login(self.smtp_user, self.smtp_password)
                await smtp.send_message(message)

            logger.info(f"Email sent successfully to {to_emails}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email: {e}", exc_info=True)
            return False

    async def send_alarm_notification(
        self,
        alarm: Alarm,
        device: Device,
        recipients: List[str]
    ) -> bool:
        """Send alarm notification email"""
        if not recipients:
            logger.warning("No recipients specified for alarm notification")
            return False

        # Determine severity styling
        severity_colors = {
            "high": "#dc2626",
            "medium": "#f59e0b",
            "low": "#3b82f6"
        }
        severity_color = severity_colors.get(alarm.severity, "#6b7280")

        # Create email content
        subject = f"🚨 SNGPL IoT Alert: {alarm.severity.upper()} Priority - {device.device_name}"

        html_template = Template("""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .alert-badge {
            display: inline-block;
            padding: 8px 16px;
            background: {{ severity_color }};
            color: white;
            border-radius: 20px;
            font-weight: bold;
            margin-top: 10px;
            font-size: 14px;
            text-transform: uppercase;
        }
        .content {
            background: #f9fafb;
            padding: 30px;
            border: 1px solid #e5e7eb;
        }
        .info-row {
            display: flex;
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .info-label {
            font-weight: 600;
            width: 150px;
            color: #4b5563;
        }
        .info-value {
            flex: 1;
            color: #1f2937;
        }
        .metric-box {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid {{ severity_color }};
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .footer {
            background: #1f2937;
            color: #9ca3af;
            padding: 20px;
            text-align: center;
            border-radius: 0 0 8px 8px;
            font-size: 12px;
        }
        .footer a {
            color: #60a5fa;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚠️ SNGPL IoT Platform Alert</h1>
        <div class="alert-badge">{{ severity }} Priority</div>
    </div>

    <div class="content">
        <h2 style="color: #1f2937; margin-top: 0;">Alarm Details</h2>

        <div class="info-row">
            <div class="info-label">Device:</div>
            <div class="info-value">{{ device_name }} ({{ client_id }})</div>
        </div>

        <div class="info-row">
            <div class="info-label">Location:</div>
            <div class="info-value">{{ location }}</div>
        </div>

        <div class="info-row">
            <div class="info-label">Device Type:</div>
            <div class="info-value">{{ device_type }}</div>
        </div>

        <div class="metric-box">
            <h3 style="margin-top: 0; color: {{ severity_color }};">⚡ Threshold Violation</h3>
            <div class="info-row" style="border: none;">
                <div class="info-label">Parameter:</div>
                <div class="info-value">{{ parameter }}</div>
            </div>
            <div class="info-row" style="border: none;">
                <div class="info-label">Current Value:</div>
                <div class="info-value"><strong>{{ value }}</strong></div>
            </div>
            <div class="info-row" style="border: none;">
                <div class="info-label">Threshold Type:</div>
                <div class="info-value">{{ threshold_type }}</div>
            </div>
        </div>

        <div class="info-row">
            <div class="info-label">Timestamp:</div>
            <div class="info-value">{{ timestamp }}</div>
        </div>

        <div style="margin-top: 30px; padding: 15px; background: #fef3c7; border-radius: 4px; border-left: 4px solid #f59e0b;">
            <strong>⚠️ Action Required:</strong> Please investigate this alarm and take appropriate action.
        </div>
    </div>

    <div class="footer">
        <p>SNGPL IoT Monitoring Platform - Automated Alert System</p>
        <p>Generated on {{ current_time }}</p>
        <p style="margin-top: 10px;">
            <a href="http://localhost:3000/dashboard">View Dashboard</a> |
            <a href="http://localhost:3000/alarms">Manage Alarms</a>
        </p>
    </div>
</body>
</html>
        """)

        html_body = html_template.render(
            severity=alarm.severity.upper(),
            severity_color=severity_color,
            device_name=device.device_name,
            client_id=alarm.client_id,
            location=device.location or "Unknown",
            device_type=device.device_type or "N/A",
            parameter=alarm.parameter,
            value=f"{alarm.value:.2f}",
            threshold_type=alarm.threshold_type.upper(),
            timestamp=alarm.triggered_at.strftime("%Y-%m-%d %H:%M:%S") if alarm.triggered_at else "N/A",
            current_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )

        # Plain text version
        text_body = f"""
SNGPL IoT Platform - Critical Alarm Notification

Severity: {alarm.severity.upper()}
Device: {device.device_name} ({alarm.client_id})
Location: {device.location or 'Unknown'}
Parameter: {alarm.parameter}
Current Value: {alarm.value:.2f}
Threshold Type: {alarm.threshold_type.upper()}
Timestamp: {alarm.triggered_at.strftime("%Y-%m-%d %H:%M:%S") if alarm.triggered_at else "N/A"}

ACTION REQUIRED: Please investigate this alarm and take appropriate action.

---
SNGPL IoT Monitoring Platform
Generated on {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
        """

        return await self.send_email(recipients, subject, html_body, text_body)

    async def send_daily_summary(
        self,
        recipients: List[str],
        total_devices: int,
        active_devices: int,
        total_alarms: int,
        critical_alarms: int
    ) -> bool:
        """Send daily summary email"""
        subject = f"SNGPL IoT Daily Summary - {datetime.now().strftime('%Y-%m-%d')}"

        html_template = Template("""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: #1e40af;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
        }
        .stat-box {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #1e40af;
        }
        .stat-label {
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Daily Summary Report</h1>
            <p>{{ date }}</p>
        </div>
        <div class="stats">
            <div class="stat-box">
                <div class="stat-value">{{ total_devices }}</div>
                <div class="stat-label">Total Devices</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">{{ active_devices }}</div>
                <div class="stat-label">Active Devices</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">{{ total_alarms }}</div>
                <div class="stat-label">Total Alarms</div>
            </div>
            <div class="stat-box">
                <div class="stat-value" style="color: #dc2626;">{{ critical_alarms }}</div>
                <div class="stat-label">Critical Alarms</div>
            </div>
        </div>
    </div>
</body>
</html>
        """)

        html_body = html_template.render(
            date=datetime.now().strftime("%Y-%m-%d"),
            total_devices=total_devices,
            active_devices=active_devices,
            total_alarms=total_alarms,
            critical_alarms=critical_alarms
        )

        return await self.send_email(recipients, subject, html_body)


# Global instance
email_service = EmailService()
