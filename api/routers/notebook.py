from fastapi import APIRouter
from pydantic import BaseModel

from services.notebook import execute_cell, reset_notebook

router = APIRouter(prefix="/notebook", tags=["notebook"])


class ExecuteRequest(BaseModel):
    code: str


@router.post("/execute")
async def execute(req: ExecuteRequest):
    return await execute_cell(req.code)


@router.post("/reset")
async def reset():
    return await reset_notebook()
