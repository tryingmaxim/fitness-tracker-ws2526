# Fitness Tracker – Projektabschluss (Sprint 13)

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
- Übungen zu verwalten
- Trainingspläne anzulegen
- Trainingseinheiten durchzuführen
- Trainingsausführungen zu speichern und auszuwerten

---

## Technologie-Stack

### Backend
- Java 21
- Spring Boot 3.2.x
- Spring Security
- Spring Data JPA
- H2 In-Memory Datenbank
- Maven
- JaCoCo (Test Coverage)

### Frontend
- Angular (Production Build)
- Nginx (Auslieferung des Frontends)

### Deployment
- Docker
- Docker Compose

---

## Architekturüberblick
Die Anwendung folgt einer klassischen Drei-Schichten-Architektur:

- **Frontend (Angular)**  
  Stellt die Benutzeroberfläche bereit und kommuniziert über REST mit dem Backend.

- **Backend (Spring Boot)**  
  Enthält REST-Controller, Geschäftslogik (Services) und Persistenzschicht (JPA).

- **Datenbank (H2 In-Memory)**  
  Wird beim Start automatisch initialisiert und mit Seed-Daten befüllt.

Alle Komponenten laufen in **getrennten Docker-Containern** und kommunizieren ausschließlich über definierte Docker-Netzwerke.

---

## Systemvoraussetzungen
- Docker Desktop (inkl. Docker Compose)
- Git

Weitere Software oder IDEs sind **nicht erforderlich**, um die Anwendung zu starten.

---

## Startanleitung (ausschließlich über Docker Compose)

```bash
git clone https://github.com/tryingmaxim/fitness-tracker-ws2526.git
cd fitness-tracker-ws2526
docker compose up --build
```

## Systemvoraussetzungen
- Docker Desktop (inkl. Docker Compose)
- Git

Weitere Software oder IDEs sind **nicht erforderlich**, um die Anwendung zu starten.

---