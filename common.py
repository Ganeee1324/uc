from datetime import datetime
import logging
from typing import Any, List, Optional
from pydantic import BaseModel, Field, validator, ConfigDict

class File(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    file_id: int
    filename: str = Field(..., min_length=1, max_length=255)
    display_name: str = Field(..., min_length=1, max_length=200)
    upload_date: datetime
    size: int = Field(..., gt=0)
    vetrina_id: int
    sha256: str = Field(..., min_length=64, max_length=64)
    extension: str
    tag: Optional[str] = None
    download_count: int = Field(default=0, ge=0)
    price: float = Field(..., ge=0)
    language: str = Field(..., min_length=2, max_length=15)
    num_pages: int = Field(..., ge=1)
    fact_mark: Optional[int] = Field(None, ge=0, le=100)
    fact_mark_updated_at: Optional[datetime] = None
    thumbnail: Optional[str] = None
    owned: bool = False
    favorite: bool = False

    @validator('extension')
    def validate_extension(cls, v):
        if v not in ['pdf', 'docx', 'txt', 'xlsx']:
            raise ValueError('Invalid extension')
        return v

    @validator('tag')
    def validate_tag(cls, v):
        if v is not None and v not in ['dispense', 'appunti', 'esercizi']:
            raise ValueError('Invalid tag')
        return v

    def to_dict(self) -> dict:
        return self.model_dump()

    @classmethod
    def from_dict(cls, data: dict) -> "File":
        """
        Create a File object from a dictionary.
        Requires:
            - File object fields: file_id, filename, display_name, upload_date, size, vetrina_id, sha256, download_count, fact_mark, fact_mark_updated_at, price, tag, extension, language, num_pages
        """
        return cls(**{key: data[key] for key in file_fields if key in data})

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, File):
            return False
        return self.file_id == other.file_id

    def __hash__(self) -> int:
        return hash(self.file_id)


class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    user_id: int
    username: str = Field(..., min_length=3, max_length=50)
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = Field(None, pattern=r'^[^@]+@[^@]+\.[^@]+$')
    last_login: datetime
    registration_date: datetime
    user_faculty: Optional[str] = None
    user_enrollment_year: Optional[int] = Field(None, ge=2000, le=2030)
    user_canale: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=500)
    profile_picture: Optional[str] = None
    uploaded_documents_count: int = Field(default=0, ge=0)

    def to_dict(self) -> dict:
        return self.model_dump()

    @classmethod
    def from_dict(cls, data: dict, sensitive_data: bool = False, profile_data: bool = False) -> "User":
        """
        Create a User object from a dictionary.
        Requires:
            - User object fields: user_id, username, first_name, last_name, email, last_login, registration_date, uploaded_documents_count
        """
        excluded = []
        if not profile_data:
            excluded.extend(["bio"])
        if not sensitive_data:
            excluded.extend(["email", "first_name", "last_name"])
        return cls(**{key: data[key] for key in user_fields if key in data and key not in excluded})

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, User):
            return False
        return self.user_id == other.user_id

    def __hash__(self) -> int:
        return hash(self.user_id)


class CourseInstance(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    instance_id: int
    course_code: str = Field(..., min_length=1, max_length=20)
    course_name: str = Field(..., min_length=1, max_length=200)
    faculty_name: str = Field(..., min_length=1, max_length=100)
    course_year: int = Field(..., ge=1, le=6)
    date_year: int = Field(..., ge=2000, le=2030)
    language: str = Field(..., min_length=2, max_length=15)
    course_semester: str
    canale: str = Field(..., min_length=1, max_length=10)
    professors: List[str] = Field(default_factory=list)

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, CourseInstance):
            return False
        return self.instance_id == other.instance_id

    def __hash__(self) -> int:
        return hash("course_instance" + str(self.instance_id))

    @classmethod
    def from_dict(cls, data: dict) -> "CourseInstance":
        """
        Create a CourseInstance object from a dictionary.
        Requires:
            - CourseInstance object fields: instance_id, course_code, course_name, faculty_name, course_year, date_year, language, course_semester, canale, professors
        """
        return cls(**{key: data[key] for key in course_instance_fields if key in data})

    def to_dict(self) -> dict:
        return self.model_dump()


class Vetrina(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    vetrina_id: int
    name: str = Field(..., min_length=1, max_length=200)
    author: User
    description: str = Field(..., min_length=1, max_length=1000)
    course_instance: CourseInstance
    average_rating: Optional[float] = Field(None, ge=0, le=5)
    reviews_count: int = Field(default=0, ge=0)
    tags: List[str] = Field(default_factory=list)
    file_count: int = Field(default=0, ge=0)
    price: float = Field(..., ge=0)
    copertina: Optional[str] = None
    favorite: bool = False

    @validator('tags', pre=True)
    def validate_tags(cls, v):
        if v is None:
            return []
        return v

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, Vetrina):
            return False
        return self.vetrina_id == other.vetrina_id

    def __hash__(self) -> int:
        return hash("vetrina" + str(self.vetrina_id))

    def to_dict(self) -> dict:
        return self.model_dump()

    @classmethod
    def from_dict(cls, data: dict) -> "Vetrina":
        """
        Create a Vetrina object from a dictionary.
        Requires:
            - User object fields: user_id, username, first_name, last_name, email, last_login, registration_date, uploaded_documents_count
            - CourseInstance object fields: instance_id, course_code, course_name, faculty_name, course_year, date_year, language, course_semester, canale, professors
            - Vetrina object fields: vetrina_id, name, author, description, course_instance, favorite (optional), tags (optional), file_count (optional), price (optional)
        """
        args = {key: data[key] for key in vetrina_fields if key in data and key not in ["author", "course_instance"]}
        args["author"] = User.from_dict(data)
        args["course_instance"] = CourseInstance.from_dict(data)
        return cls(**args)

class Transaction(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    transaction_id: int
    user_id: int
    amount: int = Field(..., gt=0)
    transaction_date: datetime

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, Transaction):
            return False
        return self.transaction_id == other.transaction_id

    def __hash__(self) -> int:
        return hash("transaction" + str(self.transaction_id))

    def to_dict(self) -> dict:
        return self.model_dump()

    @classmethod
    def from_dict(cls, data: dict) -> "Transaction":
        """
        Create a Transaction object from a dictionary.
        Requires:
            - Transaction object fields: transaction_id, user_id, amount, transaction_date
        """
        args = {key: data[key] for key in transaction_fields if key in data}
        return cls(**args)

class Review(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    user: User
    rating: int = Field(..., ge=1, le=5)
    review_text: str = Field(..., min_length=1, max_length=1000)
    review_date: datetime
    vetrina_id: int
    file_id: Optional[int] = None
    vetrina_name: Optional[str] = None
    file_name: Optional[str] = None

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, Review):
            return False
        return self.user == other.user and self.vetrina_id == other.vetrina_id and self.file_id == other.file_id

    def __hash__(self) -> int:
        target_id = self.file_id if self.file_id is not None else self.vetrina_id
        target_type = "file" if self.file_id is not None else "vetrina"
        return hash("review" + str(self.user.user_id) + target_type + str(target_id))

    def to_dict(self) -> dict:
        return self.model_dump()

    @classmethod
    def from_dict(cls, data: dict) -> "Review":
        """
        Create a Review object from a dictionary.
        Requires:
            - Review object fields: user, rating, review_text, review_date, and either vetrina_id or file_id
        """
        args = {key: data[key] for key in review_fields if key in data and key not in ["user"]}
        args["user"] = User.from_dict(data)
        return cls(**args)

class Chunk(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    vetrina_id: int
    file_id: int
    page_number: int = Field(..., ge=1)
    chunk_description: str = Field(..., min_length=1, max_length=2000)
    image_path: str = Field(..., min_length=1, max_length=500)

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, Chunk):
            return False
        return (
            self.vetrina_id == other.vetrina_id
            and self.file_id == other.file_id
            and self.page_number == other.page_number
            and self.chunk_description == other.chunk_description
        )

    def __hash__(self) -> int:
        return hash("chunk" + str(self.vetrina_id) + str(self.file_id) + str(self.page_number) + self.chunk_description)

    def to_dict(self) -> dict:
        return self.model_dump()

    @classmethod
    def from_dict(cls, data: dict) -> "Chunk":
        """
        Create a Chunk object from a dictionary.
        Requires:
            - Chunk object fields: vetrina_id, file_id, page_number, chunk_description
        """
        args = {key: data[key] for key in chunk_fields if key in data}
        return cls(**args)


file_fields = list(File.model_fields.keys())
user_fields = list(User.model_fields.keys())
course_instance_fields = list(CourseInstance.model_fields.keys())
vetrina_fields = list(Vetrina.model_fields.keys())
transaction_fields = list(Transaction.model_fields.keys())
review_fields = list(Review.model_fields.keys())
chunk_fields = list(Chunk.model_fields.keys())
