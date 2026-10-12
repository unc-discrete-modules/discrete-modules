from pydantic import BaseModel, Field


class LessonSummary(BaseModel):
    id: int
    title: str


class ModuleSummary(BaseModel):
    id: int
    title: str
    description: str
    display_order: int = Field(description="Position in the module list, from 0.")


class Module(ModuleSummary):
    has_quiz: bool = Field(description="Whether the module has a quiz to take.")
    lessons: list[LessonSummary] = Field(description="Lessons in display order.")
