INSERT INTO exercises (name, category, muscle_groups, description)
VALUES ('Bankdrücken', 'Freihantel', 'Brust, Trizeps, Schulter', 'Drücken der Langhantel von der Brust [...]');

MERGE INTO training_plans (name, description)
KEY (name)
VALUES ('Push Day', 'Trainingsplan für Brust, Schulter und Trizeps.');
