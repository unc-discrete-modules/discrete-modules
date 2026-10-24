from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from src import models
from src.models import QuestionType
from src.schemas import quiz as quiz_schema
from src.schemas.module import LessonSummary, Module, ModuleSummary


def _summary(row: models.Module) -> ModuleSummary:
    return ModuleSummary(
        id=row.id,
        title=row.title,
        description=row.description,
        display_order=row.position,
    )


def list_modules(session: Session) -> list[ModuleSummary]:
    statement = select(models.Module).order_by(models.Module.position)
    return [_summary(row) for row in session.exec(statement)]


def get_module(session: Session, module_id: int) -> Module | None:
    row = session.get(models.Module, module_id)
    if row is None:
        return None
    lessons = sorted(row.lessons, key=lambda lesson: lesson.position)
    return Module(
        **_summary(row).model_dump(),
        quiz_id=row.quiz.id if row.quiz else None,
        lessons=[LessonSummary(id=lesson.id, title=lesson.title) for lesson in lessons],
    )


def get_quiz(session: Session, module_id: int) -> quiz_schema.Quiz | None:
    statement = (
        select(models.Quiz)
        .where(models.Quiz.module_id == module_id)
        .options(
            selectinload(models.Quiz.questions).selectinload(
                models.Question.answer_options
            )
        )
    )
    row = session.exec(statement).first()
    if row is None:
        return None
    questions = sorted(row.questions, key=lambda question: question.position)
    return quiz_schema.Quiz(
        id=row.id, questions=[_question(question) for question in questions]
    )


# Each field is copied by name instead of validating from the row, so
# expected_answer and is_correct can never reach a student.
def _question(row: models.Question) -> quiz_schema.Question:
    if row.type == QuestionType.MULTIPLE_CHOICE:
        options = sorted(row.answer_options, key=lambda option: option.position)
        return quiz_schema.MultipleChoiceQuestion(
            id=row.id,
            type=QuestionType.MULTIPLE_CHOICE,
            prompt=row.prompt,
            options=[
                quiz_schema.AnswerOption(id=option.id, text=option.text)
                for option in options
            ],
        )
    if row.type == QuestionType.FILL_IN_BLANK:
        return quiz_schema.FillInBlankQuestion(
            id=row.id, type=QuestionType.FILL_IN_BLANK, prompt=row.prompt
        )
    return quiz_schema.FreeResponseQuestion(
        id=row.id, type=QuestionType.FREE_RESPONSE, prompt=row.prompt
    )
