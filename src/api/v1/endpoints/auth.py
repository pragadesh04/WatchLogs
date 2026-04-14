from fastapi import APIRouter, Depends, HTTPException
from services.auth import Auth
from models.schemas import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
    RefreshTokenRequest,
)
from core.security import get_current_user

router = APIRouter(prefix="/auth", tags=["Authorization"])


def auth_service():
    return Auth()


@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest, service: Auth = Depends(auth_service)):
    result = await service.register(request.email, request.password)

    if result.get("status") == "failed":
        raise HTTPException(status_code=400, detail=result.get("message"))

    return {
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"],
        "token_type": "bearer",
    }


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, service: Auth = Depends(auth_service)):
    result = await service.login(request.email, request.password)

    if result.get("status") == "failed":
        raise HTTPException(status_code=401, detail=result.get("message"))

    return {
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"],
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest, service: Auth = Depends(auth_service)
):
    result = await service.refresh_access_token(request.refresh_token)

    if result.get("status") == "failed":
        raise HTTPException(status_code=401, detail=result.get("message"))

    return {
        "access_token": result["access_token"],
        "refresh_token": request.refresh_token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "created_at": current_user["created_at"],
    }


@router.post("/logout")
async def logout(
    current_user: dict = Depends(get_current_user),
    service: Auth = Depends(auth_service),
):
    result = await service.logout(current_user["id"])
    return result
