from typing import Optional
from pydantic import BaseModel, Field, validator
from enum import Enum

# Enums for validation
class FileExtension(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    XLSX = "xlsx"


class FileTag(str, Enum):
    DISPENSE = "dispense"
    APPUNTI = "appunti"
    ESERCIZI = "esercizi"


# Input Validation Schemas for API endpoints
class UserRegistrationRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r'^[a-zA-Z0-9_]+$')
    email: str = Field(..., pattern=r'^[^@]+@[^@]+\.[^@]+$')
    password: str = Field(..., min_length=8, max_length=128)
    name: str = Field(..., min_length=1, max_length=100)
    surname: str = Field(..., min_length=1, max_length=100)

    @validator('password')
    def validate_password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserLoginRequest(BaseModel):
    email: str = Field(..., pattern=r'^[^@]+@[^@]+\.[^@]+$')
    password: str = Field(..., min_length=1)


class UserUpdateRequest(BaseModel):
    user_faculty: Optional[str] = Field(None, min_length=1, max_length=100)
    user_enrollment_year: Optional[int] = Field(None, ge=2000, le=2030)
    user_canale: Optional[str] = Field(None, min_length=1, max_length=10)
    bio: Optional[str] = Field(None, max_length=500)


class VetrinaCreateRequest(BaseModel):
    course_instance_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=1000)
    price: float = Field(default=0.0, ge=0, le=1000)


class FileUploadRequest(BaseModel):
    tag: Optional[FileTag] = None
    display_name: Optional[str] = Field(None, min_length=1, max_length=200)


class ReviewCreateRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    review_text: str = Field(..., min_length=1, max_length=1000)


class FileDisplayNameUpdateRequest(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=200)


class SearchRequest(BaseModel):
    q: str = Field(..., min_length=1, max_length=500, description="Search query")
    course_name: Optional[str] = Field(None, max_length=200)
    faculty: Optional[str] = Field(None, max_length=100)
    canale: Optional[str] = Field(None, max_length=10)
    language: Optional[str] = Field(None, max_length=5)
    date_year: Optional[int] = Field(None, ge=2000, le=2030)
    course_year: Optional[int] = Field(None, ge=1, le=6)
    tag: Optional[FileTag] = None
    extension: Optional[FileExtension] = None


# Response schemas removed - using standard Flask jsonify + to_dict() pattern 