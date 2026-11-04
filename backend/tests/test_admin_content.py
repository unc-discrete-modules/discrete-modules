from src.services.auth import AuthenticatedUser, require_user


def admin(client):
    client.app.dependency_overrides[require_user] = lambda: AuthenticatedUser(
        1, "admin@example.unc.edu", "admin", "csrf", "hash"
    )


def test_admin_content_crud_and_order(client):
    assert client.get("/api/admin/modules").status_code == 403
    admin(client)

    def create(key):
        response = client.post(
            "/api/admin/modules",
            json={"key": key, "title": key, "description": "Description"},
        )
        assert response.status_code == 201, response.text
        return response.json()["id"]

    existing_ids = [row["id"] for row in client.get("/api/admin/modules").json()]
    a, b = create("a"), create("b")
    conflict = client.post(
        "/api/admin/modules", json={"key": "a", "title": "A", "description": "D"}
    )
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "conflict"
    assert (
        client.put(
            "/api/admin/modules/order", json={"ids": [b, a, *existing_ids]}
        ).status_code
        == 200
    )
    assert [x["id"] for x in client.get("/api/admin/modules").json()] == [
        b,
        a,
        *existing_ids,
    ]
    assert (
        client.put("/api/admin/modules/order", json={"ids": [a, a]}).status_code == 422
    )
    lesson = client.post(
        f"/api/admin/modules/{a}/lessons",
        json={"key": "intro", "title": "Intro", "body": "Body"},
    )
    assert lesson.status_code == 201, lesson.text
    lesson_id = lesson.json()["id"]
    assert (
        client.patch(
            f"/api/admin/lessons/{lesson_id}", json={"body": "Updated"}
        ).json()["body"]
        == "Updated"
    )
    assert client.delete(f"/api/admin/modules/{a}").status_code == 204
    assert client.get(f"/api/admin/lessons/{lesson_id}").status_code == 404
    assert client.get("/api/admin/modules").json()[0]["position"] == 0


def test_quiz_replace_and_validate(client):
    admin(client)
    module = client.post(
        "/api/admin/modules", json={"key": "quiz", "title": "Quiz", "description": "D"}
    ).json()
    question = {
        "key": "first",
        "type": "multiple_choice",
        "prompt": "Pick",
        "options": [{"text": "A", "correct": True}, {"text": "B"}],
    }
    result = client.post(
        f"/api/admin/modules/{module['id']}/quiz", json={"questions": [question]}
    )
    assert result.status_code == 201, result.text
    quiz = result.json()
    question_id = quiz["questions"][0]["id"]
    student_quiz = client.get(f"/api/modules/{module['id']}/quiz").json()
    option_ids = [o["id"] for o in student_quiz["questions"][0]["options"]]
    question["prompt"] = "Updated"
    result = client.put(
        f"/api/admin/quizzes/{quiz['id']}", json={"questions": [question]}
    )
    assert result.status_code == 200, result.text
    assert result.json()["questions"][0]["id"] == question_id
    student_quiz = client.get(f"/api/modules/{module['id']}/quiz").json()
    assert [o["id"] for o in student_quiz["questions"][0]["options"]] == option_ids
    submission = client.post(
        f"/api/quizzes/{quiz['id']}/submissions",
        json={
            "answers": [
                {
                    "question_id": question_id,
                    "type": "multiple_choice",
                    "option_id": option_ids[0],
                }
            ]
        },
    )
    assert submission.status_code == 200, submission.text
    assert (
        client.get(f"/api/modules/{module['id']}/quiz")
        .json()["questions"][0]
        .get("answer")
        is None
    )
    question["options"][0]["correct"] = False
    assert (
        client.put(
            f"/api/admin/quizzes/{quiz['id']}", json={"questions": [question]}
        ).status_code
        == 422
    )
    assert (
        client.get(f"/api/admin/modules/{module['id']}/quiz").json()["questions"][0][
            "prompt"
        ]
        == "Updated"
    )
    assert client.delete(f"/api/admin/quizzes/{quiz['id']}").status_code == 204


def test_quiz_replacement_reorders_and_preserves_retained_ids(client):
    admin(client)
    module = client.post(
        "/api/admin/modules",
        json={"key": "reorder", "title": "Quiz", "description": "D"},
    ).json()

    def question(key):
        return {"key": key, "type": "free_response", "prompt": key, "answer": "answer"}

    response = client.post(
        f"/api/admin/modules/{module['id']}/quiz",
        json={"questions": [question("a"), question("b"), question("removed")]},
    )
    assert response.status_code == 201
    quiz = response.json()
    original_ids = {q["key"]: q["id"] for q in quiz["questions"]}
    response = client.put(
        f"/api/admin/quizzes/{quiz['id']}",
        json={"questions": [question("b"), question("new"), question("a")]},
    )
    assert response.status_code == 200, response.text
    questions = response.json()["questions"]
    assert [q["key"] for q in questions] == ["b", "new", "a"]
    assert questions[0]["id"] == original_ids["b"]
    assert questions[2]["id"] == original_ids["a"]


def test_admin_response_schemas_are_documented():
    from src.main import create_app

    paths = create_app().openapi()["paths"]
    module_schema = paths["/api/admin/modules"]["post"]["responses"]["201"]["content"][
        "application/json"
    ]["schema"]
    quiz_schema = paths["/api/admin/modules/{module_id}/quiz"]["get"]["responses"][
        "200"
    ]["content"]["application/json"]["schema"]
    assert module_schema["$ref"].endswith("/ModuleResponse")
    assert quiz_schema["$ref"].endswith("/QuizResponse")


def test_lesson_order_delete_and_normalize(client):
    admin(client)
    module = client.post(
        "/api/admin/modules",
        json={"key": "lessons", "title": "Lessons", "description": "D"},
    ).json()
    base = f"/api/admin/modules/{module['id']}/lessons"
    ids = []
    for key in ("one", "two", "three"):
        response = client.post(
            base, json={"key": key, "title": key, "body": "$$x\n+y$$"}
        )
        assert response.status_code == 201, response.text
        assert response.json()["body"] == "$$\nx\n+y\n$$"
        ids.append(response.json()["id"])
    assert client.put(f"{base}/order", json={"ids": ids[::-1]}).status_code == 200
    assert client.delete(f"/api/admin/lessons/{ids[1]}").status_code == 204
    lessons = client.get(base).json()
    assert [(item["id"], item["position"]) for item in lessons] == [
        (ids[2], 0),
        (ids[0], 1),
    ]


def test_module_update_and_quiz_delete(client):
    admin(client)
    module = client.post(
        "/api/admin/modules",
        json={"key": "edit", "title": "Before", "description": "D"},
    ).json()
    updated = client.patch(
        f"/api/admin/modules/{module['id']}", json={"title": "After"}
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "After"
    quiz = client.post(
        f"/api/admin/modules/{module['id']}/quiz",
        json={
            "questions": [
                {
                    "key": "q",
                    "type": "fill_in_blank",
                    "prompt": "Answer?",
                    "answer": "yes",
                }
            ]
        },
    ).json()
    assert client.delete(f"/api/admin/quizzes/{quiz['id']}").status_code == 204
    assert client.get(f"/api/admin/modules/{module['id']}/quiz").status_code == 404
