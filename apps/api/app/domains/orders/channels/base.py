from abc import ABC, abstractmethod
from typing import Any
from app.domains.orders.models import Order


class OrderChannel(ABC):
    """Abstract base class for all order channels (Perch, Zomato, Swiggy, etc.)."""

    @abstractmethod
    async def accept_order(self, order: Order, prep_time_mins: int = 15) -> bool:
        """Called when a chef accepts an order."""
        pass

    @abstractmethod
    async def reject_order(self, order: Order, reason: str = "Restaurant Busy") -> bool:
        """Called when a chef/restaurant rejects an order."""
        pass

    @abstractmethod
    async def mark_ready(self, order: Order) -> bool:
        """Called when the food is prepared and ready for pickup/delivery."""
        pass

    @abstractmethod
    async def mark_dispatched(self, order: Order) -> bool:
        """Called when the order is handed to waiter or delivery partner."""
        pass

    @abstractmethod
    async def update_item_stock(
        self, branch_id: str, item_id: str, is_available: bool
    ) -> bool:
        """Syncs stock/out-of-stock state to the channel platform."""
        pass
