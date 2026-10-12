"""Fixed sample content behind the contract's stub routes."""

from src.models import QuestionType
from src.schemas.lesson import Lesson
from src.schemas.quiz import (
    AnswerOption,
    FillInBlankQuestion,
    FreeResponseQuestion,
    MultipleChoiceQuestion,
    Quiz,
)
from src.schemas.submission import (
    MultipleChoiceAnswer,
    QuestionResult,
    SubmissionRequest,
    SubmissionResult,
)

LESSONS = {
    1: Lesson(
        id=1,
        title="Propositions",
        body="A **proposition** is a statement that is true or false, e.g. $p \\to q$.",
        next_lesson_id=2,
    ),
    2: Lesson(
        id=2,
        title="Implications",
        body="The contrapositive of $p \\to q$ is $\\neg q \\to \\neg p$.",
        video_url="https://example.com/videos/implications",
        previous_lesson_id=1,
    ),
    3: Lesson(id=3, title="Set basics", body="A set is an unordered collection."),
}

# Only module 1 has a quiz, so the quiz route's 404 path is reachable.
QUIZZES = {
    1: Quiz(
        id=1,
        questions=[
            MultipleChoiceQuestion(
                id=1,
                type=QuestionType.MULTIPLE_CHOICE,
                prompt="Which statement is a proposition?",
                options=[
                    AnswerOption(id=1, text="What time is it?"),
                    AnswerOption(id=2, text="2 + 2 = 4"),
                    AnswerOption(id=3, text="Close the door."),
                ],
            ),
            FillInBlankQuestion(
                id=2,
                type=QuestionType.FILL_IN_BLANK,
                prompt="$\\neg q \\to \\neg p$ is the ____ of $p \\to q$.",
            ),
            FreeResponseQuestion(
                id=3,
                type=QuestionType.FREE_RESPONSE,
                prompt="Explain why $p \\to q$ is true when $p$ is false.",
            ),
        ],
    )
}
QUIZ_BY_MODULE = {1: 1}

_CORRECT_OPTION = {1: 2}
_EXPECTED_TEXT = {
    2: "contrapositive",
    3: "The implication only makes a claim when p is true.",
}


def grade(quiz: Quiz, submission: SubmissionRequest) -> SubmissionResult:
    """Grade a submission; raise ValueError unless every question is answered once."""
    questions = {q.id: q for q in quiz.questions}
    answers = {a.question_id: a for a in submission.answers}
    if len(answers) != len(submission.answers) or answers.keys() != questions.keys():
        raise ValueError("Submit exactly one answer for each question in the quiz")

    results = []
    for question_id, question in questions.items():
        answer = answers[question_id]
        if answer.type != question.type:
            raise ValueError(f"Answer {question_id} must be of type {question.type}")
        if isinstance(answer, MultipleChoiceAnswer):
            correct_id = _CORRECT_OPTION[question_id]
            option_text = next(o.text for o in question.options if o.id == correct_id)
            results.append(
                QuestionResult(
                    question_id=question_id,
                    correct=answer.option_id == correct_id,
                    correct_answer=option_text,
                    correct_option_id=correct_id,
                )
            )
            continue
        expected = _EXPECTED_TEXT[question_id]
        graded = question.type == QuestionType.FILL_IN_BLANK
        results.append(
            QuestionResult(
                question_id=question_id,
                correct=answer.text.strip().lower() == expected if graded else None,
                correct_answer=expected,
            )
        )
    return SubmissionResult(results=results)
