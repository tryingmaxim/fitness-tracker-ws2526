INSERT INTO exercises (name, category, muscle_groups, description, archived)
VALUES ('Bankdrücken', 'Freihantel', 'Brust, Trizeps, Schulter', 'Drücken der Langhantel von der Brust [...]', FALSE);

MERGE INTO training_plans (name, description)
KEY (name)
VALUES ('Push Day', 'Trainingsplan für Brust, Schulter und Trizeps.');
