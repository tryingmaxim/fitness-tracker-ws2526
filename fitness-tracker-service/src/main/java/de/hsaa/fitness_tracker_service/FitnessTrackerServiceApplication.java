package de.hsaa.fitness_tracker_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;

@SpringBootApplication
@EntityScan("de.hsaa.fitness_tracker_service")
public class FitnessTrackerServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(FitnessTrackerServiceApplication.class, args);
    }
}
