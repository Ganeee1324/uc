from datetime import datetime
from typing import Any, List


class User:
    def __init__(self, id: int, username: str, name: str, surname: str, email: str, last_login: datetime, created_at: datetime):
        self.id = id
        self.username = username
        self.name = name
        self.surname = surname
        self.email = email
        self.last_login = last_login
        self.created_at = created_at

    def __str__(self) -> str:
        return f"User(id={self.id}, username={self.username}, name={self.name}, surname={self.surname}, email={self.email}, last_login={self.last_login}, created_at={self.created_at})"

    def __repr__(self) -> str:
        return self.__str__()

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, User):
            return False
        return self.id == other.id

    def __hash__(self) -> int:
        return hash(self.id)


class CourseInstance:
    def __init__(
        self,
        instance_id: int,
        course_code: str,
        course_name: str,
        faculty_name: str,
        year: int,
        date_year: int,
        language: str,
        course_semester: str,
        canale: str,
        professors: List[str],
    ):
        self.instance_id = instance_id
        self.course_code = course_code
        self.course_name = course_name
        self.faculty_name = faculty_name
        self.year = year
        self.date_year = date_year
        self.language = language
        self.course_semester = course_semester
        self.canale = canale
        self.professors = professors

    def __str__(self) -> str:
        return f"CourseInstance(instance_id={self.instance_id}, course_code={self.course_code}, course_name={self.course_name}, faculty_name={self.faculty_name}, year={self.year}, date_year={self.date_year}, language={self.language}, course_semester={self.course_semester}, canale={self.canale}, professors={self.professors})"

    def __repr__(self) -> str:
        return self.__str__()

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, CourseInstance):
            return False
        return self.instance_id == other.instance_id

    def __hash__(self) -> int:
        return hash("course_instance" + str(self.instance_id))

    def to_dict(self) -> dict:
        return {
            "instance_id": self.instance_id,
            "course_code": self.course_code,
            "course_name": self.course_name,
            "faculty_name": self.faculty_name,
            "year": self.year,
            "date_year": self.date_year,
            "language": self.language,
            "course_semester": self.course_semester,
            "canale": self.canale,
            "professors": self.professors,
        }


class Vetrina:
    def __init__(self, id: int, name: str, owner_id: int, description: str, course_instance_id: int):
        self.id = id
        self.name = name
        self.owner_id = owner_id
        self.description = description
        self.course_instance_id = course_instance_id

    def __str__(self) -> str:
        return f"Vetrina(id={self.id}, name={self.name}, owner_id={self.owner_id}, description={self.description}, course_instance_id={self.course_instance_id})"

    def __repr__(self) -> str:
        return self.__str__()

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, Vetrina):
            return False
        return self.id == other.id

    def __hash__(self) -> int:
        return hash("vetrina" + str(self.id))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "owner_id": self.owner_id,
            "description": self.description,
            "course_instance_id": self.course_instance_id,
        }


class VetrinaSubscription:
    def __init__(self, subscriber_id: int, vetrina: Vetrina, price: int, created_at: datetime):
        self.subscriber_id = subscriber_id
        self.vetrina = vetrina
        self.price = price
        self.created_at = created_at

    def __str__(self) -> str:
        return f"VetrinaSubscription(subscriber_id={self.subscriber_id}, vetrina={self.vetrina}, price={self.price}, created_at={self.created_at})"

    def __repr__(self) -> str:
        return self.__str__()

    def __hash__(self) -> int:
        return hash("vetrina_subscription" + str(self.subscriber_id) + str(self.vetrina.id))

    def to_dict(self) -> dict:
        return {
            "subscriber_id": self.subscriber_id,
            "vetrina": self.vetrina.to_dict(),
            "price": self.price,
            "created_at": self.created_at,
        }


class File:
    def __init__(
        self,
        id: int,
        filename: str,
        created_at: datetime,
        size: int,
        vetrina_id: int,
        sha256: str,
        download_count: int = 0,
        fact_mark: int | None = None,
        fact_mark_updated_at: datetime | None = None,
    ):
        self.id = id
        self.filename = filename
        self.created_at = created_at
        self.fact_mark = fact_mark
        self.fact_mark_updated_at = fact_mark_updated_at
        self.size = size
        self.download_count = download_count
        self.vetrina_id = vetrina_id
        self.sha256 = sha256

    def __str__(self) -> str:
        return f"File(id={self.id}, filename={self.filename}, created_at={self.created_at}, fact_mark={self.fact_mark}, fact_mark_updated_at={self.fact_mark_updated_at}, size={self.size}, download_count={self.download_count})"

    def __repr__(self) -> str:
        return self.__str__()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "filename": self.filename,
            "created_at": self.created_at,
            "fact_mark": self.fact_mark,
            "fact_mark_updated_at": self.fact_mark_updated_at,
            "size": self.size,
            "download_count": self.download_count,
        }
