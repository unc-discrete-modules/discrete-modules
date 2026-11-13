from pydantic import BaseModel, Field


class LessonSummary(BaseModel):
    id: int
    title: str


class ModuleSummary(BaseModel):
    id: int
    title: str
    display_order: int = Field(description="Position in the module list, from 0.")


class Module(ModuleSummary):
    quiz_id: int | None = Field(
        description="The module's quiz, or null if it has none."
    )
    lessons: list[LessonSummary] = Field(description="Lessons in display order.")
