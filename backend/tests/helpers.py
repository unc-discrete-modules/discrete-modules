from uuid import uuid4

from src.models import AnswerOption, Lesson, Module, Question, Quiz

UNUSED_ID = 2_000_000_000


def add_module(session, position, title="Sets", with_quiz=False, lessons=()):
    """Insert a module with the given (title, position) lessons."""
    module = Module(
        key=f"test-{uuid4().hex}",
        title=title,
        position=position,
    )
    session.add(module)
    session.flush()
    for lesson_title, lesson_position in lessons:
        session.add(
            Lesson(
                module_id=module.id,
                key=f"lesson-{uuid4().hex}",
                title=lesson_title,
                body="Body",
                position=lesson_position,
            )
        )
    if with_quiz:
        session.add(Quiz(module_id=module.id))
    session.flush()
    return module


def add_question(session, module, position, question_type, options=(), expected=None):
    """Insert a question; options are (text, is_correct, position) tuples."""
    question = Question(
        quiz_id=module.quiz.id,
        key=f"question-{uuid4().hex}",
        type=question_type,
        prompt=f"Prompt {position}",
        expected_answer=expected,
        position=position,
    )
    session.add(question)
    session.flush()
    for text, is_correct, option_position in options:
        session.add(
            AnswerOption(
                question_id=question.id,
                key=f"option-{uuid4().hex}",
                text=text,
                is_correct=is_correct,
                position=option_position,
            )
        )
    session.flush()
    return question
