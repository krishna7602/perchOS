from app.core.config import settings
from .razorpay_gateway import RazorpayGateway
from .cod_gateway import CODGateway
from .dummy_gateway import DummyGateway


def get_available_gateways() -> dict:
    """Returns available payment gateway instances based on current environment."""
    gateways = {
        "razorpay": RazorpayGateway(),
        "cod": CODGateway(),
    }
    if settings.ENVIRONMENT == "development":
        gateways["dummy_card"] = DummyGateway()
    return gateways


def get_payment_methods_info() -> list[dict]:
    """Returns payment method UI metadata for enabled gateways."""
    methods = [
        {
            "id": "razorpay",
            "label": "Pay via UPI / Card",
            "description": "Secure payment via Razorpay (UPI, Cards, Wallets)",
        },
        {
            "id": "cod",
            "label": "Cash on Delivery",
            "description": "Pay when you receive your order",
        },
    ]
    if settings.ENVIRONMENT == "development":
        methods.append({
            "id": "dummy_card",
            "label": "Test Card Payment",
            "description": "Simulated card payment (demo)",
        })
    return methods
