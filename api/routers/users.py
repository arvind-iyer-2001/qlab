import base64

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from deps import get_db
from models import NicknameRequest
from services.auth import verify_clerk_token
import services.users as users_svc

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def get_me(
    claims: dict = Depends(verify_clerk_token),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user_id = claims["sub"]
    user = await users_svc.get_by_clerk_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/me/stats")
async def get_my_stats(
    claims: dict = Depends(verify_clerk_token),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await users_svc.get_stats(db, claims["sub"])


@router.patch("/me/nickname")
async def set_nickname(
    body: NicknameRequest,
    claims: dict = Depends(verify_clerk_token),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user_id = claims["sub"]
    user = await users_svc.get_by_clerk_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Optional license — strip whitespace (pasted keys often wrap) and validate
    # before touching the nickname so a bad upload doesn't half-apply the update.
    license_b64 = None
    if body.license_b64 is not None:
        license_b64 = "".join(body.license_b64.split())
        try:
            base64.b64decode(license_b64, validate=True)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 license")

    try:
        await users_svc.set_nickname(db, user_id, body.nickname)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    if license_b64 is not None:
        await db.users.update_one(
            {"clerk_user_id": user_id},
            {"$set": {"license_b64": license_b64}},
        )

    updated = await users_svc.get_by_clerk_id(db, user_id)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated


@router.get("/me/license")
async def get_license_status(
    claims: dict = Depends(verify_clerk_token),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user = await users_svc.get_by_clerk_id(db, claims["sub"])
    return {"has_license": bool(user and user.get("license_b64"))}
