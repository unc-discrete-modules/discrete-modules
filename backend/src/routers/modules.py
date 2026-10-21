from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from src.database import get_db_session
from src.errors import INVALID, NOT_FOUND
from src.schemas.module import Module, ModuleSummary
from src.schemas.quiz import Quiz
from src.services import modules as module_service

router = APIRouter(prefix="/modules", tags=["modules"])

SessionDep = Annotated[Session, Depends(get_db_session)]


@router.get("", operation_id="list_modules", summary="List modules in display order")
def list_modules(session: SessionDep) -> list[ModuleSummary]:
    return module_service.list_modules(session)


@router.get(
    "/{module_id}",
    operation_id="get_module",
    summary="Get a module and its lessons",
    responses=NOT_FOUND | INVALID,
)
def get_module(module_id: int, session: SessionDep) -> Module:
    module = module_service.get_module(session, module_id)
    if module is None:
        raise HTTPException(404, f"Module {module_id} not found")
    return module


@router.get(
    "/{module_id}/quiz",
    operation_id="get_module_quiz",
    summary="Get a module's quiz",
    responses=NOT_FOUND | INVALID,
)
def get_module_quiz(module_id: int, session: SessionDep) -> Quiz:
    quiz = module_service.get_quiz(session, module_id)
    if quiz is None:
        raise HTTPException(404, f"Module {module_id} has no quiz")
    return quiz
