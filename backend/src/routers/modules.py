from fastapi import APIRouter, HTTPException

from src.errors import INVALID, NOT_FOUND
from src.schemas.module import Module
from src.schemas.quiz import Quiz
from src.services import stub_content

router = APIRouter(prefix="/modules", tags=["modules"])


@router.get("", operation_id="list_modules", summary="List modules")
def list_modules() -> list[Module]:
    return stub_content.MODULES


@router.get(
    "/{module_id}",
    operation_id="get_module",
    summary="Get a module and its lessons",
    responses=NOT_FOUND | INVALID,
)
def get_module(module_id: int) -> Module:
    module = next((m for m in stub_content.MODULES if m.id == module_id), None)
    if module is None:
        raise HTTPException(404, f"Module {module_id} not found")
    return module


@router.get(
    "/{module_id}/quiz",
    operation_id="get_module_quiz",
    summary="Get a module's quiz",
    responses=NOT_FOUND | INVALID,
)
def get_module_quiz(module_id: int) -> Quiz:
    quiz_id = stub_content.QUIZ_BY_MODULE.get(module_id)
    if quiz_id is None:
        raise HTTPException(404, f"Module {module_id} has no quiz")
    return stub_content.QUIZZES[quiz_id]
