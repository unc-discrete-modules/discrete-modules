from fastapi import APIRouter, HTTPException

from src.errors import INVALID, NOT_FOUND
from src.schemas.submission import SubmissionRequest, SubmissionResult
from src.services import stub_content

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


@router.post(
    "/{quiz_id}/submissions",
    operation_id="submit_quiz",
    summary="Submit answers and get per-question feedback",
    responses=NOT_FOUND | INVALID,
)
def submit_quiz(quiz_id: int, submission: SubmissionRequest) -> SubmissionResult:
    quiz = stub_content.QUIZZES.get(quiz_id)
    if quiz is None:
        raise HTTPException(404, f"Quiz {quiz_id} not found")
    try:
        return stub_content.grade(quiz, submission)
    except ValueError as error:
        raise HTTPException(422, str(error)) from error
