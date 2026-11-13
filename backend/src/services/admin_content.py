"""Content administration operations."""

from itertools import count

from fastapi import HTTPException, Response
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from src.models import AnswerOption, Lesson, Module, Question, Quiz
from src.schemas.admin import (
    LessonInput,
    LessonPatch,
    LessonResponse,
    ModuleInput,
    ModulePatch,
    ModuleResponse,
    OptionResponse,
    Order,
    OrderResponse,
    QuestionResponse,
    QuizInput,
    QuizResponse,
)

Db = Session


def get(db, model, id):
    row = db.get(model, id)
    if row is None:
        raise HTTPException(404, f"{model.__name__} not found")
    return row


def save(db):
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Content conflicts with an existing record") from exc


def rows(db, model, parent=None, include_archived=False):
    query = select(model).order_by(model.position)
    if parent is not None:
        query = query.where(model.module_id == parent)
    if not include_archived:
        query = query.where(model.archived.is_(False))
    return list(db.exec(query))


def next_position(db, model, parent=None):
    # Archived rows keep their slot, so they count when appending.
    items = rows(db, model, parent, include_archived=True)
    return max((i.position for i in items), default=-1) + 1


def reorder(db, model, parent, ids):
    items = rows(db, model, parent)
    if len(ids) != len(items) or set(ids) != {item.id for item in items}:
        raise HTTPException(422, "Order must contain every active ID exactly once")
    # Active rows are permuted among the slots they already occupy, so archived
    # rows stay put and a restore returns to its original place.
    slots = sorted(item.position for item in items)
    # Move rows beyond every position, archived included, before reassigning.
    offset = next_position(db, model, parent)
    for item in items:
        item.position += offset
        db.add(item)
    db.flush()
    by_id = {item.id: item for item in items}
    for slot, id in zip(slots, ids):
        by_id[id].position = slot
        db.add(by_id[id])
    db.flush()


def set_archived(db, model, id, archived):
    row = get(db, model, id)
    row.archived = archived
    db.add(row)
    save(db)
    db.refresh(row)
    return row


def reject_archived_key(db, model, key, parent=None):
    query = select(model).where(model.key == key, model.archived.is_(True))
    if parent is not None:
        query = query.where(model.module_id == parent)
    if db.exec(query).first():
        raise HTTPException(
            409, f"An archived {model.__name__.lower()} has this key; restore it"
        )


def require_active_module(db, module_id):
    module = get(db, Module, module_id)
    if module.archived:
        raise HTTPException(409, "Module is archived; restore it first")
    return module


def update_fields(row, payload):
    values = payload.model_dump(exclude_unset=True)
    if any(value is None for key, value in values.items() if key != "video_url"):
        raise HTTPException(422, "Required fields cannot be null")
    for key, value in values.items():
        setattr(
            row, key, str(value) if key == "video_url" and value is not None else value
        )


def module_data(row: Module) -> ModuleResponse:
    return ModuleResponse(
        id=row.id,
        key=row.key,
        title=row.title,
        position=row.position,
        archived=row.archived,
    )


def lesson_data(row: Lesson) -> LessonResponse:
    return LessonResponse(
        id=row.id,
        module_id=row.module_id,
        key=row.key,
        title=row.title,
        body=row.body,
        video_url=row.video_url,
        position=row.position,
        archived=row.archived,
    )


def quiz_data(db: Session, quiz: Quiz, include_archived: bool = False) -> QuizResponse:
    query = select(Question).where(Question.quiz_id == quiz.id)
    if not include_archived:
        query = query.where(Question.archived.is_(False))
    questions = list(db.exec(query.order_by(Question.position)))
    result = []
    for question in questions:
        options = list(
            db.exec(
                select(AnswerOption)
                .where(AnswerOption.question_id == question.id)
                .order_by(AnswerOption.position)
            )
        )
        result.append(
            QuestionResponse(
                id=question.id,
                key=question.key,
                type=question.type,
                prompt=question.prompt,
                answer=question.expected_answer,
                archived=question.archived,
                options=[
                    OptionResponse(text=o.text, correct=o.is_correct) for o in options
                ]
                if options
                else None,
            )
        )
    return QuizResponse(
        id=quiz.id, module_id=quiz.module_id, archived=quiz.archived, questions=result
    )


def list_modules(db: Db, include_archived: bool = False) -> list[ModuleResponse]:
    return [module_data(row) for row in rows(db, Module, None, include_archived)]


def create_module(data: ModuleInput, db: Db) -> ModuleResponse:
    reject_archived_key(db, Module, data.key)
    row = Module(**data.model_dump(), position=next_position(db, Module))
    db.add(row)
    save(db)
    db.refresh(row)
    return module_data(row)


def order_modules(data: Order, db: Db) -> OrderResponse:
    reorder(db, Module, None, data.ids)
    save(db)
    return OrderResponse(ids=data.ids)


def read_module(module_id: int, db: Db) -> ModuleResponse:
    return module_data(get(db, Module, module_id))


def patch_module(module_id: int, data: ModulePatch, db: Db) -> ModuleResponse:
    row = get(db, Module, module_id)
    update_fields(row, data)
    db.add(row)
    save(db)
    db.refresh(row)
    return module_data(row)


def archive_module(module_id: int, db: Db):
    set_archived(db, Module, module_id, True)
    return Response(status_code=204)


def restore_module(module_id: int, db: Db) -> ModuleResponse:
    return module_data(set_archived(db, Module, module_id, False))


def list_lessons(
    module_id: int, db: Db, include_archived: bool = False
) -> list[LessonResponse]:
    get(db, Module, module_id)
    return [lesson_data(row) for row in rows(db, Lesson, module_id, include_archived)]


def create_lesson(module_id: int, data: LessonInput, db: Db) -> LessonResponse:
    require_active_module(db, module_id)
    reject_archived_key(db, Lesson, data.key, module_id)
    values = data.model_dump()
    if values["video_url"] is not None:
        values["video_url"] = str(values["video_url"])
    row = Lesson(
        module_id=module_id,
        **values,
        position=next_position(db, Lesson, module_id),
    )
    db.add(row)
    save(db)
    db.refresh(row)
    return lesson_data(row)


def order_lessons(module_id: int, data: Order, db: Db) -> OrderResponse:
    get(db, Module, module_id)
    reorder(db, Lesson, module_id, data.ids)
    save(db)
    return OrderResponse(ids=data.ids)


def read_lesson(lesson_id: int, db: Db) -> LessonResponse:
    return lesson_data(get(db, Lesson, lesson_id))


def patch_lesson(lesson_id: int, data: LessonPatch, db: Db) -> LessonResponse:
    row = get(db, Lesson, lesson_id)
    update_fields(row, data)
    db.add(row)
    save(db)
    db.refresh(row)
    return lesson_data(row)


def archive_lesson(lesson_id: int, db: Db):
    set_archived(db, Lesson, lesson_id, True)
    return Response(status_code=204)


def restore_lesson(lesson_id: int, db: Db) -> LessonResponse:
    return lesson_data(set_archived(db, Lesson, lesson_id, False))


def replace_questions(db, quiz, data):
    existing = {
        q.key: q for q in db.exec(select(Question).where(Question.quiz_id == quiz.id))
    }
    wanted = {question.key for question in data.questions}
    # Temporary positions must be beyond both the old and new ranges.
    offset = (
        max((q.position for q in existing.values()), default=-1)
        + len(data.questions)
        + 1
    )
    # Questions missing from the payload are archived, not deleted, so student
    # responses and the scores recorded with them stay intact.
    for key, question in existing.items():
        if key in wanted:
            question.position += offset
        question.archived = key not in wanted
        db.add(question)
    db.flush()
    # Archived questions keep their slot, so active ones fill the free slots.
    held = {q.position for key, q in existing.items() if key not in wanted}
    free_slots = (slot for slot in count() if slot not in held)
    for item in data.questions:
        q = existing.get(item.key) or Question(quiz_id=quiz.id, key=item.key)
        q.position, q.type, q.prompt, q.expected_answer = (
            next(free_slots),
            item.type,
            item.prompt,
            item.answer,
        )
        db.add(q)
        db.flush()
        existing_options = {
            option.key: option
            for option in db.exec(
                select(AnswerOption).where(AnswerOption.question_id == q.id)
            )
        }
        wanted_options = {
            chr(ord("a") + index) for index in range(len(item.options or []))
        }
        for key, option in existing_options.items():
            if key not in wanted_options:
                db.delete(option)
            else:
                option.is_correct = False
                db.add(option)
        db.flush()
        for index, option in enumerate(item.options or []):
            key = chr(ord("a") + index)
            row = existing_options.get(key) or AnswerOption(
                question_id=q.id, key=key, position=index
            )
            row.text = option.text
            row.is_correct = option.correct
            db.add(row)
    db.flush()


def create_quiz(module_id: int, data: QuizInput, db: Db) -> QuizResponse:
    require_active_module(db, module_id)
    existing = db.exec(select(Quiz).where(Quiz.module_id == module_id)).first()
    if existing:
        raise HTTPException(
            409,
            "Module has an archived quiz; restore it"
            if existing.archived
            else "Module already has a quiz",
        )
    quiz = Quiz(module_id=module_id)
    db.add(quiz)
    db.flush()
    replace_questions(db, quiz, data)
    save(db)
    return quiz_data(db, quiz)


def read_quiz(module_id: int, db: Db, include_archived: bool = False) -> QuizResponse:
    get(db, Module, module_id)
    quiz = db.exec(select(Quiz).where(Quiz.module_id == module_id)).first()
    if quiz is None or (quiz.archived and not include_archived):
        raise HTTPException(404, "Quiz not found")
    return quiz_data(db, quiz, include_archived)


def update_quiz(quiz_id: int, data: QuizInput, db: Db) -> QuizResponse:
    quiz = get(db, Quiz, quiz_id)
    replace_questions(db, quiz, data)
    save(db)
    return quiz_data(db, quiz)


def archive_quiz(quiz_id: int, db: Db):
    set_archived(db, Quiz, quiz_id, True)
    return Response(status_code=204)


def restore_quiz(quiz_id: int, db: Db) -> QuizResponse:
    return quiz_data(db, set_archived(db, Quiz, quiz_id, False))
