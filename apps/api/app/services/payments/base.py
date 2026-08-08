from abc import ABC, abstractmethod


class PaymentGateway(ABC):
    """Abstract base for payment gateways.

    Implement `charge()` for each payment method.
    """

    @abstractmethod
    async def charge(self, order_id: str, amount: float, *args, **kwargs) -> dict:
        """Process a payment.

        Returns:
            {"status": "paid"|"failed"|"pending_cash", "reference": str|None}
        """
