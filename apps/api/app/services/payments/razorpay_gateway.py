import razorpay
import hmac
import hashlib
from app.core.config import settings
from .base import PaymentGateway


class RazorpayGateway(PaymentGateway):
    async def charge(self, order_id: str, amount: float, key_id: str | None = None, key_secret: str | None = None) -> dict:
        if not key_id or not key_secret:
            # Fallback for dev if keys are not set
            return {"status": "pending", "reference": "mock_razorpay_order_id"}

        client = razorpay.Client(auth=(key_id, key_secret))

        # amount in paise, Razorpay's smallest unit
        rp_payload = {
            "amount": int(amount * 100),
            "currency": "INR",
            "receipt": order_id,
            "notes": {"perch_order_id": order_id},
        }

        rp_order = client.order.create(rp_payload)
        # status stays "pending" until the webhook confirms
        return {"status": "pending", "reference": rp_order["id"]}

    def verify_webhook_signature(self, body: bytes, signature: str, webhook_secret: str) -> bool:
        expected = hmac.new(
            webhook_secret.encode(), body, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
        
    def verify_payment_signature(self, order_id: str, payment_id: str, signature: str, key_secret: str) -> bool:
        message = f"{order_id}|{payment_id}"
        expected = hmac.new(
            key_secret.encode(), message.encode(), hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
