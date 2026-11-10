import pytest
from fastapi.testclient import TestClient
from sqlmodel import select

from src.database import get_db_session
from src.main import create_app
from src.models import Question, QuestionResponse, QuestionType, QuizAttempt
from tests.helpers import UNUSED_ID, add_module, add_question


@pytest.fixture
def quiz(db_session):
    module = add_module(db_session, 1_900_000_010, with_quiz=True)
    choice = add_question(
        db_session,
        module,
        0,
        QuestionType.MULTIPLE_CHOICE,
        options=[("Wrong", False, 0), ("Right", True, 1)],
    )
    blank = add_question(
        db_session, module, 1, QuestionType.FILL_IN_BLANK, expected="Counter Example"
    )
    essay = add_question(
        db_session, module, 2, QuestionType.FREE_RESPONSE, expected="Model answer."
    )
    db_session.refresh(module)
    options = {option.text: option.id for option in choice.answer_options}
    return {
        "id": module.quiz.id,
        "choice": choice.id,
        "blank": blank.id,
        "essay": essay.id,
        "right": options["Right"],
        "wrong": options["Wrong"],
    }


def body(quiz, option="right", blank="counter  example", essay="My attempt."):
    return {
        "answers": [
            {
                "question_id": quiz["choice"],
                "type": "multiple_choice",
                "option_id": quiz[option],
            },
            {"question_id": quiz["blank"], "type": "fill_in_blank", "text": blank},
            {"question_id": quiz["essay"], "type": "free_response", "text": essay},
        ]
    }


def submit(client, quiz, payload):
    return client.post(f"/api/quizzes/{quiz['id']}/submissions", json=payload)


def test_correct_answers_are_graded_with_the_answer_key(client, quiz):
    response = submit(client, quiz, body(quiz))

    assert response.status_code == 200
    assert response.json()["results"] == [
        {
            "question_id": quiz["choice"],
            "correct": True,
            "correct_answer": "Right",
            "correct_option_id": quiz["right"],
        },
        {
            "question_id": quiz["blank"],
            "correct": True,
            "correct_answer": "Counter Example",
            "correct_option_id": None,
        },
        {
            "question_id": quiz["essay"],
            "correct": None,
            "correct_answer": "Model answer.",
            "correct_option_id": None,
        },
    ]


def test_wrong_answers_are_marked_incorrect(client, quiz):
    results = submit(client, quiz, body(quiz, option="wrong", blank="other")).json()[
        "results"
    ]

    assert [result["correct"] for result in results] == [False, False, None]
    assert results[0]["correct_option_id"] == quiz["right"]


def test_unknown_quiz_is_404(client, quiz):
    response = client.post(f"/api/quizzes/{UNUSED_ID}/submissions", json=body(quiz))

    assert response.status_code == 404
    assert response.json()["error"] == {
        "code": "not_found",
        "message": f"Quiz {UNUSED_ID} not found",
        "details": None,
    }


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        ("missing", "Missing answers for questions {essay}"),
        ("duplicate", "More than one answer for questions {blank}"),
        ("unknown", "Not in this quiz: questions {unknown}"),
        ("wrong_type", "Answer {choice} must be of type multiple_choice"),
        ("foreign_option", "Option {unknown} does not belong to question {choice}"),
    ],
)
def test_submission_that_does_not_fit_the_quiz_is_422(client, quiz, mutate, message):
    payload = body(quiz)
    answers = payload["answers"]
    quiz = {**quiz, "unknown": UNUSED_ID}
    if mutate == "missing":
        answers.pop()
    elif mutate == "duplicate":
        answers.append(answers[1])
    elif mutate == "unknown":
        answers[2]["question_id"] = UNUSED_ID
        answers.append({**answers[2], "question_id": quiz["essay"]})
    elif mutate == "wrong_type":
        answers[0] = {
            "question_id": quiz["choice"],
            "type": "fill_in_blank",
            "text": "x",
        }
    else:
        answers[0]["option_id"] = UNUSED_ID

    response = submit(client, quiz, payload)

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert error["message"] == message.format(**quiz)


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"answers": []},
        {"answers": [{"question_id": 1, "type": "essay", "text": "x"}]},
        {
            "answers": [
                {"question_id": 1, "type": "free_response", "text": "x" * 10_001}
            ]
        },
    ],
    ids=["no-answers-key", "empty", "unknown-type", "oversized-text"],
)
def test_malformed_submission_lists_field_errors(client, quiz, payload):
    response = submit(client, quiz, payload)

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert {"loc", "msg", "type"} <= error["details"][0].keys()


def test_quiz_without_a_correct_option_is_a_json_500(client, db_session):
    module = add_module(db_session, 1_900_000_011, with_quiz=True)
    broken = add_question(
        db_session,
        module,
        0,
        QuestionType.MULTIPLE_CHOICE,
        options=[("A", False, 0), ("B", False, 1)],
    )
    db_session.refresh(module)
    option_id = broken.answer_options[0].id
    payload = {
        "answers": [
            {
                "question_id": broken.id,
                "type": "multiple_choice",
                "option_id": option_id,
            }
        ]
    }

    response = client.post(f"/api/quizzes/{module.quiz.id}/submissions", json=payload)

    assert response.status_code == 500
    assert response.json() == {
        "error": {
            "code": "internal_error",
            "message": "Internal server error",
            "details": None,
        }
    }


def attempts(db_session, quiz):
    return db_session.exec(
        select(QuizAttempt).where(QuizAttempt.quiz_id == quiz["id"])
    ).all()


def stored_responses(db_session, attempt):
    rows = db_session.exec(
        select(QuestionResponse).where(QuestionResponse.attempt_id == attempt.id)
    )
    return {row.question_id: row for row in rows}


def test_submission_records_attempt_and_responses(
    client, db_session, signed_in_user, quiz
):
    assert submit(client, quiz, body(quiz)).status_code == 200

    (attempt,) = attempts(db_session, quiz)
    assert attempt.user_id == signed_in_user.id
    # The free response is stored but never scored.
    assert (attempt.score, attempt.max_score) == (2, 2)
    stored = stored_responses(db_session, attempt)
    assert set(stored) == {quiz["choice"], quiz["blank"], quiz["essay"]}
    assert (stored[quiz["choice"]].answer, stored[quiz["choice"]].correct) == (
        "Right",
        True,
    )
    assert stored[quiz["blank"]].answer == "counter  example"
    assert (stored[quiz["essay"]].answer, stored[quiz["essay"]].correct) == (
        "My attempt.",
        None,
    )


def test_score_counts_only_correct_graded_answers(client, db_session, quiz):
    assert (
        submit(client, quiz, body(quiz, option="wrong", blank="no")).status_code == 200
    )

    (attempt,) = attempts(db_session, quiz)
    assert (attempt.score, attempt.max_score) == (0, 2)


def test_each_submission_is_a_separate_attempt(client, db_session, quiz):
    submit(client, quiz, body(quiz))
    submit(client, quiz, body(quiz, option="wrong"))

    first, second = sorted(attempts(db_session, quiz), key=lambda row: row.id)
    assert (first.score, second.score) == (2, 1)


def test_failed_submissions_record_nothing(client, db_session, quiz):
    incomplete = body(quiz)
    incomplete["answers"].pop()

    assert submit(client, quiz, incomplete).status_code == 422
    missing = client.post("/api/quizzes/2000000000/submissions", json=body(quiz))
    assert missing.status_code == 404
    assert attempts(db_session, quiz) == []


def test_archived_question_is_not_recorded(client, db_session, quiz):
    db_session.get(Question, quiz["essay"]).archived = True
    db_session.flush()
    payload = body(quiz)
    payload["answers"].pop()

    assert submit(client, quiz, payload).status_code == 200
    (attempt,) = attempts(db_session, quiz)
    assert set(stored_responses(db_session, attempt)) == {
        quiz["choice"],
        quiz["blank"],
    }


def test_signed_out_submission_is_rejected_and_records_nothing(db_session, quiz):
    app = create_app()
    app.dependency_overrides[get_db_session] = lambda: db_session
    with TestClient(app, raise_server_exceptions=False) as anonymous:
        response = submit(anonymous, quiz, body(quiz))

    assert response.status_code == 401
    assert attempts(db_session, quiz) == []
