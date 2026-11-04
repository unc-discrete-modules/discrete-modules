from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session

from src.database import get_db_session
from src.errors import (
    CONFLICT,
    FORBIDDEN,
    INVALID,
    NOT_FOUND,
    UNAUTHORIZED,
    UNAVAILABLE,
)
from src.schemas.admin import (
    LessonInput,
    LessonPatch,
    LessonResponse,
    ModuleInput,
    ModulePatch,
    ModuleResponse,
    Order,
    OrderResponse,
    QuizInput,
    QuizResponse,
)
from src.services import admin_content
from src.services.auth import require_admin

router = APIRouter(
    prefix="/admin",
    tags=["admin content"],
    dependencies=[Depends(require_admin)],
    responses=UNAUTHORIZED | FORBIDDEN | UNAVAILABLE,
)
Db = Annotated[Session, Depends(get_db_session)]


@router.get(
    "/modules",
    operation_id="admin_list_modules",
    summary="List modules in display order",
)
def list_modules(db: Db) -> list[ModuleResponse]:
    return admin_content.list_modules(db)


@router.post(
    "/modules",
    status_code=201,
    operation_id="admin_create_module",
    summary="Create a module",
    responses=INVALID | CONFLICT,
)
def create_module(data: ModuleInput, db: Db) -> ModuleResponse:
    return admin_content.create_module(data, db)


@router.put(
    "/modules/order",
    operation_id="admin_order_modules",
    summary="Reorder modules",
    description="Provide every module ID exactly once in the desired order.",
    responses=INVALID | CONFLICT,
)
def order_modules(data: Order, db: Db) -> OrderResponse:
    return admin_content.order_modules(data, db)


@router.get(
    "/modules/{module_id}",
    operation_id="admin_get_module",
    summary="Get a module",
    responses=NOT_FOUND | INVALID,
)
def read_module(module_id: int, db: Db) -> ModuleResponse:
    return admin_content.read_module(module_id, db)


@router.patch(
    "/modules/{module_id}",
    operation_id="admin_update_module",
    summary="Update a module",
    responses=NOT_FOUND | INVALID | CONFLICT,
)
def patch_module(module_id: int, data: ModulePatch, db: Db) -> ModuleResponse:
    return admin_content.patch_module(module_id, data, db)


@router.delete(
    "/modules/{module_id}",
    status_code=204,
    operation_id="admin_delete_module",
    summary="Delete a module",
    description="Delete the module and its lessons and quiz. A repository-backed module is reinserted on the next seed run.",
    responses=NOT_FOUND | INVALID | CONFLICT,
)
def delete_module(module_id: int, db: Db):
    return admin_content.delete_module(module_id, db)


@router.get(
    "/modules/{module_id}/lessons",
    operation_id="admin_list_lessons",
    summary="List a module’s lessons in display order",
    responses=NOT_FOUND | INVALID,
)
def list_lessons(module_id: int, db: Db) -> list[LessonResponse]:
    return admin_content.list_lessons(module_id, db)


@router.post(
    "/modules/{module_id}/lessons",
    status_code=201,
    operation_id="admin_create_lesson",
    summary="Create a lesson",
    responses=NOT_FOUND | INVALID | CONFLICT,
)
def create_lesson(module_id: int, data: LessonInput, db: Db) -> LessonResponse:
    return admin_content.create_lesson(module_id, data, db)


@router.put(
    "/modules/{module_id}/lessons/order",
    operation_id="admin_order_lessons",
    summary="Reorder a module’s lessons",
    description="Provide every lesson ID in the module exactly once in the desired order.",
    responses=NOT_FOUND | INVALID | CONFLICT,
)
def order_lessons(module_id: int, data: Order, db: Db) -> OrderResponse:
    return admin_content.order_lessons(module_id, data, db)


@router.get(
    "/lessons/{lesson_id}",
    operation_id="admin_get_lesson",
    summary="Get a lesson",
    responses=NOT_FOUND | INVALID,
)
def read_lesson(lesson_id: int, db: Db) -> LessonResponse:
    return admin_content.read_lesson(lesson_id, db)


@router.patch(
    "/lessons/{lesson_id}",
    operation_id="admin_update_lesson",
    summary="Update a lesson",
    responses=NOT_FOUND | INVALID | CONFLICT,
)
def patch_lesson(lesson_id: int, data: LessonPatch, db: Db) -> LessonResponse:
    return admin_content.patch_lesson(lesson_id, data, db)


@router.delete(
    "/lessons/{lesson_id}",
    status_code=204,
    operation_id="admin_delete_lesson",
    summary="Delete a lesson",
    responses=NOT_FOUND | INVALID | CONFLICT,
)
def delete_lesson(lesson_id: int, db: Db):
    return admin_content.delete_lesson(lesson_id, db)


@router.post(
    "/modules/{module_id}/quiz",
    status_code=201,
    operation_id="admin_create_quiz",
    summary="Create a module’s quiz",
    description="Provide the ordered questions and their answer keys.",
    responses=NOT_FOUND | INVALID | CONFLICT,
)
def create_quiz(module_id: int, data: QuizInput, db: Db) -> QuizResponse:
    return admin_content.create_quiz(module_id, data, db)


@router.get(
    "/modules/{module_id}/quiz",
    operation_id="admin_get_quiz",
    summary="Get a module’s quiz and answer keys",
    responses=NOT_FOUND | INVALID,
)
def read_quiz(module_id: int, db: Db) -> QuizResponse:
    return admin_content.read_quiz(module_id, db)


@router.put(
    "/quizzes/{quiz_id}",
    operation_id="admin_replace_quiz",
    summary="Replace a quiz’s questions",
    description="Replace the ordered questions and answer keys. Questions with retained keys keep their IDs.",
    responses=NOT_FOUND | INVALID | CONFLICT,
)
def update_quiz(quiz_id: int, data: QuizInput, db: Db) -> QuizResponse:
    return admin_content.update_quiz(quiz_id, data, db)


@router.delete(
    "/quizzes/{quiz_id}",
    status_code=204,
    operation_id="admin_delete_quiz",
    summary="Delete a quiz",
    responses=NOT_FOUND | INVALID | CONFLICT,
)
def delete_quiz(quiz_id: int, db: Db):
    return admin_content.delete_quiz(quiz_id, db)
