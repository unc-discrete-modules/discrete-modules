from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from src.database import get_db_session
from src.errors import INVALID, NOT_FOUND
from src.schemas.submission import SubmissionRequest, SubmissionResult
from src.services import quizzes as quiz_service
from src.services.grading import SubmissionError

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

SessionDep = Annotated[Session, Depends(get_db_session)]


@router.post(
    "/{quiz_id}/submissions",
    operation_id="submit_quiz",
    summary="Submit answers and get per-question feedback",
    responses=NOT_FOUND | INVALID,
)
def submit_quiz(
    quiz_id: int, submission: SubmissionRequest, session: SessionDep
) -> SubmissionResult:
    # Only SubmissionError is a client mistake; other failures must stay 500s.
    try:
        result = quiz_service.submit_quiz(session, quiz_id, submission)
    except SubmissionError as error:
        raise HTTPException(422, str(error)) from error
    if result is None:
        raise HTTPException(404, f"Quiz {quiz_id} not found")
    return result
