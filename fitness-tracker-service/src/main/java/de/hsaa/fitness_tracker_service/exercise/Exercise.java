package de.hsaa.fitness_tracker_service.exercise;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

//@Entity zeigt an,dass diese Klasse eine Tabelle in der Datenbank darstellt
@Entity
//@Table legt den Tabellennamen und den eindeutigen Namen-Constraint fest
@Table(name = "exercises", uniqueConstraints = @UniqueConstraint(columnNames = "name"))
public class Exercise {

	// @Id kennzeichnet das Primärschlüssel-Feld
	// @GeneratedValue sorgt dafür,dass die ID automatisch hochgezählt wird
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	// @NotBlank bedeutet,dass das Feld nicht leer sein darf
	// @Column gibt an,dass es in der DB-Spalte einen NOT NULL und UNIQUE Constraint gibt
	@NotBlank
	@Column(nullable = false, unique = true)
	private String name;

	// @NotBlank=Pflichtfeld für die Kategorie,z.B. Freihantel oder Körpergewicht
	@NotBlank
	@Column(nullable = false)
	private String category;

	// @Column(length=1000) erlaubt bis zu 1000 Zeichen für optionale Beschreibung
	@Column(length = 1000)
	private String description;

	// @NotBlank=Pflichtfeld,damit immer angegeben ist,welche Muskelgruppen trainiert werden
	// @Column(name="muscle_groups") legt den genauen Spaltennamen in der DB fest
	@NotBlank
	@Column(name = "muscle_groups", nullable = false)
	private String muscleGroups;

	// Leerer Standardkonstruktor wird von JPA benötigt
	public Exercise() {
	}

	// Getter und Setter für alle Felder,damit Spring Daten automatisch lesen/schreiben kann
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
}
