from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from deps import get_db
from models import NicknameRequest
from services.auth import verify_clerk_token
from services.license import normalize_b64
import services.users as users_svc

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def get_me(
    claims: dict = Depends(verify_clerk_token),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user = await users_svc.get_or_create(db, claims)
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
    await users_svc.get_or_create(db, claims)

    # Optional license — strip whitespace (pasted keys often wrap) and validate
    # before touching the nickname so a bad upload doesn't half-apply the update.
    license_b64 = None
    if body.license_b64 is not None:
        try:
            license_b64 = normalize_b64(body.license_b64)
        except ValueError:
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


@router.delete("/me/license")
async def delete_license(
    claims: dict = Depends(verify_clerk_token),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await db.users.update_one(
        {"clerk_user_id": claims["sub"]},
        {"$unset": {"license_b64": ""}},
    )
    return {"has_license": False}
