from uuid import uuid4

import pytest
from sqlalchemy import CheckConstraint, UniqueConstraint, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import configure_mappers
from sqlmodel import Session

from src.models import (
    AnswerOption,
    Lesson,
    ModelBase,
    Module,
    Question,
    QuestionType,
    Quiz,
)


def create_module() -> Module:
    unique_value = uuid4()
    return Module(
        key=f"test-{unique_value.hex}",
        title="Sets",
        description="An introduction to sets.",
        position=unique_value.int % 2_000_000_000,
    )


def test_models_register_expected_tables_and_relationships():
    configure_mappers()

    assert set(ModelBase.metadata.tables) == {
        "answer_options",
        "lessons",
        "modules",
        "questions",
        "quizzes",
    }
    assert Module.lessons.property.back_populates == "module"
    assert Module.quiz.property.uselist is False
    assert Question.answer_options.property.back_populates == "question"


def test_question_types_match_api_contract():
    assert {question_type.value for question_type in QuestionType} == {
        "multiple_choice",
        "fill_in_blank",
        "free_response",
    }


def test_metadata_contains_ordering_answer_and_identity_constraints():
    question_constraints = {
        constraint.name
        for constraint in Question.__table__.constraints
        if isinstance(constraint, (CheckConstraint, UniqueConstraint))
    }
    lesson_constraints = {
        constraint.name
        for constraint in Lesson.__table__.constraints
        if isinstance(constraint, (CheckConstraint, UniqueConstraint))
    }

    assert {
        "ck_questions_expected_answer",
        "ck_questions_position_nonnegative",
        "ck_questions_type",
        "uq_questions_quiz_id_key",
        "uq_questions_quiz_id_position",
    } <= question_constraints
    assert {
        "ck_lessons_position_nonnegative",
        "uq_lessons_module_id_key",
        "uq_lessons_module_id_position",
    } <= lesson_constraints
    assert {index.name for index in AnswerOption.__table__.indexes} == {
        "uq_answer_options_one_correct_per_question"
    }


def test_quiz_is_unique_per_module(db_session: Session):
    module = create_module()
    db_session.add(module)
    db_session.flush()
    db_session.add_all([Quiz(module_id=module.id), Quiz(module_id=module.id)])

    with pytest.raises(IntegrityError):
        db_session.flush()


@pytest.mark.parametrize("duplicate_field", ["key", "position"])
def test_lesson_keys_and_positions_are_unique_within_module(
    db_session: Session,
    duplicate_field: str,
):
    module = create_module()
    db_session.add(module)
    db_session.flush()
    second_key = "notation" if duplicate_field == "key" else "operations"
    second_position = 0 if duplicate_field == "position" else 1
    db_session.add_all(
        [
            Lesson(
                module_id=module.id,
                key="notation",
                title="Notation",
                body="First lesson",
                position=0,
            ),
            Lesson(
                module_id=module.id,
                key=second_key,
                title="Operations",
                body="Second lesson",
                position=second_position,
            ),
        ]
    )

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_positions_cannot_be_negative(db_session: Session):
    module = create_module()
    module.position = -1
    db_session.add(module)

    with pytest.raises(IntegrityError):
        db_session.flush()


@pytest.mark.parametrize(
    ("question_type", "expected_answer"),
    [
        (QuestionType.MULTIPLE_CHOICE, "an answer must not be stored here"),
        (QuestionType.FILL_IN_BLANK, None),
        (QuestionType.FREE_RESPONSE, None),
    ],
)
def test_question_type_controls_expected_answer(
    db_session: Session,
    question_type: QuestionType,
    expected_answer: str | None,
):
    module = create_module()
    quiz = Quiz(module=module)
    db_session.add(
        Question(
            quiz=quiz,
            key="invalid-answer",
            type=question_type,
            prompt="Prompt",
            expected_answer=expected_answer,
            position=0,
        )
    )

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_only_one_answer_option_can_be_correct(db_session: Session):
    module = create_module()
    question = Question(
        quiz=Quiz(module=module),
        key="membership",
        type=QuestionType.MULTIPLE_CHOICE,
        prompt="Which symbol means membership?",
        position=0,
    )
    question.answer_options = [
        AnswerOption(key="a", text="∈", is_correct=True, position=0),
        AnswerOption(key="b", text="⊆", is_correct=True, position=1),
    ]
    db_session.add(question)

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_deleting_module_cascades_to_all_content(db_session: Session):
    module = create_module()
    module.lessons = [Lesson(key="notation", title="Notation", body="Body", position=0)]
    question = Question(
        key="membership",
        type=QuestionType.MULTIPLE_CHOICE,
        prompt="Which symbol means membership?",
        position=0,
        answer_options=[AnswerOption(key="a", text="∈", is_correct=True, position=0)],
    )
    module.quiz = Quiz(questions=[question])
    db_session.add(module)
    db_session.flush()
    module_id = module.id
    lesson_id = module.lessons[0].id
    quiz_id = module.quiz.id
    question_id = question.id
    answer_option_id = question.answer_options[0].id

    db_session.exec(delete(Module).where(Module.id == module_id))
    db_session.flush()
    db_session.expire_all()

    assert db_session.get(Module, module_id) is None
    assert db_session.get(Lesson, lesson_id) is None
    assert db_session.get(Quiz, quiz_id) is None
    assert db_session.get(Question, question_id) is None
    assert db_session.get(AnswerOption, answer_option_id) is None
