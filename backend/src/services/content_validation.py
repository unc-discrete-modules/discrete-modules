"""Validation and normalization shared by imported and edited content."""

import re

CODE_FENCE = re.compile(r"^\s*(```|~~~)")
MAX_OPTIONS = 26


def valid_option_count(count: int) -> bool:
    return 2 <= count <= MAX_OPTIONS


def has_one_correct(values) -> bool:
    return sum(values) == 1


def normalize_markdown(body: str) -> str:
    """Put the ``$$`` delimiters of display math on their own lines.

    Markdown math parsers only recognise a display block when both delimiters
    stand alone, so ``\\end{align*}$$`` leaves the block open and swallows the
    rest of the lesson. Converted slides and notes routinely write it that way,
    and the stored body must render regardless of how it was authored.
    """
    lines: list[str] = []
    in_code = in_math = False
    for line in body.split("\n"):
        text = line.strip()
        if CODE_FENCE.match(line):
            in_code = not in_code
        elif in_code:
            pass
        elif in_math and text.endswith("$$") and text != "$$":
            indent = line[: len(line) - len(line.lstrip())]
            lines += [line.rstrip()[:-2].rstrip(), f"{indent}$$"]
            in_math = False
            continue
        elif text == "$$":
            in_math = not in_math
        elif not in_math and text.startswith("$$") and text.count("$$") == 1:
            indent = line[: len(line) - len(line.lstrip())]
            lines += [f"{indent}$$", indent + text[2:].lstrip()]
            in_math = True
            continue
        lines.append(line)
    return "\n".join(lines)
