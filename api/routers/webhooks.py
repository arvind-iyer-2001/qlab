import os
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from svix.webhooks import Webhook, WebhookVerificationError

from deps import get_db
import services.users as users_svc

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
logger = logging.getLogger(__name__)


@router.post("/clerk")
async def clerk_webhook(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    secret = os.getenv("CLERK_WEBHOOK_SECRET", "")
    if not secret:
        raise HTTPException(status_code=500, detail="CLERK_WEBHOOK_SECRET not configured")

    body = await request.body()
    headers = {
        "svix-id": request.headers.get("svix-id", ""),
        "svix-timestamp": request.headers.get("svix-timestamp", ""),
        "svix-signature": request.headers.get("svix-signature", ""),
    }

    try:
        wh = Webhook(secret)
        payload = wh.verify(body, headers)
    except WebhookVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = payload.get("type")
    data = payload.get("data", {})

    if event_type in ("user.created", "user.updated"):
        clerk_user_id = data.get("id", "")
        primary_email_id = data.get("primary_email_address_id")
        email = ""
        for addr in data.get("email_addresses", []):
            if addr.get("id") == primary_email_id:
                email = addr.get("email_address", "")
                break

        first = data.get("first_name") or ""
        last = data.get("last_name") or ""
        display_name = f"{first} {last}".strip() or clerk_user_id
        avatar_url = data.get("image_url") or data.get("profile_image_url")
        username = data.get("username")

        try:
            await users_svc.upsert(
                db,
                clerk_user_id=clerk_user_id,
                display_name=display_name,
                email=email,
                avatar_url=avatar_url,
                username=username,
            )
            logger.info("Upserted user %s via %s", clerk_user_id, event_type)
        except Exception as exc:
            logger.error("Failed to upsert user %s: %s", clerk_user_id, exc)
            raise
    else:
        logger.debug("Ignoring unhandled Clerk event type: %s", event_type)

    return {"status": "ok"}
