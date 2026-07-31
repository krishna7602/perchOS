import json
from pywebpush import webpush, WebPushException
from app.core.config import settings
from app.domains.notifications.models import PushSubscription

class NotificationManager:
    async def send_push_to_user(self, handle: str, payload: dict):
        subscriptions = await PushSubscription.find(PushSubscription.user_handle == handle).to_list()
        for sub in subscriptions:
            await self._send_push(sub, payload)

    async def send_push_to_branch_role(self, branch_id: str, role: str, payload: dict):
        # We need to find users who belong to this branch with the given role.
        # But our subscriptions only store user_handle and branch_id.
        # Ideally, we broadcast to everyone in the branch for now, or we look up branch users.
        # For simplicity, if we subscribe tied to branch_id, we can just push to all subscriptions for this branch.
        # A more advanced version would check the role from the Admin model.
        subscriptions = await PushSubscription.find(PushSubscription.branch_id == branch_id).to_list()
        for sub in subscriptions:
            await self._send_push(sub, payload)

    async def _send_push(self, subscription: PushSubscription, payload: dict):
        try:
            sub_info = {
                "endpoint": subscription.endpoint,
                "keys": subscription.keys
            }
            webpush(
                subscription_info=sub_info,
                data=json.dumps(payload),
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={
                    "sub": settings.VAPID_CLAIM_EMAIL
                }
            )
        except WebPushException as ex:
            if ex.response and ex.response.status_code in [404, 410]:
                # Subscription has expired or is no longer valid
                await subscription.delete()
            else:
                print(f"Web Push Error: {ex}")

notification_manager = NotificationManager()
