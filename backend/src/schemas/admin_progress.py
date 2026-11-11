from pydantic import BaseModel, Field


class MissedQuestion(BaseModel):
    question_id: int
    prompt: str
    answered: int = Field(
        description="Graded responses from students, retakes included."
    )
    incorrect: int
    miss_rate: float = Field(description="incorrect / answered, from 0 to 1.")


class ModuleOverview(BaseModel):
    module_id: int
    title: str
    lesson_count: int = Field(description="Lessons currently visible to students.")
    students_started: int = Field(
        description="Students who completed at least one lesson in the module."
    )
    average_completion: float | None = Field(
        description=(
            "Average share of the module's lessons completed across all students, "
            "counting students who have not started as 0. Null when there are no "
            "students or no lessons."
        )
    )
    students_attempted_quiz: int
    most_missed_questions: list[MissedQuestion] = Field(
        description="Auto-graded questions students miss most, worst first."
    )


class AdminProgressOverview(BaseModel):
    student_count: int = Field(description="Students who have signed in.")
    modules: list[ModuleOverview] = Field(
        description="Visible modules in display order."
    )
