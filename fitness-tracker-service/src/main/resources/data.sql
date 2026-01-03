INSERT INTO exercises (name, category, muscle_groups, description, archived)
VALUES ('Bankdrücken', 'Freihantel', 'Brust, Trizeps, Schulter', 'Drücken der Langhantel von der Brust [...]', FALSE);

MERGE INTO training_plans (name, description)
KEY (name)
VALUES ('Push Day', 'Trainingsplan für Brust, Schulter und Trizeps.');

INSERT INTO users (id, username, password, first_name, last_name, age, gender) VALUES
 (1, 'gruppe8@gmail.com', '$2a$10$Ty0A1YiuK0ggkRxzfy2aWOUMm4p4dq7f3H6byhHBQFRkmvwzgfun2', 'Gruppe', '8', 33 , 'd'),
 (2, 'alice.klein@gmail.com', '$2a$10$7wQyqfW5Z8uY3c3R8Y4nEe8p9w1pV2g5EJc8pW2yKZp6kL3sXoZ0e', 'Alice', 'Klein', 21 , 'w'),
 (3, 'bob.troll@gmail.com', '$2a$10$7wQyqfW5Z8uY3c3R8Y4nEe8p9w1pV2g5EJc8pW2yKZp6kL3sXoZ0e','Bob', 'Troll',  45 , 'm' );


