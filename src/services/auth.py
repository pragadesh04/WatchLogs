import re
import jwt
import secrets
import logging
from datetime import datetime, timedelta
from bson import ObjectId
from passlib.context import CryptContext

from core import config
from db.database import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class Auth:
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_password_hash(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def validate_password(password: str) -> tuple[bool, str]:
        if len(password) < 8:
            return False, "Password must be at least 8 characters long"
        if not re.search(r"[A-Za-z]", password):
            return False, "Password must contain at least one letter"
        if not re.search(r"\d", password):
            return False, "Password must contain at least one number"
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", password):
            return False, "Password must contain at least one symbol"
        return True, ""

    @staticmethod
    def create_access_token(data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(hours=config.ACCESS_TOKEN_EXPIRE_HOURS)
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(
            to_encode, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM
        )
        return encoded_jwt

    @staticmethod
    def create_refresh_token(data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=config.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(
            to_encode, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM
        )
        return encoded_jwt

    @staticmethod
    def decode_token(token: str) -> dict:
        try:
            payload = jwt.decode(
                token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM]
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise ValueError("Token has expired")
        except jwt.InvalidTokenError:
            raise ValueError("Invalid token")

    async def register(self, email: str, password: str) -> dict:
        email = email.lower().strip()

        existing_user = db.users.find_one({"email": email})
        if existing_user:
            return {"status": "failed", "message": "Email already registered"}

        is_valid, error_message = self.validate_password(password)
        logger.info(password)
        if not is_valid:
            return {"status": "failed", "message": error_message}

        try:
            password_hash = self.get_password_hash(password)
            user_doc = {
                "email": email,
                "password_hash": password_hash,
                "created_at": datetime.utcnow(),
            }
            result = db.users.insert_one(user_doc)
            user_id = result.inserted_id

            access_token = self.create_access_token(
                {"sub": str(user_id), "email": email}
            )
            refresh_token = self.create_refresh_token(
                {"sub": str(user_id), "email": email}
            )

            self._save_refresh_token(user_id, refresh_token)

            return {
                "status": "success",
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": {
                    "id": str(user_id),
                    "email": email,
                    "created_at": datetime.utcnow(),
                },
            }
        except Exception as e:
            logger.error(f"Registration error: {e}")
            return {"status": "failed", "message": f"Registration failed"}

    async def login(self, email: str, password: str) -> dict:
        email = email.lower().strip()

        user = db.users.find_one({"email": email})
        if not user:
            return {"status": "failed", "message": "Invalid email or password"}

        if not self.verify_password(password, user["password_hash"]):
            return {"status": "failed", "message": "Invalid email or password"}

        user_id = user["_id"]
        access_token = self.create_access_token({"sub": str(user_id), "email": email})
        refresh_token = self.create_refresh_token({"sub": str(user_id), "email": email})

        self._save_refresh_token(user_id, refresh_token)

        return {
            "status": "success",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": str(user_id),
                "email": user["email"],
                "created_at": user["created_at"],
            },
        }

    def _save_refresh_token(self, user_id: ObjectId, token: str):
        expires_at = datetime.utcnow() + timedelta(
            days=config.REFRESH_TOKEN_EXPIRE_DAYS
        )
        db.refresh_tokens.delete_many({"user_id": user_id})
        db.refresh_tokens.insert_one(
            {"user_id": user_id, "token": token, "expires_at": expires_at}
        )

    async def refresh_access_token(self, refresh_token: str) -> dict:
        try:
            payload = self.decode_token(refresh_token)
            if payload.get("type") != "refresh":
                return {"status": "failed", "message": "Invalid token type"}

            user_id = payload.get("sub")
            if not user_id:
                return {"status": "failed", "message": "Invalid token"}

            stored_token = db.refresh_tokens.find_one(
                {"user_id": ObjectId(user_id), "token": refresh_token}
            )
            if not stored_token:
                return {"status": "failed", "message": "Token not found or revoked"}

            user = db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return {"status": "failed", "message": "User not found"}

            new_access_token = self.create_access_token(
                {"sub": str(user_id), "email": user["email"]}
            )

            return {
                "status": "success",
                "access_token": new_access_token,
                "token_type": "bearer",
            }
        except ValueError as e:
            return {"status": "failed", "message": str(e)}
        except Exception as e:
            logger.error(f"Refresh token error: {e}")
            return {"status": "failed", "message": "Token refresh failed"}

    async def get_current_user(self, token: str) -> dict:
        try:
            payload = self.decode_token(token)
            if payload.get("type") != "access":
                raise ValueError("Invalid token type")

            user_id = payload.get("sub")
            if not user_id:
                raise ValueError("Invalid token")

            user = db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                raise ValueError("User not found")

            return {
                "id": str(user["_id"]),
                "email": user["email"],
                "created_at": user["created_at"],
            }
        except ValueError as e:
            raise ValueError(str(e))
        except Exception as e:
            logger.error(f"Get current user error: {e}")
            raise ValueError("Authentication failed")

    async def logout(self, user_id: str, refresh_token: str = None):
        try:
            db.refresh_tokens.delete_many({"user_id": ObjectId(user_id)})
            return {"status": "success", "message": "Logged out successfully"}
        except Exception as e:
            logger.error(f"Logout error: {e}")
            return {"status": "failed", "message": "Logout failed"}
