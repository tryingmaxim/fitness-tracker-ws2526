<p align="center">
  <img width="720" src="./assets/logo.png" alt="Fitness Tracker Screenshot">
</p>

<h1 align="center"><b>Fitness Tracker</b></h1>
<h3 align="center"><b>Angular + Spring Boot Fitness-Tracker mit Docker Compose (WS 25/26)</b></h3>

<p align="center">
  Java 21 • Spring Boot • Angular • H2 • Docker Compose
  <br><br>
  <a href="https://www.oracle.com/de/java/technologies/downloads/#jdk21-windows">
    <img src="https://img.shields.io/badge/Java-21-blue.svg" alt="Java 21">
  </a>
  <a href="https://spring.io/projects/spring-boot">
    <img src="https://img.shields.io/badge/Spring%20Boot-3.2.5-brightgreen.svg" alt="Spring Boot 3.2.5">
  </a>
  <a href="https://angular.io/">
    <img src="https://img.shields.io/badge/Angular-Production-red.svg" alt="Angular">
  </a>
  <a href="https://docs.docker.com/compose/">
    <img src="https://img.shields.io/badge/Docker%20Compose-3.9-2496ED.svg" alt="Docker Compose">
  </a>
  <a href="#testing--build">
    <img src="https://img.shields.io/badge/Tests-JaCoCo%20gates-orange.svg" alt="JaCoCo gates">
  </a>
</p>


<p align="center">
  <a href="#startanleitung-ausschließlich-über-docker-compose"><b>Run</b></a> •
  <a href="#rest-api-dokumentation"><b>API</b></a> •
  <a href="#troubleshooting"><b>Troubleshooting</b></a>
</p>

<hr>



## Table of Contents

- [Projektübersicht](#projektübersicht)
- [Funktionsumfang](#funktionsumfang)
- [Technologie-Stack](#technologie-stack)
- [Architekturüberblick](#architekturüberblick)
- [Systemvoraussetzungen](#systemvoraussetzungen)
- [Startanleitung (ausschließlich über Docker Compose)](#startanleitung-ausschließlich-über-docker-compose)
- [Zugriffsinformationen](#zugriffsinformationen)
- [Vordefinierte Seed-Daten](#vordefinierte-seed-daten)
- [Projektstruktur](#projektstruktur)
- [Docker-Konfiguration](#docker-konfiguration)
- [Testing & Build](#testing--build)
- [REST API Dokumentation](#rest-api-dokumentation)
- [Troubleshooting](#troubleshooting)
- [Weiterentwicklung](#weiterentwicklung)
- [Codequalität & Clean Code](#codequalität--clean-code)
- [UI/UX](#uiux)
- [Lizenz](#lizenz)
- [Autoren](#autoren)

---


## Projektübersicht
Dieses Repository enthält eine webbasierte Fitness-Tracker-Anwendung, die im Rahmen des Moduls **Programmieren** entwickelt wurde.  
Die Anwendung kann **ohne zusätzliche Konfiguration ausschließlich über Docker Compose** gestartet und bewertet werden und hat den Charakter eines produktionsnahen Software-Releases.

Der Fokus dieses Sprints liegt auf:
- sauberem Docker-Deployment
- klarer Projektstruktur
- reproduzierbarem Start
- vollständiger Dokumentation

---

## Funktionsumfang
Die Anwendung ermöglicht es Nutzern:

- sich zu registrieren und anzumelden
- Übungen zu verwalten (erstellen, bearbeiten, archivieren)
- Trainingspläne anzulegen und zu konfigurieren
- Trainingseinheiten (Sessions) zu planen
- Trainingsausführungen durchzuführen und zu tracken
- Trainingshistorie einzusehen und auszuwerten
- Trainingsstreak (aufeinanderfolgende Trainingstage) zu verfolgen

---

## Technologie-Stack

### Backend
- Java 21
- Spring Boot 3.2.5
- Spring Security (Basic Authentication)
- Spring Data JPA
- H2 In-Memory Datenbank
- Maven 3.9
- JaCoCo (Test Coverage mit 80% Line / 70% Branch Coverage)
- Lombok

### Frontend
- Angular (Production Build)
- Nginx (Auslieferung des Frontends)
- Node.js 20

### Deployment
- Docker (Multi-Stage Builds)
- Docker Compose 3.9

---

## Architekturüberblick
Die Anwendung folgt einer klassischen Drei-Schichten-Architektur:

- **Frontend (Angular + Nginx)**  
  Stellt die Benutzeroberfläche bereit und kommuniziert über REST-API mit dem Backend.

- **Backend (Spring Boot)**  
  Enthält REST-Controller, Geschäftslogik (Services) und Persistenzschicht (JPA Repositories).

- **Datenbank (H2 In-Memory)**  
  Wird beim Start automatisch initialisiert und mit Seed-Daten aus `data.sql` befüllt.

Alle Komponenten laufen in **getrennten Docker-Containern** und kommunizieren ausschließlich über definierte Docker-Netzwerke.

---

## Systemvoraussetzungen
- **Docker Desktop** (inkl. Docker Compose)
- **Git**

> **Wichtig:** Weitere Software, IDEs oder lokale Installationen sind **nicht erforderlich**, um die Anwendung zu starten.

---

## Startanleitung (ausschließlich über Docker Compose)

### 1. Repository klonen
```bash
git clone https://github.com/tryingmaxim/fitness-tracker-ws2526.git
cd fitness-tracker-ws2526
```

### 2. Anwendung starten
```bash
docker compose up --build
```

> **Hinweis:** Beim ersten Start werden die Docker-Images gebaut, was 3-5 Minuten dauern kann. Die Anwendung ist bereit, sobald in den Logs `Started FitnessTrackerServiceApplication` erscheint.

### 3. Anwendung stoppen

Mit Strg+C oder in neuem Terminal:
```bash
docker compose down
```

---

## Zugriffsinformationen

Nach dem erfolgreichen Start mit `docker compose up` sind die Anwendungen unter folgenden URLs erreichbar:

### Frontend (Webanwendung)
- **URL:** http://localhost:8082
- **Container:** `fitness-tracker-frontend`
- **Port:** 8082 → 80 (intern)

### Backend (REST API)
- **URL:** http://localhost:8081
- **Container:** `fitness-tracker-backend`
- **Port:** 8081
- **Base Path:** `/api/v1`

### H2 Datenbank-Konsole
- **URL:** http://localhost:8081/h2-console

**Verbindungseinstellungen für die H2 Console:**
```
JDBC URL:      jdbc:h2:mem:ftdb;DB_CLOSE_DELAY=-1;MODE=LEGACY
Benutzername:  sa
Passwort:      (leer)
```

---

## Vordefinierte Seed-Daten

Beim Start der Anwendung werden automatisch Beispieldaten aus `data.sql` geladen.

### Benutzer

| Benutzername              | Passwort       | Vorname | Nachname | Alter | Geschlecht |
|---------------------------|----------------|---------|----------|-------|------------|
| gruppe8@gmail.com         | passwort123    | Gruppe  | 8        | 33    | d          |
| alice.klein@gmail.com     |     | Alice   | Klein    | 21    | w          |
| bob.troll@gmail.com       |     | Bob     | Troll    | 45    | m          |

> **Hinweis:** Die Passwörter sind mit BCrypt gehasht (`$2a$10$...`) und dienen ausschließlich zu Test- und Bewertungszwecken.

---

### Übungen

Die Datenbank enthält vordefinierte Übungen mit folgenden Eigenschaften:

**Beispiel: Bankdrücken**
- **Name:** Bankdrücken
- **Kategorie:** Freihantel
- **Muskelgruppen:** Brust, Trizeps, Schulter
- **Beschreibung:** Drücken der Langhantel von der Brust [...]
- **Archiviert:** Nein

---

### Trainingspläne

**Beispiel: Push Day**
- **Name:** Push Day
- **Beschreibung:** Trainingsplan für Brust, Schulter und Trizeps

Alle Trainingspläne können über die H2-Console eingesehen werden:
```sql
SELECT * FROM training_plans;
```

---

## Projektstruktur

```
fitness-tracker-service/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   ├── de.hsaa.fitness_tracker_service
│   │   │   ├── de.hsaa.fitness_tracker_service.common              # Shared Code (DTOs, Exceptions, Utils)
│   │   │   ├── de.hsaa.fitness_tracker_service.config              # Allgemeine Konfiguration
│   │   │   ├── de.hsaa.fitness_tracker_service.security            # Spring Security / Auth
│   │   │   ├── de.hsaa.fitness_tracker_service.user                # Benutzer & Registrierung
│   │   │   ├── de.hsaa.fitness_tracker_service.exercise            # Übungen
│   │   │   ├── de.hsaa.fitness_tracker_service.trainingsPlan       # Trainingspläne
│   │   │   ├── de.hsaa.fitness_tracker_service.trainingsSession    # Trainingseinheiten (Sessions)
│   │   │   ├── de.hsaa.fitness_tracker_service.trainingsSessionDay # Tage innerhalb einer Session
│   │   │   ├── de.hsaa.fitness_tracker_service.execution           # Geplante Übungen
│   │   │   └── de.hsaa.fitness_tracker_service.trainingExecution   # Trainingsausführungen (Tracking/Historie)
│   │   │
│   │   └── resources/
│   │       ├── application.properties                              # Spring-Konfiguration
│   │       └── data.sql                                             # Seed-Daten
│   │
│   └── test/
│       └── java/
│           ├── de.hsaa.fitness_tracker_service                      # Basis-Tests (ApplicationTests)
│           ├── de.hsaa.fitness_tracker_service.execution
│           ├── de.hsaa.fitness_tracker_service.exercise
│           ├── de.hsaa.fitness_tracker_service.security
│           ├── de.hsaa.fitness_tracker_service.trainingExecution
│           ├── de.hsaa.fitness_tracker_service.trainingsPlan
│           ├── de.hsaa.fitness_tracker_service.trainingsSession
│           └── de.hsaa.fitness_tracker_service.user
│
├── Dockerfile
├── pom.xml
├── mvnw
└── mvnw.cmd

fitness-tracker-web/                                         # Angular Frontend + Nginx
├── Dockerfile                                               # Multi-Stage Build (Node -> Nginx)
├── nginx.conf                                               # Nginx Konfiguration (SPA Routing + API Proxy)
├── angular.json                                             # Angular Workspace Konfiguration
├── package.json                                             # Dependencies & Scripts
└── projects/
    └── fitness-tracker-app/                                 # Hauptanwendung
        ├── proxy.conf.json                                  # Dev-Proxy für lokale Entwicklung
        └── src/
            ├── main.ts                                      # Angular Bootstrap (Standalone)
            └── app/
                ├── app.routes.ts                            # Zentrales Routing
                ├── layout-public/                           # Öffentliche Seiten (Login, Register, Info)
                ├── layout-private/                          # Geschützter App-Bereich nach Login
                ├── pages/                                   # Fachliche Seiten (Dashboard, Übungen, Pläne, Training)
                └── services/                                # API-Services, Auth Guard & HTTP Interceptor
```

> **Hinweis:** Build-Artefakte (`target/`, `dist/`, `node_modules/`) sind nicht im Repository enthalten.

---

## Docker-Konfiguration

### Multi-Stage Builds

Beide Container nutzen **Multi-Stage Builds** für optimale Image-Größen:

**Backend (fitness-tracker-service/Dockerfile):**
1. **Build-Stage:** Maven 3.9 + JDK 21 → JAR-Build mit Tests
2. **Runtime-Stage:** JRE 21 → nur JAR-Ausführung

**Frontend (fitness-tracker-web/Dockerfile):**
1. **Build-Stage:** Node.js 20 → Production Build (`ng build`)
2. **Runtime-Stage:** Nginx Alpine → statische Dateien ausliefern

### Docker Compose

Die `docker-compose.yml` definiert:
- **Netzwerk:** Automatisch erstelltes Bridge-Netzwerk
- **Services:** `backend`, `frontend`
- **Port-Mappings:** 8081 (Backend), 8082 (Frontend)
- **Dependencies:** Frontend wartet auf Backend

---

## Testing & Build

Das Backend wird mit dem **Maven Wrapper (`mvnw`)** gebaut und vollständig automatisiert getestet.
Eine lokale Maven-Installation ist **nicht erforderlich**.

### Was passiert beim Build?

- Alle bestehenden Unit-Tests werden ausgeführt
- Die Testabdeckung wird mit **JaCoCo** gemessen
- Der Build schlägt fehl, wenn die definierte Mindest-Coverage nicht erreicht wird

### Konfigurierte Coverage-Limits (pom.xml)

- **Line Coverage:** Mindestens **80%** für alle `*Service*`-Klassen
- **Branch Coverage:** Mindestens **70%** für alle `*Service*`-Klassen

Ausgeschlossen von Coverage-Checks:
- Controller (`*Controller*`)
- Repositories (`*Repository*`)
- Konfigurationen (`*Config*`)
- Main-Klasse (`*Application*`)

---

## Lokaler Build & Tests (optional)

> **Wichtig:** Für die Bewertung ist dies **nicht erforderlich**. Die Anwendung läuft vollständig über Docker Compose.

### Voraussetzungen

Für den lokalen Build wird **Java 21 (JDK)** benötigt.

Java 21 kann hier heruntergeladen werden:  
https://www.oracle.com/de/java/technologies/downloads/#jdk21-windows

Nach der Installation sollte sich der **Installationspfad gemerkt** werden, z. B.:
```
C:\Program Files\Java\jdk-21.0.10
```

### Java-Version prüfen

Vor dem Build sollte überprüft werden, ob Java 21 aktiv ist:

```bash
java -version
```

Die Ausgabe sollte `java version "21.x.x"` anzeigen.

---

### Build & Tests ausführen (Windows PowerShell)

Zuerst sicherstellen, dass Maven den korrekten Java-Pfad verwendet:

```powershell
$env:JAVA_HOME="C:\Program Files\Java\jdk-21.0.10"
$env:Path="$env:JAVA_HOME\bin;$env:Path"
.\mvnw -v
```

> ⚠️ **Wichtig:** Falls Java an einem anderen Ort installiert ist, muss der Pfad entsprechend angepasst werden.

Anschließend den Build starten:
```powershell
cd fitness-tracker-service
.\mvnw clean verify
```

### Ablauf während des Builds

Während des Builds werden automatisch:

1. Alle Dependencies heruntergeladen
2. Quellcode kompiliert
3. Unit-Tests ausgeführt
4. JaCoCo-Coverage-Daten gesammelt
5. Coverage-Regeln geprüft (80% Line / 70% Branch)
6. JAR-Datei erstellt (`target/*.jar`)

Bei erfolgreichen Tests wird eine lauffähige JAR-Datei im `target/`-Verzeichnis erstellt.

---

### JaCoCo Coverage Report

Nach einem erfolgreichen Build befindet sich der HTML-Report unter:
```
fitness-tracker-service/target/site/jacoco/index.html
```

Der Report zeigt detaillierte Coverage-Statistiken für:
- Packages
- Klassen
- Methoden
- Zeilen (Lines)
- Verzweigungen (Branches)

---

## REST API Dokumentation

Die Backend-API folgt **RESTful-Prinzipien** und verwendet JSON für Request/Response-Bodies.

### Authentifizierung

Die API verwendet **Basic Authentication**. Für geschützte Endpoints muss der `Authorization`-Header gesetzt werden:

```
Authorization: Basic <base64(username:password)>
```

**Beispiel:**
```bash
# Login als gruppe8@gmail.com:passwort123
curl -u gruppe8@gmail.com:passwort123 http://localhost:8081/api/v1/users/me
```

---

### API-Endpunkte (Übersicht)

**Base URL:** `http://localhost:8081/api/v1`

#### Benutzer (`/users`)

| Methode | Endpoint          | Beschreibung                      | Auth |
|---------|-------------------|-----------------------------------|------|
| POST    | `/users/register` | Neuen Benutzer registrieren       | ❌   |
| GET     | `/users/me`       | Aktuellen Benutzer abrufen        | ✅   |
| PUT     | `/users/me`       | Eigenes Profil aktualisieren      | ✅   |
| GET     | `/users`          | Alle Benutzer auflisten (Admin)   | ✅   |

#### Übungen (`/exercises`)

| Methode | Endpoint           | Beschreibung                     | Auth |
|---------|--------------------|----------------------------------|------|
| GET     | `/exercises`       | Alle aktiven Übungen auflisten   | ❌   |
| GET     | `/exercises/{id}`  | Übung nach ID abrufen            | ❌   |
| POST    | `/exercises`       | Neue Übung erstellen             | ✅   |
| PUT     | `/exercises/{id}`  | Übung vollständig aktualisieren  | ✅   |
| PATCH   | `/exercises/{id}`  | Übung teilweise aktualisieren    | ✅   |
| DELETE  | `/exercises/{id}`  | Übung archivieren (Soft-Delete)  | ✅   |

#### Trainingspläne (`/training-plans`)

| Methode | Endpoint                 | Beschreibung                         | Auth |
|---------|--------------------------|--------------------------------------|------|
| GET     | `/training-plans`        | Alle Trainingspläne auflisten        | ❌   |
| GET     | `/training-plans/{id}`   | Trainingsplan nach ID abrufen        | ❌   |
| POST    | `/training-plans`        | Neuen Trainingsplan erstellen        | ✅   |
| PUT     | `/training-plans/{id}`   | Trainingsplan vollständig ändern     | ✅   |
| PATCH   | `/training-plans/{id}`   | Trainingsplan teilweise ändern       | ✅   |
| DELETE  | `/training-plans/{id}`   | Trainingsplan löschen                | ✅   |

#### Trainingseinheiten / Sessions (`/training-sessions`)

| Methode | Endpoint                                          | Beschreibung                              | Auth |
|---------|---------------------------------------------------|-------------------------------------------|------|
| GET     | `/training-sessions`                              | Alle Sessions auflisten                   | ❌   |
| GET     | `/training-sessions?planId={id}`                  | Sessions eines Plans auflisten            | ❌   |
| GET     | `/training-sessions/{id}`                         | Session nach ID abrufen                   | ❌   |
| POST    | `/training-sessions`                              | Neue Session erstellen                    | ✅   |
| PUT     | `/training-sessions/{id}`                         | Session vollständig aktualisieren         | ✅   |
| PATCH   | `/training-sessions/{id}`                         | Session teilweise aktualisieren           | ✅   |
| DELETE  | `/training-sessions/{id}`                         | Session löschen                           | ✅   |
| GET     | `/training-sessions/{sessionId}/executions`       | Geplante Übungen einer Session auflisten  | ❌   |
| POST    | `/training-sessions/{sessionId}/executions`       | Geplante Übung zur Session hinzufügen     | ✅   |
| PATCH   | `/training-sessions/{sessionId}/executions/{id}`  | Geplante Übung aktualisieren              | ✅   |
| DELETE  | `/training-sessions/{sessionId}/executions/{id}`  | Geplante Übung entfernen                  | ✅   |

#### Trainingsausführungen (`/training-executions`)

| Methode | Endpoint                                  | Beschreibung                          | Auth |
|---------|-------------------------------------------|---------------------------------------|------|
| POST    | `/training-executions`                    | Training starten                      | ✅   |
| GET     | `/training-executions/{id}`               | Trainingsausführung abrufen           | ✅   |
| GET     | `/training-executions?sessionId={id}`     | Ausführungen einer Session abrufen    | ✅   |
| GET     | `/training-executions`                    | Alle Trainingsausführungen auflisten  | ✅   |
| PUT     | `/training-executions/{id}/exercises`     | Übungsausführung aktualisieren        | ✅   |
| POST    | `/training-executions/{id}/complete`      | Training abschließen                  | ✅   |
| DELETE  | `/training-executions/{id}`               | Training abbrechen                    | ✅   |
| GET     | `/training-executions/stats/streak`       | Trainingsstreak abrufen               | ✅   |

---

### Request-/Response-Beispiele

#### Benutzer registrieren

**Request:**
```http
POST http://localhost:8081/api/v1/users/register
Content-Type: application/json

{
  "firstName": "Max",
  "lastName": "Mustermann",
  "email": "max@example.com",
  "password": "sicher123",
  "age": 25,
  "gender": "m"
}
```

**Response:**
```json
{
  "id": 4,
  "username": "max@example.com",
  "email": "max@example.com",
  "firstName": "Max",
  "lastName": "Mustermann",
  "age": 25,
  "gender": "m"
}
```

#### Übung erstellen

**Request:**
```http
POST http://localhost:8081/api/v1/exercises
Authorization: Basic Z3J1cHBlOEBnbWFpbC5jb206cGFzc3dvcnQxMjM=
Content-Type: application/json

{
  "name": "Kreuzheben",
  "category": "Freihantel",
  "muscleGroups": "Rücken, Beine, Core",
  "description": "Heben der Langhantel vom Boden",
  "archived": false
}
```

#### Training starten

**Request:**
```http
POST http://localhost:8081/api/v1/training-executions
Authorization: Basic Z3J1cHBlOEBnbWFpbC5jb206cGFzc3dvcnQxMjM=
Content-Type: application/json

{
  "sessionId": 1
}
```

**Response:**
```json
{
  "id": 1,
  "sessionId": 1,
  "sessionName": "Push Session",
  "planName": "Push Day",
  "status": "IN_PROGRESS",
  "startedAt": "2025-01-28T14:30:00",
  "completedAt": null,
  "executedExercises": [...]
}
```

---

## Troubleshooting

### Fehler: `Port 8081 is already in use`

**Ursache:**  
Ein anderer Prozess nutzt bereits Port 8081 oder 8082.

**Lösung (Windows PowerShell):**
```powershell
# Port-Nutzung prüfen
netstat -ano | findstr :8081

# Prozess beenden (PID durch tatsächliche ID ersetzen)
taskkill /PID <PID> /F
```

**Lösung (Linux/Mac):**
```bash
# Port-Nutzung prüfen
lsof -i :8081

# Prozess beenden
kill -9 <PID>
```

---

### Fehler: `invalid flag: --release`

**Ursache:**  
Maven wird mit einer **älteren Java-Version** ausgeführt.

**Lösung:**
1. Sicherstellen, dass **Java 21** installiert ist  
2. `JAVA_HOME` korrekt setzen (siehe Abschnitt *Lokaler Build & Tests*)  
3. Terminal **neu öffnen**  
4. Java-Version erneut prüfen:

```bash
.\mvnw -v
```

Die Ausgabe sollte `Java version: 21.x.x` enthalten.

---

###  Docker-Container startet nicht

**Lösung:**

1. Alle Container stoppen und entfernen:
```bash
docker compose down
```

2. Docker-Images neu bauen:
```bash
docker compose up --build
```

3. Bei persistierenden Problemen auch Volumes löschen:
```bash
docker compose down -v
```

4. Docker-Cache leeren (falls notwendig):
```bash
docker system prune -a
```

---

###  Frontend zeigt "Cannot connect to backend"

**Prüfungen:**

1. **Backend-Container läuft:**
```bash
docker ps
```

Sollte `fitness-tracker-backend` anzeigen.

2. **Backend ist erreichbar:**
```bash
curl http://localhost:8081/api/v1/exercises
```

3. **Nginx-Konfiguration prüfen:**
Datei `fitness-tracker-web/nginx.conf` sollte korrekt auf Backend verweisen.

---

###  Logs anzeigen

Um Fehler zu diagnostizieren, können die Container-Logs angezeigt werden:

```bash
# Alle Logs anzeigen
docker compose logs

# Nur Backend-Logs
docker compose logs backend

# Nur Frontend-Logs
docker compose logs frontend

# Logs live verfolgen
docker compose logs -f

# Letzte 50 Zeilen
docker compose logs --tail=50
```

---

###  H2-Console zeigt "Database not found"

**Lösung:**

Sicherstellen, dass die JDBC URL **exakt** so lautet:
```
jdbc:h2:mem:ftdb;DB_CLOSE_DELAY=-1;MODE=LEGACY
```

**Häufige Fehler:**
- Falsche URL (z.B. `jdbc:h2:mem:testdb`)
- Fehlende Parameter (`DB_CLOSE_DELAY`, `MODE`)
- Leerzeichen in der URL

---

## Weiterentwicklung

### Lokale Entwicklung ohne Docker

Für die lokale Entwicklung können Backend und Frontend auch unabhängig gestartet werden:

**Backend:**
```powershell
cd fitness-tracker-service
.\mvnw spring-boot:run
```

**Frontend:**
```bash
cd fitness-tracker-web
npm install
npm start
# oder: ng serve
```

Das Frontend ist dann unter `http://localhost:4200` erreichbar.

---

### Neue Tests hinzufügen

Unit-Tests sollten im Verzeichnis `src/test/java` abgelegt werden und der Namenskonvention `*Test.java` folgen.

**Beispiel für einen Service-Test:**
```java
    @Test
    void registerShouldThrowWhenEmailAlreadyRegistered() {
        when(repo.existsByUsername("bob@test.de")).thenReturn(true);

        UserController.RegisterRequest req =
                new UserController.RegisterRequest(
                        "Bob",
                        "Troll",
                        "  bob@test.de ",
                        "pw",
                        30,
                        "m"
                );

        assertThrows(DataIntegrityViolationException.class, () -> service.register(req));

        verify(repo).existsByUsername("bob@test.de");
        verify(repo, never()).save(any());
        verify(encoder, never()).encode(anyString());
    }
```

---

### Environment Variables

Die Anwendung verwendet keine externen Environment Variables oder `.env`-Dateien.
Alle Konfigurationen sind in `application.properties` definiert.

**Wichtige Konfigurationen:**
- Server-Port: `8081`
- H2-Console: aktiviert
- JDBC URL: `jdbc:h2:mem:ftdb`
- Security: Basic Auth aktiviert

Sensible Daten (wie Passwort-Hashes) werden nicht im Quellcode hartcodiert, sondern über `data.sql` zur Laufzeit initialisiert.

---

## Codequalität & Clean Code

Das Projekt folgt **Clean Code Prinzipien**:

- **Einheitliche Namenskonventionen:** CamelCase für Klassen, camelCase für Methoden
- **Sprechende Methodennamen:** `createExercise()`, `updateTrainingPlan()`
- **Single Responsibility:** Jede Klasse hat eine klar definierte Aufgabe
- **DRY (Don't Repeat Yourself):** Keine Code-Duplikation
- **Kein toter Code:** Nicht verwendeter Code wurde entfernt
- **Validierung:** Request-DTOs nutzen Jakarta Bean Validation
- **Exception Handling:** Zentrale Exception-Handler für saubere Fehlermeldungen

---

## UI/UX

Die Webanwendung bietet:

- **Intuitiven Ablauf:** Klare Navigation zwischen Übungen, Plänen und Trainings
- **Aussagekräftige Fehlermeldungen:** 
  - "Benutzername existiert bereits" statt "Fehler 409"
  - "Übung nicht gefunden (ID: 123)" statt "Not Found"
  - "Passwort muss mindestens 8 Zeichen lang sein"
- **Responsive Design:** Nutzbar auf Desktop und mobilen Geräten
- **Feedback:** Erfolgsmeldungen bei Aktionen (z.B. "Training erfolgreich gespeichert")

---

## Lizenz

Dieses Projekt wurde im Rahmen einer akademischen Lehrveranstaltung erstellt und dient ausschließlich zu Bildungszwecken.

---

## Autoren

- **Gruppe 8** – Modul Programmieren (WS 2025/26)

---
