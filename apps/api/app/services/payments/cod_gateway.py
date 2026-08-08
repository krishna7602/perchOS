from .base import PaymentGateway


class CODGateway(PaymentGateway):
    """Cash on Delivery gateway — no external processing, marks order as pending cash."""

    async def charge(self, order_id: str, amount: float, *args, **kwargs) -> dict:
        return {"status": "pending_cash", "reference": None}
