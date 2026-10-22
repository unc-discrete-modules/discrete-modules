"""Grade a quiz submission against loaded question rows."""

from collections.abc import Sequence

from src.models import Question, QuestionType
from src.schemas.submission import (
    MultipleChoiceAnswer,
    QuestionResult,
    SubmissionRequest,
    SubmissionResult,
)


class SubmissionError(ValueError):
    """The submission does not match the quiz, so it cannot be graded."""


def normalize_text(text: str) -> str:
    return " ".join(text.split()).casefold()


def grade_submission(
    questions: Sequence[Question], submission: SubmissionRequest
) -> SubmissionResult:
    """Grade every question; raise SubmissionError unless each is answered once.

    Takes loaded rows rather than a session so grading stays independent of
    the database. Callers must load each question's answer options.
    """
    by_id = {question.id: question for question in questions}
    answers = {answer.question_id: answer for answer in submission.answers}
    if len(answers) != len(submission.answers) or answers.keys() != by_id.keys():
        raise SubmissionError("Submit exactly one answer for each question in the quiz")

    results = []
    for question in sorted(questions, key=lambda item: item.position):
        answer = answers[question.id]
        if answer.type != question.type:
            expected_type = QuestionType(question.type).value
            raise SubmissionError(
                f"Answer {question.id} must be of type {expected_type}"
            )
        if isinstance(answer, MultipleChoiceAnswer):
            results.append(_grade_multiple_choice(question, answer))
        else:
            results.append(_grade_text(question, answer.text))
    return SubmissionResult(results=results)


def _grade_multiple_choice(
    question: Question, answer: MultipleChoiceAnswer
) -> QuestionResult:
    options = {option.id: option for option in question.answer_options}
    if answer.option_id not in options:
        raise SubmissionError(
            f"Option {answer.option_id} does not belong to question {question.id}"
        )
    correct = next((option for option in options.values() if option.is_correct), None)
    if correct is None:
        # The schema allows zero correct options; that is bad content, not a
        # bad submission, so it must not look like a client error.
        raise RuntimeError(f"Question {question.id} has no correct option")
    return QuestionResult(
        question_id=question.id,
        correct=answer.option_id == correct.id,
        correct_answer=correct.text,
        correct_option_id=correct.id,
    )


def _grade_text(question: Question, text: str) -> QuestionResult:
    expected = question.expected_answer
    # Free responses are not auto-graded in the MVP: students compare their
    # work with the model answer themselves.
    graded = question.type == QuestionType.FILL_IN_BLANK
    return QuestionResult(
        question_id=question.id,
        correct=normalize_text(text) == normalize_text(expected) if graded else None,
        correct_answer=expected,
    )
