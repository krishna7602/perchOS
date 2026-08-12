import logging
import httpx
from app.core.config import settings
from app.domains.orders.channels.base import OrderChannel
from app.domains.orders.models import Order

logger = logging.getLogger("perch.channels.swiggy")


class SwiggyChannel(OrderChannel):
    """Swiggy POS Integration Channel."""

    def __init__(self, api_key: str | None = None, api_url: str | None = None):
        self.api_key = api_key or getattr(settings, "SWIGGY_API_KEY", "MOCK_SWIGGY_KEY")
        self.api_url = api_url or getattr(
            settings, "SWIGGY_POS_BASE_URL", "https://partner.swiggy.com/v1/pos"
        )

    async def accept_order(self, order: Order, prep_time_mins: int = 15) -> bool:
        ext_id = order.external_order_id or str(order.id)
        logger.info(f"[SwiggyChannel] Sending ACCEPT payload to Swiggy for order {ext_id} (prep: {prep_time_mins}m)")

        if self.api_key == "MOCK_SWIGGY_KEY":
            logger.info(f"[SwiggyChannel][MOCK] Order {ext_id} ACCEPTED on Swiggy partner portal.")
            return True

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.api_url}/orders/{ext_id}/status",
                    headers={"X-Swiggy-Auth": self.api_key},
                    json={"status": "CONFIRMED", "prep_time": prep_time_mins},
                )
                return response.status_code == 200
        except Exception as e:
            logger.exception(f"[SwiggyChannel] Swiggy accept failed: {e}")
            return False

    async def reject_order(self, order: Order, reason: str = "Restaurant Busy") -> bool:
        ext_id = order.external_order_id or str(order.id)
        logger.info(f"[SwiggyChannel] Sending CANCEL payload to Swiggy for order {ext_id}")

        if self.api_key == "MOCK_SWIGGY_KEY":
            logger.info(f"[SwiggyChannel][MOCK] Order {ext_id} REJECTED on Swiggy POS.")
            return True

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.api_url}/orders/{ext_id}/status",
                    headers={"X-Swiggy-Auth": self.api_key},
                    json={"status": "CANCELLED", "reason": reason},
                )
                return response.status_code == 200
        except Exception as e:
            logger.exception(f"[SwiggyChannel] Swiggy reject failed: {e}")
            return False

    async def mark_ready(self, order: Order) -> bool:
        ext_id = order.external_order_id or str(order.id)
        logger.info(f"[SwiggyChannel] Sending FOOD_READY to Swiggy for order {ext_id}")

        if self.api_key == "MOCK_SWIGGY_KEY":
            logger.info(f"[SwiggyChannel][MOCK] Order {ext_id} marked READY on Swiggy POS.")
            return True

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.api_url}/orders/{ext_id}/status",
                    headers={"X-Swiggy-Auth": self.api_key},
                    json={"status": "FOOD_READY"},
                )
                return response.status_code == 200
        except Exception as e:
            logger.exception(f"[SwiggyChannel] Swiggy mark ready failed: {e}")
            return False

    async def mark_dispatched(self, order: Order) -> bool:
        ext_id = order.external_order_id or str(order.id)
        logger.info(f"[SwiggyChannel] Marking DISPATCHED on Swiggy for order {ext_id}")
        return True

    async def update_item_stock(
        self, branch_id: str, item_id: str, is_available: bool
    ) -> bool:
        logger.info(f"[SwiggyChannel] Updating item {item_id} stock to {is_available} on Swiggy menu")
        return True
