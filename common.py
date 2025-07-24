from datetime import datetime
import inspect
from typing import Any, List
from dataclasses import dataclass


@dataclass
class File:
    file_id: int
    filename: str
    display_name: str
    upload_date: datetime
    size: int
    vetrina_id: int
    sha256: str
    extension: str
    tag: str | None
    download_count: int
    price: float
    language: str
    num_pages: int
    fact_mark: int | None
    fact_mark_updated_at: datetime | None
    owned: bool = False
    favorite: bool = False

    def to_dict(self) -> dict:
        return {
            "file_id": self.file_id,
            "filename": self.filename,
            "display_name": self.display_name,
            "upload_date": self.upload_date,
            "vetrina_id": self.vetrina_id,
            "sha256": self.sha256,
            "fact_mark": self.fact_mark,
            "fact_mark_updated_at": self.fact_mark_updated_at,
            "size": self.size,
            "download_count": self.download_count,
            "owned": self.owned,
            "price": self.price,
            "favorite": self.favorite,
            "tag": self.tag,
            "extension": self.extension,
            "language": self.language,
            "num_pages": self.num_pages,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "File":
        """
        Create a File object from a dictionary.
        Requires:
            - File object fields: file_id, filename, display_name, upload_date, size, vetrina_id, sha256, download_count, fact_mark, fact_mark_updated_at, price, tag, extension, language, num_pages
        """
        return cls(**{key: data[key] for key in file_fields if key in data})


@dataclass
class User:
    user_id: int
    username: str
    first_name: str
    last_name: str
    email: str
    last_login: datetime
    registration_date: datetime
    user_faculty: str | None
    user_enrollment_year: int | None
    user_canale: str | None
    bio: str | None
    profile_picture: str | None

    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "username": self.username,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "last_login": self.last_login,
            "registration_date": self.registration_date,
            "user_faculty": self.user_faculty,
            "user_enrollment_year": self.user_enrollment_year,
            "user_canale": self.user_canale,
            "bio": self.bio,
            "profile_picture": self.profile_picture,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "User":
        """
        Create a User object from a dictionary.
        Requires:
            - User object fields: user_id, username, first_name, last_name, email, last_login, registration_date
        """
        return cls(**{key: data[key] for key in user_fields if key in data})

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, User):
            return False
        return self.user_id == other.user_id

    def __hash__(self) -> int:
        return hash(self.user_id)


@dataclass
class CourseInstance:
    instance_id: int
    course_code: str
    course_name: str
    faculty_name: str
    course_year: int
    date_year: int
    language: str
    course_semester: str
    canale: str
    professors: List[str]

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
        return {
            "instance_id": self.instance_id,
            "course_code": self.course_code,
            "course_name": self.course_name,
            "faculty_name": self.faculty_name,
            "course_year": self.course_year,
            "date_year": self.date_year,
            "language": self.language,
            "course_semester": self.course_semester,
            "canale": self.canale,
            "professors": self.professors,
        }


@dataclass
class Vetrina:
    vetrina_id: int
    name: str
    author: User
    description: str
    course_instance: CourseInstance
    average_rating: float | None
    reviews_count: int
    tags: List[str]
    file_count: int
    price: float
    favorite: bool = False

    def __post_init__(self):
        if self.tags is None:
            self.tags = []

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, Vetrina):
            return False
        return self.vetrina_id == other.vetrina_id

    def __hash__(self) -> int:
        return hash("vetrina" + str(self.vetrina_id))

    def to_dict(self) -> dict:
        res = {
            "vetrina_id": self.vetrina_id,
            "name": self.name,
            "author": self.author.to_dict(),
            "description": self.description,
            "course_instance": self.course_instance.to_dict(),
            "favorite": self.favorite,
            "average_rating": self.average_rating,
            "reviews_count": self.reviews_count,
            "tags": self.tags,
            "file_count": self.file_count,
            "price": self.price,
        }
        return res

    @classmethod
    def from_dict(cls, data: dict) -> "Vetrina":
        """
        Create a Vetrina object from a dictionary.
        Requires:
            - User object fields: user_id, username, first_name, last_name, email, last_login, registration_date
            - CourseInstance object fields: instance_id, course_code, course_name, faculty_name, course_year, date_year, language, course_semester, canale, professors
            - Vetrina object fields: vetrina_id, name, author, description, course_instance, favorite (optional), tags (optional), file_count (optional), price (optional)
        """
        args = {key: data[key] for key in vetrina_fields if key in data and key not in ["author", "course_instance"]}
        args["author"] = User.from_dict(data)
        args["course_instance"] = CourseInstance.from_dict(data)
        return cls(**args)


@dataclass
class Transaction:
    transaction_id: int
    user_id: int
    amount: int
    transaction_date: datetime

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, Transaction):
            return False
        return self.transaction_id == other.transaction_id

    def __hash__(self) -> int:
        return hash("transaction" + str(self.transaction_id))

    def to_dict(self) -> dict:
        return {
            "transaction_id": self.transaction_id,
            "user_id": self.user_id,
            "amount": self.amount,
            "transaction_date": self.transaction_date,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Transaction":
        """
        Create a Transaction object from a dictionary.
        Requires:
            - Transaction object fields: transaction_id, user_id, amount, transaction_date
        """
        args = {key: data[key] for key in transaction_fields if key in data}
        return cls(**args)


@dataclass
class Review:
    user: User
    rating: int
    review_text: str
    review_date: datetime
    vetrina_id: int | None
    file_id: int | None

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, Review):
            return False
        return self.user == other.user and self.vetrina_id == other.vetrina_id and self.file_id == other.file_id

    def __hash__(self) -> int:
        target_id = self.vetrina_id if self.vetrina_id is not None else self.file_id
        target_type = "vetrina" if self.vetrina_id is not None else "file"
        return hash("review" + str(self.user.user_id) + target_type + str(target_id))

    def to_dict(self) -> dict:
        return {
            "user": self.user.to_dict(),
            "vetrina_id": self.vetrina_id,
            "file_id": self.file_id,
            "rating": self.rating,
            "review_text": self.review_text,
            "review_date": self.review_date,
        }

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


@dataclass
class Chunk:
    vetrina_id: int
    file_id: int
    page_number: int
    chunk_description: str

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
        return {
            "vetrina_id": self.vetrina_id,
            "file_id": self.file_id,
            "page_number": self.page_number,
            "chunk_description": self.chunk_description,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Chunk":
        """
        Create a Chunk object from a dictionary.
        Requires:
            - Chunk object fields: vetrina_id, file_id, page_number, chunk_description
        """
        args = {key: data[key] for key in chunk_fields if key in data}
        return cls(**args)


file_fields = [key for key in inspect.signature(File.__init__).parameters.keys() if key != "self"]
user_fields = [key for key in inspect.signature(User.__init__).parameters.keys() if key != "self"]
course_instance_fields = [key for key in inspect.signature(CourseInstance.__init__).parameters.keys() if key != "self"]
vetrina_fields = [key for key in inspect.signature(Vetrina.__init__).parameters.keys() if key != "self"]

transaction_fields = [key for key in inspect.signature(Transaction.__init__).parameters.keys() if key != "self"]
review_fields = [key for key in inspect.signature(Review.__init__).parameters.keys() if key != "self"]
chunk_fields = [key for key in inspect.signature(Chunk.__init__).parameters.keys() if key != "self"]
