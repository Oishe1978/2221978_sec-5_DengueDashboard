"""Rules for new passwords (used at registration and when changing a password)."""


def validate_new_password(password: str, *, email: str = "", name: str = "") -> list[str]:
    """Return a list of problems; an empty list means the password is acceptable."""
    problems: list[str] = []
    if len(password) < 8:
        problems.append("The password must be at least 8 characters.")
    if len(password) > 128:
        problems.append("The password must be at most 128 characters.")
    if not any(c.isalpha() for c in password):
        problems.append("The password must contain a letter.")
    if not any(c.isdigit() for c in password):
        problems.append("The password must contain a digit.")
    lowered = password.lower()
    if email and lowered == email.strip().lower():
        problems.append("The password must not be the same as the email address.")
    if name and len(name.strip()) >= 3 and lowered == name.strip().lower():
        problems.append("The password must not be the same as the name.")
    return problems
