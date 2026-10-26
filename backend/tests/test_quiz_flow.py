import re

import pytest
from sqlmodel import select

from src.config import Settings
from src.models import Module, QuestionType
from src.seed import sync_content
from src.services.content_loader import load_content
from tests.helpers import add_module, add_question

IMAGE_LINK = re.compile(r"\]\((/api/content/[^)\s]+)\)")


@pytest.fixture
def course_content(db_session):
    """The repository's content/ loaded the way the deployment loads it."""
    records = load_content(Settings().content_dir)
    sync_content(db_session, records)
    return {record.key: record for record in records}


def answers_from(quiz, correct_text, typed):
    """Build a submission using only what the quiz endpoint returned."""
    submitted = []
    for question in quiz["questions"]:
        answer = {"question_id": question["id"], "type": question["type"]}
        if question["type"] == "multiple_choice":
            options = {option["text"]: option["id"] for option in question["options"]}
            answer["option_id"] = options[correct_text[question["id"]]]
        else:
            answer["text"] = typed[question["id"]]
        submitted.append(answer)
    return {"answers": submitted}


def test_ids_from_the_quiz_endpoint_work_in_a_submission(client, db_session):
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

    quiz = client.get(f"/api/modules/{module.id}/quiz").json()
    response = client.post(
        f"/api/quizzes/{quiz['id']}/submissions",
        json=answers_from(
            quiz,
            correct_text={choice.id: "Right"},
            typed={blank.id: " ANSWER ", essay.id: "My attempt"},
        ),
    )

    assert response.status_code == 200
    results = response.json()["results"]
    assert [r["question_id"] for r in results] == [q["id"] for q in quiz["questions"]]
    assert [r["correct"] for r in results] == [True, True, None]


def test_seeded_course_content_can_be_fetched_and_graded(
    client, db_session, course_content
):
    proofs = course_content["proofs"]
    module = db_session.exec(select(Module).where(Module.key == "proofs")).one()

    quiz = client.get(f"/api/modules/{module.id}/quiz").json()

    assert len(quiz["questions"]) == len(proofs.questions)
    correct_text, typed, by_position = {}, {}, {}
    for record, served in zip(proofs.questions, quiz["questions"], strict=True):
        assert served["prompt"] == record.prompt
        by_position[served["id"]] = record
        if record.type is QuestionType.MULTIPLE_CHOICE:
            correct_text[served["id"]] = next(
                o.text for o in record.options if o.is_correct
            )
        else:
            typed[served["id"]] = record.expected_answer
    response = client.post(
        f"/api/quizzes/{quiz['id']}/submissions",
        json=answers_from(quiz, correct_text, typed),
    )

    assert response.status_code == 200
    for result in response.json()["results"]:
        record = by_position[result["question_id"]]
        graded = record.type is not QuestionType.FREE_RESPONSE
        assert result["correct"] is (True if graded else None)
        assert result["correct_answer"] == (
            correct_text.get(result["question_id"]) or record.expected_answer
        )


def test_every_seeded_lesson_is_served_with_working_images(
    client, db_session, course_content
):
    images = 0
    for module in db_session.exec(select(Module)):
        record = course_content[module.key]
        detail = client.get(f"/api/modules/{module.id}").json()
        assert (detail["quiz_id"] is not None) == (record.questions is not None)
        lesson_ids = [lesson["id"] for lesson in detail["lessons"]]
        assert len(lesson_ids) == len(record.lessons)

        for index, lesson_id in enumerate(lesson_ids):
            response = client.get(f"/api/lessons/{lesson_id}")

            assert response.status_code == 200
            lesson = response.json()
            assert lesson["previous_lesson_id"] == (
                lesson_ids[index - 1] if index > 0 else None
            )
            assert lesson["next_lesson_id"] == (
                lesson_ids[index + 1] if index + 1 < len(lesson_ids) else None
            )
            for url in IMAGE_LINK.findall(lesson["body"]):
                images += 1
                assert client.get(url).status_code == 200, url

    assert images > 0
