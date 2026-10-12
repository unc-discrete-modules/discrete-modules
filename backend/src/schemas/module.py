from pydantic import BaseModel, Field


class LessonSummary(BaseModel):
    id: int
    title: str


class Module(BaseModel):
    id: int
    title: str
    description: str
    display_order: int = Field(description="Position in the module list, from 0.")
    lessons: list[LessonSummary] = Field(description="Lessons in display order.")
