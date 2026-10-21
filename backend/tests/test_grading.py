import pytest

from src.models import AnswerOption, Question, QuestionType
from src.schemas.submission import SubmissionRequest
from src.services.grading import SubmissionError, grade_submission, normalize_text


def choice(question_id, position, correct_id):
    return Question(
        id=question_id,
        quiz_id=1,
        key=f"q{question_id}",
        type=QuestionType.MULTIPLE_CHOICE,
        prompt="Pick one",
        position=position,
        answer_options=[
            AnswerOption(
                id=option_id,
                question_id=question_id,
                key=str(option_id),
                text=f"option {option_id}",
                is_correct=option_id == correct_id,
                position=index,
            )
            for index, option_id in enumerate(
                range(question_id * 10 + 1, question_id * 10 + 4)
            )
        ],
    )


def text_question(question_id, position, question_type, expected):
    return Question(
        id=question_id,
        quiz_id=1,
        key=f"q{question_id}",
        type=question_type,
        prompt="Answer",
        expected_answer=expected,
        position=position,
    )


def submission(*answers):
    return SubmissionRequest.model_validate({"answers": list(answers)})


def mc(question_id, option_id):
    return {
        "question_id": question_id,
        "type": "multiple_choice",
        "option_id": option_id,
    }


def text(question_id, value, question_type="fill_in_blank"):
    return {"question_id": question_id, "type": question_type, "text": value}


@pytest.fixture
def quiz():
    return [
        choice(1, position=0, correct_id=12),
        text_question(2, 1, QuestionType.FILL_IN_BLANK, "Counter Example"),
        text_question(3, 2, QuestionType.FREE_RESPONSE, "Model answer."),
    ]


@pytest.mark.parametrize(("picked", "correct"), [(12, True), (11, False), (13, False)])
def test_multiple_choice_is_graded_by_selected_option(quiz, picked, correct):
    result = grade_submission(
        quiz,
        submission(mc(1, picked), text(2, "x"), text(3, "y", "free_response")),
    ).results[0]

    assert result.correct is correct
    assert result.correct_option_id == 12
    assert result.correct_answer == "option 12"


@pytest.mark.parametrize(
    "typed",
    ["counter example", "  COUNTER   Example ", "counter\texample\n"],
)
def test_fill_in_blank_ignores_case_and_whitespace(quiz, typed):
    result = grade_submission(
        quiz,
        submission(mc(1, 12), text(2, typed), text(3, "y", "free_response")),
    ).results[1]

    assert result.correct is True
    assert result.correct_answer == "Counter Example"
    assert result.correct_option_id is None


@pytest.mark.parametrize("typed", ["counterexample", "counter", ""])
def test_fill_in_blank_marks_other_text_incorrect(quiz, typed):
    result = grade_submission(
        quiz,
        submission(mc(1, 12), text(2, typed), text(3, "y", "free_response")),
    ).results[1]

    assert result.correct is False


def test_free_response_is_not_graded_but_returns_model_answer(quiz):
    result = grade_submission(
        quiz,
        submission(mc(1, 12), text(2, "x"), text(3, "Model answer.", "free_response")),
    ).results[2]

    assert result.correct is None
    assert result.correct_answer == "Model answer."


def test_results_follow_question_order_not_answer_order(quiz):
    result = grade_submission(
        list(reversed(quiz)),
        submission(text(3, "y", "free_response"), text(2, "x"), mc(1, 12)),
    )

    assert [item.question_id for item in result.results] == [1, 2, 3]


@pytest.mark.parametrize(
    "answers",
    [
        [mc(1, 12), text(2, "x")],
        [mc(1, 12), text(2, "x"), text(2, "x"), text(3, "y", "free_response")],
        [mc(1, 12), text(2, "x"), text(4, "y", "free_response")],
        [text(1, "x"), text(2, "x"), text(3, "y", "free_response")],
        [mc(1, 99), text(2, "x"), text(3, "y", "free_response")],
    ],
    ids=[
        "missing",
        "duplicate",
        "unknown-question",
        "wrong-type",
        "unknown-option",
    ],
)
def test_submission_that_does_not_match_the_quiz_is_rejected(quiz, answers):
    with pytest.raises(SubmissionError):
        grade_submission(quiz, submission(*answers))


def test_question_without_a_correct_option_is_a_server_error(quiz):
    for option in quiz[0].answer_options:
        option.is_correct = False

    with pytest.raises(RuntimeError, match="no correct option"):
        grade_submission(
            quiz,
            submission(mc(1, 12), text(2, "x"), text(3, "y", "free_response")),
        )


@pytest.mark.parametrize(
    ("raw", "expected"),
    [("  A  b\tC\n", "a b c"), ("", ""), ("$\\neg  p$", "$\\neg p$")],
)
def test_normalize_text(raw, expected):
    assert normalize_text(raw) == expected
