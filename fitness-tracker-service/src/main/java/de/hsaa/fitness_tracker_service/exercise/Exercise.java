package de.hsaa.fitness_tracker_service.exercise;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "exercises", uniqueConstraints = @UniqueConstraint(columnNames = "name"))
public class Exercise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Eindeutiger Name der Übung
    @NotBlank
    @Column(nullable = false, unique = true)
    private String name;

    // Kategorie, z.B. "Freihantel", "Maschine", "Körpergewicht"
    @NotBlank
    @Column(nullable = false)
    private String category;

    // Optionale Beschreibung (z.B. Ausführungshinweise)
    @Column(length = 1000)
    private String description;

    // Muskelgruppen, z.B. "Brust, Trizeps"
    @NotBlank
    @Column(name = "muscle_groups", nullable = false)
    private String muscleGroups;

    // Soft-Delete: Übung bleibt für History referenzierbar, wird aber im UI ausgeblendet
    @Column(nullable = false)
    private boolean archived = false;

    public Exercise() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getMuscleGroups() {
        return muscleGroups;
    }

    public void setMuscleGroups(String muscleGroups) {
        this.muscleGroups = muscleGroups;
    }

    public boolean isArchived() {
        return archived;
    }

    public void setArchived(boolean archived) {
        this.archived = archived;
    }
}
