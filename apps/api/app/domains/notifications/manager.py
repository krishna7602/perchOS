import json
import asyncio
from pywebpush import webpush, WebPushException
from app.core.config import settings
from app.domains.notifications.models import PushSubscription

class NotificationManager:
    async def send_push_to_user(self, handle: str, payload: dict):
        if not handle:
            return
        subscriptions = await PushSubscription.find(PushSubscription.user_handle == handle).to_list()
        for sub in subscriptions:
            await self._send_push(sub, payload)

    async def send_push_to_branch_role(self, branch_id: str, role: str, payload: dict):
        if not branch_id or not role:
            return
        subscriptions = await PushSubscription.find(
            PushSubscription.branch_id == branch_id,
            PushSubscription.role == role
        ).to_list()
        for sub in subscriptions:
            await self._send_push(sub, payload)

    async def _send_push(self, subscription: PushSubscription, payload: dict):
        try:
            sub_info = {
                "endpoint": subscription.endpoint,
                "keys": subscription.keys
            }
            if not settings.VAPID_PRIVATE_KEY:
                return

            def _do_webpush():
                webpush(
                    subscription_info=sub_info,
                    data=json.dumps(payload),
                    vapid_private_key=settings.VAPID_PRIVATE_KEY,
                    vapid_claims={
                        "sub": settings.VAPID_CLAIM_EMAIL or "mailto:admin@perch.com"
                    }
                )

            await asyncio.to_thread(_do_webpush)
        except WebPushException as ex:
            if hasattr(ex, "response") and ex.response and getattr(ex.response, "status_code", None) in [404, 410]:
                # Subscription has expired or is no longer valid
                try:
                    await subscription.delete()
                except Exception:
                    pass
            else:
                print(f"Web Push Error: {ex}")
        except Exception as ex:
            print(f"Web Push Unexpected Error: {ex}")

notification_manager = NotificationManager()

