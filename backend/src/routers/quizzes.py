from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from src.database import get_db_session
from src.errors import INVALID, NOT_FOUND
from src.schemas.submission import (
    AttemptDetail,
    AttemptSummary,
    SubmissionRequest,
    SubmissionResult,
)
from src.services import quizzes as quiz_service
from src.services.auth import CurrentUser
from src.services.grading import SubmissionError

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

SessionDep = Annotated[Session, Depends(get_db_session)]


@router.post(
    "/{quiz_id}/submissions",
    operation_id="submit_quiz",
    summary="Submit answers and get per-question feedback",
    description="Grades the answers and records the attempt for the signed-in user.",
    responses=NOT_FOUND | INVALID,
)
def submit_quiz(
    quiz_id: int,
    submission: SubmissionRequest,
    session: SessionDep,
    user: CurrentUser,
) -> SubmissionResult:
    # Only SubmissionError is a client mistake; other failures must stay 500s.
    try:
        result = quiz_service.submit_quiz(session, quiz_id, user.id, submission)
    except SubmissionError as error:
        raise HTTPException(422, str(error)) from error
    if result is None:
        raise HTTPException(404, f"Quiz {quiz_id} not found")
    return result


@router.get(
    "/{quiz_id}/attempts",
    operation_id="list_quiz_attempts",
    summary="List the signed-in user's attempts at a quiz, newest first",
    responses=NOT_FOUND | INVALID,
)
def list_quiz_attempts(
    quiz_id: int, session: SessionDep, user: CurrentUser
) -> list[AttemptSummary]:
    attempts = quiz_service.list_attempts(session, quiz_id, user.id)
    if attempts is None:
        raise HTTPException(404, f"Quiz {quiz_id} not found")
    return attempts


@router.get(
    "/{quiz_id}/attempts/{attempt_id}",
    operation_id="get_quiz_attempt",
    summary="Get one of the signed-in user's attempts with its feedback",
    responses=NOT_FOUND | INVALID,
)
def get_quiz_attempt(
    quiz_id: int, attempt_id: int, session: SessionDep, user: CurrentUser
) -> AttemptDetail:
    attempt = quiz_service.get_attempt(session, quiz_id, user.id, attempt_id)
    if attempt is None:
        raise HTTPException(404, f"Attempt {attempt_id} not found")
    return attempt
