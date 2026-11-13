from pydantic import BaseModel, Field


class BestAttempt(BaseModel):
    score: int
    max_score: int = Field(description="Auto-graded questions in that attempt.")


class ModuleProgress(BaseModel):
    module_id: int
    lesson_count: int = Field(description="Lessons currently visible to students.")
    completed_lesson_ids: list[int] = Field(
        description="Visible lessons the user completed, in lesson order."
    )
    best_quiz_attempt: BestAttempt | None = Field(
        description="Null until the user submits the module's quiz."
    )


class LessonCompletionResponse(BaseModel):
    lesson_id: int
    completed_at: int = Field(description="Unix time of the first completion.")
