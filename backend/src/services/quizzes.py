import time

from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from src import models
from src.schemas.submission import (
    AttemptAnswer,
    AttemptDetail,
    AttemptSummary,
    MultipleChoiceAnswer,
    QuestionResult,
    SubmissionRequest,
    SubmissionResult,
)
from src.services.grading import grade_submission
from src.services.visibility import active_questions, is_visible


def submit_quiz(
    session: Session, quiz_id: int, user_id: int, submission: SubmissionRequest
) -> SubmissionResult | None:
    """Grade a submission and record it, or return None if the quiz is missing."""
    quiz = _load_visible_quiz(session, quiz_id)
    if quiz is None:
        return None
    questions = active_questions(quiz)
    result = grade_submission(questions, submission)
    record_attempt(session, quiz.id, user_id, questions, submission, result)
    return result


def _load_visible_quiz(session: Session, quiz_id: int) -> models.Quiz | None:
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
    return quiz if quiz is not None and is_visible(quiz) else None


def list_attempts(
    session: Session, quiz_id: int, user_id: int
) -> list[AttemptSummary] | None:
    """The user's attempts, newest first, or None if the quiz is missing."""
    if _load_visible_quiz(session, quiz_id) is None:
        return None
    attempts = session.exec(
        select(models.QuizAttempt)
        .where(
            models.QuizAttempt.quiz_id == quiz_id,
            models.QuizAttempt.user_id == user_id,
        )
        .order_by(
            models.QuizAttempt.submitted_at.desc(),
            models.QuizAttempt.id.desc(),
        )
    ).all()
    return [_summary(attempt) for attempt in attempts]


def get_attempt(
    session: Session, quiz_id: int, user_id: int, attempt_id: int
) -> AttemptDetail | None:
    """One of the user's attempts, or None if it is missing or not theirs."""
    quiz = _load_visible_quiz(session, quiz_id)
    attempt = session.get(models.QuizAttempt, attempt_id)
    if (
        quiz is None
        or attempt is None
        or attempt.quiz_id != quiz_id
        or attempt.user_id != user_id
    ):
        return None
    questions = {question.id: question for question in active_questions(quiz)}
    responses = session.exec(
        select(models.QuestionResponse).where(
            models.QuestionResponse.attempt_id == attempt_id
        )
    ).all()
    kept = sorted(
        (item for item in responses if item.question_id in questions),
        key=lambda item: questions[item.question_id].position,
    )
    answers = [_answer(questions[item.question_id], item.answer) for item in kept]
    results = [_result(questions[item.question_id], item.correct) for item in kept]
    answered = {item.question_id for item in responses}
    return AttemptDetail(
        **_summary(attempt).model_dump(),
        answers=answers,
        result=SubmissionResult(results=results),
        quiz_changed=(
            len(kept) < len(responses)
            or not questions.keys() <= answered
            or any(
                answer.option_id is None and answer.text is None for answer in answers
            )
        ),
    )


def _summary(attempt: models.QuizAttempt) -> AttemptSummary:
    return AttemptSummary(
        id=attempt.id,
        score=attempt.score,
        max_score=attempt.max_score,
        submitted_at=attempt.submitted_at,
    )


def _answer(question: models.Question, stored: str) -> AttemptAnswer:
    if question.type != models.QuestionType.MULTIPLE_CHOICE:
        return AttemptAnswer(question_id=question.id, text=stored)
    option_id = next(
        (option.id for option in question.answer_options if option.text == stored),
        None,
    )
    return AttemptAnswer(question_id=question.id, option_id=option_id)


def _result(question: models.Question, correct: bool | None) -> QuestionResult:
    if question.type != models.QuestionType.MULTIPLE_CHOICE:
        return QuestionResult(
            question_id=question.id,
            correct=correct,
            correct_answer=question.expected_answer,
        )
    key = next(option for option in question.answer_options if option.is_correct)
    return QuestionResult(
        question_id=question.id,
        correct=correct,
        correct_answer=key.text,
        correct_option_id=key.id,
    )


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
