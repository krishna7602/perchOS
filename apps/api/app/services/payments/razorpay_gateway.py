from .base import PaymentGateway


class RazorpayGateway(PaymentGateway):
    """Razorpay payment gateway — NOT IMPLEMENTED.

    Wire in real Razorpay keys and the razorpay SDK here when you're ready
    to take real payments. Keeping this stub in the codebase now means the
    order flow never needs to change, only this file.
    """

    async def charge(self, order_id: str, amount: float) -> dict:
        raise NotImplementedError(
            "Razorpay integration pending — needs real API keys"
        )
