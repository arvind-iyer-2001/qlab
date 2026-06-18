from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from deps import get_db
from models import ExecuteRequest, ExecuteResponse
from services.auth import verify_clerk_token
from services.runner import run_code
import services.users as users_svc

router = APIRouter(tags=["execute"])


@router.post("/execute", response_model=ExecuteResponse)
async def execute(
    body: ExecuteRequest,
    claims: dict = Depends(verify_clerk_token),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user = await users_svc.get_by_clerk_id(db, claims["sub"])
    license_b64 = user.get("license_b64") if user else None
    result = await run_code(body.code, license_b64=license_b64)
    return ExecuteResponse(**result)
