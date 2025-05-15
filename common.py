from datetime import datetime
from typing import Any, List


class User:
    def __init__(self, id: int, username: str, email: str, last_login: datetime, created_at: datetime):
        self.id = id
        self.username = username
        self.email = email
        self.last_login = last_login
        self.created_at = created_at

    def __str__(self) -> str:
        return f"User(id={self.id}, username={self.username}, email={self.email}, last_login={self.last_login}, created_at={self.created_at})"

    def __repr__(self) -> str:
        return self.__str__()

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, User):
            return False
        return self.id == other.id

    def __hash__(self) -> int:
        return hash(self.id)


class Course:
    def __init__(self, code: str, name: str):
        self.code = code
        self.name = name

    def __str__(self) -> str:
        return f"Course(code={self.code}, name={self.name})"

    def __repr__(self) -> str:
        return self.__str__()

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, Course):
            return False
        return self.code == other.code

    def __hash__(self) -> int:
        return hash(self.code)


class CourseInstance:
    def __init__(self, instance_id: int, course: Course, year: int, semester: str, language: str, canale: str, professors: List[str]):
        self.instance_id = instance_id
        self.course = course
        self.year = year
        self.semester = semester
        self.language = language
        self.canale = canale
        self.professors = professors

    def __str__(self) -> str:
        return f"CourseInstance(instance_id={self.instance_id}, course={self.course}, year={self.year}, semester={self.semester}, language={self.language}, canale={self.canale}, professors={self.professors})"

    def __repr__(self) -> str:
        return self.__str__()

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, CourseInstance):
            return False
        return self.instance_id == other.instance_id

    def __hash__(self) -> int:
        return hash(self.instance_id)


class Vetrina:
    def __init__(self, id: int, name: str, owner: User, description: str):
        self.id = id
        self.name = name
        self.owner = owner
        self.description = description

    def __str__(self) -> str:
        return f"Vetrina(id={self.id}, name={self.name}, owner={self.owner.username}, description={self.description})"

    def __repr__(self) -> str:
        return self.__str__()

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, Vetrina):
            return False
        return self.id == other.id

    def __hash__(self) -> int:
        return hash(self.id)
