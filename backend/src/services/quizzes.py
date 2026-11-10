import time

from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from src import models
from src.schemas.submission import (
    MultipleChoiceAnswer,
    SubmissionRequest,
    SubmissionResult,
)
from src.services.grading import grade_submission
from src.services.visibility import active_questions, is_visible


def submit_quiz(
    session: Session, quiz_id: int, user_id: int, submission: SubmissionRequest
) -> SubmissionResult | None:
    """Grade a submission and record it, or return None if the quiz is missing."""
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
    if quiz is None or not is_visible(quiz):
        return None
    questions = active_questions(quiz)
    result = grade_submission(questions, submission)
    record_attempt(session, quiz.id, user_id, questions, submission, result)
    return result


def record_attempt(
    session: Session,
    quiz_id: int,
    user_id: int,
    questions: list[models.Question],
    submission: SubmissionRequest,
    result: SubmissionResult,
) -> None:
    """Store a graded submission; the attempt and its responses commit together."""
    graded = [item.correct for item in result.results if item.correct is not None]
    attempt = models.QuizAttempt(
        user_id=user_id,
        quiz_id=quiz_id,
        score=sum(graded),
        max_score=len(graded),
        submitted_at=int(time.time()),
    )
    session.add(attempt)
    session.flush()

    questions_by_id = {question.id: question for question in questions}
    outcomes = {item.question_id: item.correct for item in result.results}
    for answer in submission.answers:
        session.add(
            models.QuestionResponse(
                attempt_id=attempt.id,
                question_id=answer.question_id,
                answer=_stored_answer(questions_by_id[answer.question_id], answer),
                correct=outcomes[answer.question_id],
            )
        )
    session.commit()


def _stored_answer(question: models.Question, answer) -> str:
    if isinstance(answer, MultipleChoiceAnswer):
        # Grading already checked the option belongs to the question. Storing its
        # text keeps the record meaningful if options are edited later.
        return next(
            option.text
            for option in question.answer_options
            if option.id == answer.option_id
        )
    return answer.text
