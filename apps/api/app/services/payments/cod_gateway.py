from .base import PaymentGateway


class CODGateway(PaymentGateway):
    """Cash on Delivery gateway — no processing, marks order as pending cash."""

    async def charge(self, order_id: str, amount: float, linked_account_id: str | None = None) -> dict:
        return {"status": "pending_cash", "reference": None}
