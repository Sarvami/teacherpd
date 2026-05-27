"""
Seed script — creates sample teachers in PostgreSQL and generates their
profile embeddings in ChromaDB.

Run once after the DB is set up:
    python seed.py
"""

from app.db.database import SessionLocal, Teacher, create_tables
from app.services.embeddings import upsert_teacher_profile

SAMPLE_TEACHERS = [
    {
        "name": "Priya Sharma",
        "age": 32,
        "gender": "Female",
        "highest_qualification": "B.Ed",
        "years_of_experience": 8,
        "school": "Greenfield Primary",
        "school_type": "government",
        "school_location": "rural",
        "state": "Maharashtra",
        "district": "Pune",
        "subjects_taught": "Mathematics",
        "grades_taught": "Grade 3, Grade 4",
        "instruction_language": "Marathi",
        "biggest_challenge": "Students struggle with word problems — they can compute but can't apply concepts to real situations.",
        "coaching_language": "English",
    },
    {
        "name": "James Okafor",
        "age": 41,
        "gender": "Male",
        "highest_qualification": "M.Sc Education",
        "years_of_experience": 15,
        "school": "Riverside Secondary",
        "school_type": "private",
        "school_location": "urban",
        "state": "Maharashtra",
        "district": "Mumbai",
        "subjects_taught": "Science",
        "grades_taught": "Grade 9, Grade 10",
        "instruction_language": "English",
        "biggest_challenge": "Keeping students engaged during theory-heavy lessons before lab sessions.",
        "coaching_language": "English",
    },
    {
        "name": "Amara Diallo",
        "age": 28,
        "gender": "Female",
        "highest_qualification": "B.Ed",
        "years_of_experience": 3,
        "school": "Greenfield Primary",
        "school_type": "government",
        "school_location": "rural",
        "state": "Maharashtra",
        "district": "Pune",
        "subjects_taught": "English Language Arts",
        "grades_taught": "Grade 3, Grade 4",
        "instruction_language": "English",
        "biggest_challenge": "Many students are first-generation English learners — bridging home language and classroom language.",
        "coaching_language": "English",
    },
    {
        "name": "Lena Fischer",
        "age": 45,
        "gender": "Female",
        "highest_qualification": "M.Ed",
        "years_of_experience": 20,
        "school": "Westside High",
        "school_type": "private",
        "school_location": "urban",
        "state": "Maharashtra",
        "district": "Nagpur",
        "subjects_taught": "Mathematics",
        "grades_taught": "Grade 9, Grade 10",
        "instruction_language": "English",
        "biggest_challenge": "Differentiating for a wide ability range in the same classroom.",
        "coaching_language": "English",
    },
    {
        "name": "Carlos Mendez",
        "age": 35,
        "gender": "Male",
        "highest_qualification": "B.A. Education",
        "years_of_experience": 10,
        "school": "Eastview Middle",
        "school_type": "aided",
        "school_location": "semi-urban",
        "state": "Maharashtra",
        "district": "Nashik",
        "subjects_taught": "Social Studies, History",
        "grades_taught": "Grade 6, Grade 7",
        "instruction_language": "Hindi",
        "biggest_challenge": "Students don't see the relevance of history to their daily lives.",
        "coaching_language": "Hindi",
    },
]


def main():
    create_tables()
    db = SessionLocal()
    try:
        for data in SAMPLE_TEACHERS:
            existing = db.query(Teacher).filter(Teacher.name == data["name"]).first()
            if existing:
                print(f"  Skipping {data['name']} (already exists)")
                continue

            teacher = Teacher(**data)
            db.add(teacher)
            db.commit()
            db.refresh(teacher)

            upsert_teacher_profile(
                teacher_id=teacher.id,
                grade=teacher.grades_taught,
                subject=teacher.subjects_taught,
                themes=[],
                metadata={
                    "name": teacher.name,
                    "school": teacher.school or "",
                    "school_type": teacher.school_type or "",
                    "school_location": teacher.school_location or "",
                    "state": teacher.state or "",
                    "district": teacher.district or "",
                    "instruction_language": teacher.instruction_language or "",
                    "coaching_language": teacher.coaching_language or "English",
                },
            )
            print(f"  Created teacher: {teacher.name} (id={teacher.id})")
    finally:
        db.close()

    print("Seed complete.")


if __name__ == "__main__":
    main()
