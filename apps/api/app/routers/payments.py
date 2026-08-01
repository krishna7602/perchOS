from fastapi import APIRouter, Request, HTTPException, Header
from app.domains.orders.models import Payment, Order
from app.services.payments.razorpay_gateway import RazorpayGateway

router = APIRouter(prefix="/webhooks", tags=["payments"])
gateway = RazorpayGateway()


@router.post("/razorpay")
async def razorpay_webhook(request: Request, x_razorpay_signature: str = Header(...)):
    body = await request.body()
    try:
        import json
        payload = json.loads(body)
    except:
        return {"ok": True}

    event = payload.get("event")
    
    if not event or "payload" not in payload or "payment" not in payload["payload"]:
        return {"ok": True} # Ignore non-payment events
        
    rp_payment = payload["payload"]["payment"]["entity"]
    rp_order_id = rp_payment.get("order_id")
    
    if not rp_order_id:
        return {"ok": True}

    payment = await Payment.find_one(Payment.provider_order_id == rp_order_id)
    if not payment:
        return {"ok": True}

    order = await Order.get(payment.order_id)
    if not order:
        return {"ok": True}

    from app.domains.venues.restaurant_model import Restaurant
    restaurant = await Restaurant.get(order.restaurant_id)
    webhook_secret = restaurant.razorpay_webhook_secret if restaurant else None

    if not webhook_secret or not gateway.verify_webhook_signature(body, x_razorpay_signature, webhook_secret):
        raise HTTPException(status_code=400, detail="invalid_signature")
    


    payment.status = "paid" if event == "payment.captured" else "failed"
    payment.provider_payment_id = rp_payment.get("id")
    await payment.save()

    already_paid = (order.payment_status == "paid")
    order.payment_status = payment.status
    if payment.status == "paid":
        order.order_status = "received"  # kitchen can start
    await order.save()

    if payment.status == "paid" and not already_paid:
        from app.domains.orders.router import dispatch_paid_order
        import asyncio
        asyncio.create_task(dispatch_paid_order(order))

    return {"ok": True}
