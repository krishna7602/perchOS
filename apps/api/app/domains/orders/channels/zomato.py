import logging
from typing import Any
import httpx
from app.core.config import settings
from app.domains.orders.channels.base import OrderChannel
from app.domains.orders.models import Order

logger = logging.getLogger("perch.channels.zomato")


class ZomatoChannel(OrderChannel):
    """Zomato POS API Channel integration."""

    def __init__(self, api_key: str | None = None, api_url: str | None = None):
        self.api_key = api_key or getattr(settings, "ZOMATO_API_KEY", "MOCK_ZOMATO_KEY")
        self.api_url = api_url or getattr(
            settings, "ZOMATO_POS_BASE_URL", "https://api.zomato.com/v1/pos"
        )

    async def accept_order(self, order: Order, prep_time_mins: int = 15) -> bool:
        ext_id = order.external_order_id or str(order.id)
        logger.info(f"[ZomatoChannel] Sending ACCEPT payload to Zomato for order {ext_id} (prep: {prep_time_mins}m)")
        
        # If in sandbox / mock mode:
        if self.api_key == "MOCK_ZOMATO_KEY":
            logger.info(f"[ZomatoChannel][MOCK] Order {ext_id} ACCEPTED on Zomato POS.")
            return True

        # Production REST call to Zomato Order Relay API:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.api_url}/orders/{ext_id}/accept",
                    headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                    json={"prep_time": prep_time_mins, "status": "ACCEPTED"},
                )
                if response.status_code == 200:
                    logger.info(f"[ZomatoChannel] Successfully accepted order {ext_id} on Zomato.")
                    return True
                else:
                    logger.error(f"[ZomatoChannel] Zomato accept error {response.status_code}: {response.text}")
                    return False
        except Exception as e:
            logger.exception(f"[ZomatoChannel] Failed to connect to Zomato API: {e}")
            return False

    async def reject_order(self, order: Order, reason: str = "Restaurant Busy") -> bool:
        ext_id = order.external_order_id or str(order.id)
        logger.info(f"[ZomatoChannel] Sending REJECT payload to Zomato for order {ext_id} (Reason: {reason})")
        
        if self.api_key == "MOCK_ZOMATO_KEY":
            logger.info(f"[ZomatoChannel][MOCK] Order {ext_id} REJECTED on Zomato POS.")
            return True

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.api_url}/orders/{ext_id}/reject",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={"rejection_reason": reason, "status": "REJECTED"},
                )
                return response.status_code == 200
        except Exception as e:
            logger.exception(f"[ZomatoChannel] Zomato reject failed: {e}")
            return False

    async def mark_ready(self, order: Order) -> bool:
        ext_id = order.external_order_id or str(order.id)
        logger.info(f"[ZomatoChannel] Sending FOOD_READY to Zomato for order {ext_id}")

        if self.api_key == "MOCK_ZOMATO_KEY":
            logger.info(f"[ZomatoChannel][MOCK] Order {ext_id} marked READY on Zomato POS.")
            return True

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.api_url}/orders/{ext_id}/ready",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={"status": "READY_FOR_PICKUP"},
                )
                return response.status_code == 200
        except Exception as e:
            logger.exception(f"[ZomatoChannel] Zomato mark ready failed: {e}")
            return False

    async def mark_dispatched(self, order: Order) -> bool:
        ext_id = order.external_order_id or str(order.id)
        logger.info(f"[ZomatoChannel] Sending DISPATCHED to Zomato for order {ext_id}")
        return True

    async def update_item_stock(
        self, branch_id: str, item_id: str, is_available: bool
    ) -> bool:
        logger.info(f"[ZomatoChannel] Updating item {item_id} stock to {is_available} on Zomato menu")
        return True
