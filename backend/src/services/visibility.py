"""Which content students may see.

An item is hidden when it is archived or sits under an archived module. Archiving
a module does not flag its lessons and quiz, so restoring it brings back exactly
what was visible before.
"""

from src.models import Lesson, Module, Question, Quiz


def is_visible(row: Module | Lesson | Quiz) -> bool:
    module = row if isinstance(row, Module) else row.module
    return not row.archived and not module.archived


def active_questions(quiz: Quiz) -> list[Question]:
    """Questions students see and answer, in quiz order."""
    return sorted(
        (question for question in quiz.questions if not question.archived),
        key=lambda question: question.position,
    )
