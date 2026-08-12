import logging
from app.domains.orders.channels.base import OrderChannel
from app.domains.orders.models import Order

logger = logging.getLogger("perch.channels.perch")


class PerchChannel(OrderChannel):
    """Native Perch dine-in channel implementation."""

    async def accept_order(self, order: Order, prep_time_mins: int = 15) -> bool:
        logger.info(f"[PerchChannel] Order {order.id} ({order.order_token}) accepted by chef.")
        return True

    async def reject_order(self, order: Order, reason: str = "Restaurant Busy") -> bool:
        logger.info(f"[PerchChannel] Order {order.id} rejected: {reason}")
        return True

    async def mark_ready(self, order: Order) -> bool:
        logger.info(f"[PerchChannel] Order {order.id} marked ready for pickup.")
        return True

    async def mark_dispatched(self, order: Order) -> bool:
        logger.info(f"[PerchChannel] Order {order.id} dispatched.")
        return True

    async def update_item_stock(
        self, branch_id: str, item_id: str, is_available: bool
    ) -> bool:
        logger.info(f"[PerchChannel] Item {item_id} stock updated to {is_available} for branch {branch_id}")
        return True
