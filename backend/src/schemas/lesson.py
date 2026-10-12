from pydantic import BaseModel, Field, HttpUrl


class Lesson(BaseModel):
    id: int
    title: str
    body: str = Field(
        description="Markdown; LaTeX is written as $...$ (inline) or $$...$$ (block)."
    )
    video_url: HttpUrl | None = None
    previous_lesson_id: int | None = Field(
        default=None, description="Previous lesson in the same module, if any."
    )
    next_lesson_id: int | None = Field(
        default=None, description="Next lesson in the same module, if any."
    )
