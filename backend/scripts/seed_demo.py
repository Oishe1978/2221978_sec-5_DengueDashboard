"""Create the demo accounts, sample watch items and one shared team with mixed permissions.

Run from the backend folder:
    DEMO_PASSWORD='YourDemoPassw0rd' python -m scripts.seed_demo        (macOS / Linux)
    $env:DEMO_PASSWORD='YourDemoPassw0rd'; python -m scripts.seed_demo  (Windows PowerShell)

It is safe to run twice: existing accounts and items are kept. The password is read from the
environment and is never stored in the repository.
"""

import os
import sys

from sqlmodel import Session, select

from app.auth.models import User
from app.auth.passwords import hash_password
from app.auth.policy import validate_new_password
from app.database import create_db_and_tables, engine
from app.teams.models import Team, TeamItem, TeamMember
from app.watchlist.models import WatchItem

ACCOUNTS = [  # (name, email, role)
    ("Demo Admin One", "admin1@dengue-demo.test", "admin"),
    ("Demo Admin Two", "admin2@dengue-demo.test", "admin"),
    ("Demo User Alice", "alice@dengue-demo.test", "user"),
    ("Demo User Bob", "bob@dengue-demo.test", "user"),
    ("Demo User Carol", "carol@dengue-demo.test", "user"),
]

WATCH = {"alice@dengue-demo.test": [("Dhaka", 400), ("Chattogram", 150)], "bob@dengue-demo.test": [("Sylhet", 60)]}


def main() -> None:
    password = os.getenv("DEMO_PASSWORD", "")
    problems = validate_new_password(password)
    if problems:
        sys.exit("Set DEMO_PASSWORD to a valid password first: " + " ".join(problems))

    create_db_and_tables()
    with Session(engine) as db:
        users: dict[str, User] = {}
        for name, email, role in ACCOUNTS:
            user = db.exec(select(User).where(User.email == email)).first()
            if user is None:
                user = User(name=name, email=email, role=role, password_hash=hash_password(password))
                db.add(user)
                db.commit()
                db.refresh(user)
                print(f"created {role:5} {email}")
            users[email] = user

        for email, rows in WATCH.items():
            for division, threshold in rows:
                exists = db.exec(select(WatchItem).where(WatchItem.owner_id == users[email].id, WatchItem.division == division)).first()
                if not exists:
                    db.add(WatchItem(owner_id=users[email].id, division=division, threshold=threshold, note="demo data"))
        db.commit()

        alice, bob, carol = (users[f"{n}@dengue-demo.test"] for n in ("alice", "bob", "carol"))
        team = db.exec(select(Team).where(Team.name == "Dhaka Response Team", Team.owner_id == alice.id)).first()
        if team is None:
            team = Team(name="Dhaka Response Team", owner_id=alice.id)
            db.add(team)
            db.flush()
            # the owner (alice) has no team_member row: she can do everything by being the owner
            db.add(TeamMember(team_id=team.id, user_id=bob.id, can_create=True, can_update=True, can_assign=False))
            db.add(TeamMember(team_id=team.id, user_id=carol.id))  # view only
            db.add(TeamItem(team_id=team.id, division="Dhaka", threshold=400, note="demo data", created_by=alice.id, assigned_to=bob.id))
            db.commit()
            print("created team 'Dhaka Response Team'")
    print("Done.")


if __name__ == "__main__":
    main()
