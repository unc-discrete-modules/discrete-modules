"""Fixed sample content behind the contract's stub routes."""

from src.schemas.lesson import Lesson

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
