package de.hsaa.fitness_tracker_service.user;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    public record RegisterRequest(
            @NotBlank String firstName,
            @NotBlank String lastName,
            @NotBlank @Email String email,
            @NotBlank String password,
            @NotNull @Min(12) Integer age,
            String gender
    ) {}

    public record UpdateMeRequest(
            String firstName,
            String lastName,
            Integer age,
            String gender
    ) {}

    public record UserResponse(
            Long id,
            String username,
            String email,
            String firstName,
            String lastName,
            Integer age,
            String gender
    ) {}

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest body, UriComponentsBuilder uri) {
        User saved = service.register(body);
        var location = uri.path("/api/v1/users/{id}").buildAndExpand(saved.getId()).toUri();
        return ResponseEntity.created(location).body(toDto(saved));
    }

    @GetMapping("/me")
    public UserResponse me() {
        return toDto(service.getMe());
    }

    @PutMapping("/me")
    public UserResponse updateMe(@RequestBody UpdateMeRequest body) {
        return toDto(service.updateMe(body));
    }

    private static UserResponse toDto(User u) {
        return new UserResponse(
                u.getId(),
                u.getUsername(),
                u.getUsername(),
                u.getFirstName(),
                u.getLastName(),
                u.getAge(),
                u.getGender()
        );
    }
    
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public List<UserResponse> listAll() {
        return service.listAll().stream().map(UserController::toDto).toList();
    }
}
