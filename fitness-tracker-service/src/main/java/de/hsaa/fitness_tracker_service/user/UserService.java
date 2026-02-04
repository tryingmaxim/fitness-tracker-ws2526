package de.hsaa.fitness_tracker_service.user;

import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;

@Service
@Transactional
public class UserService {

	private final UserRepository repo;
	private final BCryptPasswordEncoder encoder;

	public UserService(UserRepository repo, BCryptPasswordEncoder encoder) {
		this.repo = repo;
		this.encoder = encoder;
	}

	public User register(UserController.RegisterRequest req) {
		String email = normalize(req.email()).toLowerCase();

		if (repo.existsByUsername(email)) {
			throw new DataIntegrityViolationException("email already registered");
		}

		User u = new User();
		u.setUsername(email);
		u.setFirstName(normalize(req.firstName()));
		u.setLastName(normalize(req.lastName()));
		u.setAge(req.age());
		u.setGender(normalize(req.gender()));
		u.setPassword(encoder.encode(req.password()));

		return repo.save(u);
	}

	@Transactional(readOnly = true)
	public User getMe() {
		return repo.findByUsername(getCurrentUsername())
				.orElseThrow(() -> new EntityNotFoundException("user not found"));
	}

	public User updateMe(UserController.UpdateMeRequest patch) {
		User u = getMe();

		if (patch.firstName() != null)
			u.setFirstName(normalize(patch.firstName()));
		if (patch.lastName() != null)
			u.setLastName(normalize(patch.lastName()));
		if (patch.age() != null)
			u.setAge(patch.age());
		if (patch.gender() != null)
			u.setGender(normalize(patch.gender()));

		return u;
	}

	private String getCurrentUsername() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth == null || !auth.isAuthenticated()) {
			throw new AccessDeniedException("Not authenticated");
		}
		String name = auth.getName();
		if (name == null || name.isBlank() || "anonymousUser".equalsIgnoreCase(name)) {
			throw new AccessDeniedException("Not authenticated");
		}
		return name;
	}

	private static String normalize(String s) {
		return s == null ? null : s.trim();
	}

	@Transactional(readOnly = true)
	public List<User> listAll() {
		return repo.findAll();
	}

}
