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
        await users_svc.upsert(db, clerk_user_id=user_id, display_name="", email="")
        user = {"clerk_user_id": user_id, "display_name": "", "email": "", "nickname": None}
    return user


@router.patch("/me/nickname")
async def set_nickname(
    body: NicknameRequest,
    claims: dict = Depends(verify_clerk_token),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user_id = claims["sub"]
    await users_svc.set_nickname(db, user_id, body.nickname)
    user = await users_svc.get_by_clerk_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
