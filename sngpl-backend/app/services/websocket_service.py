"""WebSocket Service for real-time updates"""

from fastapi import WebSocket
from typing import List, Optional, Set
import json


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        # Per-connection allowed regions (normalized). None => unrestricted.
        self.connection_regions: dict[WebSocket, Optional[Set[str]]] = {}

    async def connect(self, websocket: WebSocket, regions: Optional[Set[str]] = None):
        """Connect new WebSocket client. `regions` None => sees all; else only those regions."""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_regions[websocket] = regions

    def disconnect(self, websocket: WebSocket):
        """Disconnect WebSocket client"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        self.connection_regions.pop(websocket, None)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send message to specific client"""
        await websocket.send_text(message)

    async def broadcast(self, message: dict, region: Optional[str] = None):
        """Broadcast a message, delivering only to clients allowed to see `region`.

        A connection receives the message when it is unrestricted (regions None) or when the
        message's normalized region is in its allowed set. Restricted clients never receive
        messages whose region is unknown."""
        norm = region.strip().lower() if region else None
        for connection in list(self.active_connections):
            allowed = self.connection_regions.get(connection)
            if allowed is not None and (norm is None or norm not in allowed):
                continue
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to client: {e}")


# Create global instance
manager = ConnectionManager()
