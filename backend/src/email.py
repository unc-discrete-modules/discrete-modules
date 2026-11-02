def validate_email(value: str) -> str:
    email = value.strip()
    if (
        not email
        or len(email) > 320
        or email.count("@") != 1
        or any(c.isspace() or ord(c) < 32 for c in email)
        or not all(email.split("@"))
    ):
        raise ValueError("Invalid email")
    return email
