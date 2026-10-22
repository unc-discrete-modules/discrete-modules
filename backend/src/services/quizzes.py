from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from src import models
from src.schemas.submission import SubmissionRequest, SubmissionResult
from src.services.grading import grade_submission


def submit_quiz(
    session: Session, quiz_id: int, submission: SubmissionRequest
) -> SubmissionResult | None:
    """Grade a submission against a quiz, or return None if it does not exist."""
    statement = (
        select(models.Quiz)
        .where(models.Quiz.id == quiz_id)
        .options(
            selectinload(models.Quiz.questions).selectinload(
                models.Question.answer_options
            )
        )
    )
    quiz = session.exec(statement).first()
    if quiz is None:
        return None
    return grade_submission(quiz.questions, submission)
