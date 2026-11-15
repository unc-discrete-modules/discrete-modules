import time
from uuid import uuid4

import pytest

from src.models import QuestionResponse, QuestionType, QuizAttempt, User
from tests.helpers import UNUSED_ID, add_module, add_question


@pytest.fixture
def quiz(db_session):
    module = add_module(db_session, 1_900_000_020, with_quiz=True)
    choice = add_question(
        db_session,
        module,
        0,
        QuestionType.MULTIPLE_CHOICE,
        options=[("Wrong", False, 0), ("Right", True, 1)],
    )
    blank = add_question(
        db_session, module, 1, QuestionType.FILL_IN_BLANK, expected="Answer"
    )
    essay = add_question(
        db_session, module, 2, QuestionType.FREE_RESPONSE, expected="Model."
    )
    db_session.refresh(module)
    options = {option.text: option.id for option in choice.answer_options}
    return {
        "module": module,
        "id": module.quiz.id,
        "choice": choice,
        "blank": blank,
        "essay": essay,
        "right": options["Right"],
        "wrong": options["Wrong"],
    }


def add_attempt(db_session, quiz, user_id, score, submitted_at, option="Right"):
    attempt = QuizAttempt(
        user_id=user_id,
        quiz_id=quiz["id"],
        score=score,
        max_score=2,
        submitted_at=submitted_at,
    )
    db_session.add(attempt)
    db_session.flush()
    for question, answer, correct in (
        (quiz["choice"], option, option == "Right"),
        (quiz["blank"], "typed", False),
        (quiz["essay"], "my essay", None),
    ):
        db_session.add(
            QuestionResponse(
                attempt_id=attempt.id,
                question_id=question.id,
                answer=answer,
                correct=correct,
            )
        )
    db_session.flush()
    return attempt


def other_user(db_session):
    user = User(
        issuer="urn:test",
        email=f"{uuid4().hex}@example.test",
        created_at=int(time.time()),
    )
    db_session.add(user)
    db_session.flush()
    return user


def test_attempts_are_listed_newest_first(client, db_session, signed_in_user, quiz):
    older = add_attempt(db_session, quiz, signed_in_user.id, 1, 100)
    newer = add_attempt(db_session, quiz, signed_in_user.id, 2, 200)

    response = client.get(f"/api/quizzes/{quiz['id']}/attempts")

    assert response.status_code == 200
    assert response.json() == [
        {"id": newer.id, "score": 2, "max_score": 2, "submitted_at": 200},
        {"id": older.id, "score": 1, "max_score": 2, "submitted_at": 100},
    ]


def test_list_excludes_other_users_attempts(client, db_session, quiz):
    add_attempt(db_session, quiz, other_user(db_session).id, 2, 100)

    response = client.get(f"/api/quizzes/{quiz['id']}/attempts")

    assert response.json() == []


def test_unknown_or_archived_quiz_has_no_attempts(client, db_session, quiz):
    quiz["module"].quiz.archived = True
    db_session.flush()

    for quiz_id in (quiz["id"], UNUSED_ID):
        response = client.get(f"/api/quizzes/{quiz_id}/attempts")
        assert response.status_code == 404


def test_attempt_detail_matches_the_feedback_view(
    client, db_session, signed_in_user, quiz
):
    attempt = add_attempt(db_session, quiz, signed_in_user.id, 1, 100)

    response = client.get(f"/api/quizzes/{quiz['id']}/attempts/{attempt.id}")

    assert response.status_code == 200
    assert response.json() == {
        "id": attempt.id,
        "score": 1,
        "max_score": 2,
        "submitted_at": 100,
        "answers": [
            {
                "question_id": quiz["choice"].id,
                "option_id": quiz["right"],
                "text": None,
            },
            {"question_id": quiz["blank"].id, "option_id": None, "text": "typed"},
            {"question_id": quiz["essay"].id, "option_id": None, "text": "my essay"},
        ],
        "result": {
            "results": [
                {
                    "question_id": quiz["choice"].id,
                    "correct": True,
                    "correct_answer": "Right",
                    "correct_option_id": quiz["right"],
                },
                {
                    "question_id": quiz["blank"].id,
                    "correct": False,
                    "correct_answer": "Answer",
                    "correct_option_id": None,
                },
                {
                    "question_id": quiz["essay"].id,
                    "correct": None,
                    "correct_answer": "Model.",
                    "correct_option_id": None,
                },
            ]
        },
    }


def test_detail_omits_questions_archived_since(
    client, db_session, signed_in_user, quiz
):
    attempt = add_attempt(db_session, quiz, signed_in_user.id, 1, 100)
    quiz["essay"].archived = True
    db_session.flush()

    body = client.get(f"/api/quizzes/{quiz['id']}/attempts/{attempt.id}").json()

    assert len(body["answers"]) == 2
    assert len(body["result"]["results"]) == 2


def test_detail_has_no_option_id_once_the_option_text_changed(
    client, db_session, signed_in_user, quiz
):
    attempt = add_attempt(db_session, quiz, signed_in_user.id, 0, 100, option="Removed")

    body = client.get(f"/api/quizzes/{quiz['id']}/attempts/{attempt.id}").json()

    assert body["answers"][0]["option_id"] is None
    assert body["result"]["results"][0]["correct"] is False


def test_detail_is_404_for_other_users_missing_or_foreign_attempts(
    client, db_session, quiz
):
    theirs = add_attempt(db_session, quiz, other_user(db_session).id, 2, 100)
    elsewhere = add_module(db_session, 1_900_000_021, with_quiz=True)
    db_session.refresh(elsewhere)

    for quiz_id, attempt_id in (
        (quiz["id"], theirs.id),
        (quiz["id"], UNUSED_ID),
        (elsewhere.quiz.id, theirs.id),
    ):
        response = client.get(f"/api/quizzes/{quiz_id}/attempts/{attempt_id}")
        assert response.status_code == 404
