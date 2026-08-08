import asyncio
import uuid

from .base import PaymentGateway


class DummyGateway(PaymentGateway):
    """Simulated payment gateway — always succeeds after a fake delay.

    For development and testing only.
    """

    async def charge(self, order_id: str, amount: float, *args, **kwargs) -> dict:
        await asyncio.sleep(1.2)  # simulate network latency for realistic loading state
        return {
            "status": "paid",
            "reference": f"DUMMY-{uuid.uuid4().hex[:8].upper()}",
        }
