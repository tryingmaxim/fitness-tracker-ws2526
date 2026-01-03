package de.hsaa.fitness_tracker_service.user;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock UserRepository repo;
    @Mock BCryptPasswordEncoder encoder;

    @InjectMocks UserService service;

    @AfterEach
    void cleanupSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private void setAuth(Authentication auth) {
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private Authentication auth(String name, boolean authenticated) {
        Authentication a = mock(Authentication.class);
        when(a.isAuthenticated()).thenReturn(authenticated);
        when(a.getName()).thenReturn(name);
        return a;
    }

    @Test
    void registerShouldSaveUserWithNormalizedLowercasedEmailAndHashedPassword() {
        when(repo.existsByUsername("alice@test.de")).thenReturn(false);
        when(encoder.encode("pw")).thenReturn("HASH");

        // Reihenfolge: firstName, lastName, email, password, age, gender
        UserController.RegisterRequest req =
                new UserController.RegisterRequest(
                        "  Alice  ",
                        "  Klein ",
                        "  Alice@Test.de  ",
                        "pw",
                        21,
                        "  weiblich "
                );

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        when(repo.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

        User saved = service.register(req);

        assertNotNull(saved);

        User u = captor.getValue();
        assertEquals("alice@test.de", u.getUsername());  // trimmed + lower
        assertEquals("Alice", u.getFirstName());         // trimmed
        assertEquals("Klein", u.getLastName());          // trimmed
        assertEquals(21, u.getAge());
        assertEquals("weiblich", u.getGender());         // trimmed
        assertEquals("HASH", u.getPassword());           // hashed

        verify(repo).existsByUsername("alice@test.de");
        verify(encoder).encode("pw");
        verify(repo).save(any(User.class));
    }

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

    @Test
    void getMeShouldReturnUserWhenAuthenticatedAndExists() {
        setAuth(auth("alice@test.de", true));

        User u = new User();
        u.setUsername("alice@test.de");

        when(repo.findByUsername("alice@test.de")).thenReturn(Optional.of(u));

        User me = service.getMe();

        assertSame(u, me);
        verify(repo).findByUsername("alice@test.de");
    }

    @Test
    void getMeShouldThrowEntityNotFoundWhenUserMissingInDb() {
        setAuth(auth("missing@test.de", true));
        when(repo.findByUsername("missing@test.de")).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> service.getMe());
        verify(repo).findByUsername("missing@test.de");
    }

    @Test
    void getMeShouldThrowAccessDeniedWhenAuthIsNull() {
        // no auth set
        assertThrows(AccessDeniedException.class, () -> service.getMe());
        verify(repo, never()).findByUsername(anyString());
    }

    @Test
    void getMeShouldThrowAccessDeniedWhenNotAuthenticated() {
        Authentication a = mock(Authentication.class);
        when(a.isAuthenticated()).thenReturn(false);
        SecurityContextHolder.getContext().setAuthentication(a);

        assertThrows(AccessDeniedException.class, () -> service.getMe());
        verify(repo, never()).findByUsername(anyString());
    }


    @Test
    void getMeShouldThrowAccessDeniedWhenNameBlank() {
        setAuth(auth("   ", true));

        assertThrows(AccessDeniedException.class, () -> service.getMe());
        verify(repo, never()).findByUsername(anyString());
    }

    @Test
    void getMeShouldThrowAccessDeniedWhenAnonymousUser() {
        setAuth(auth("anonymousUser", true));

        assertThrows(AccessDeniedException.class, () -> service.getMe());
        verify(repo, never()).findByUsername(anyString());
    }

    @Test
    void updateMeShouldPatchOnlyNonNullFieldsAndTrimStrings() {
        setAuth(auth("alice@test.de", true));

        User u = new User();
        u.setUsername("alice@test.de");
        u.setFirstName("Old");
        u.setLastName("Name");
        u.setAge(10);
        u.setGender("x");

        when(repo.findByUsername("alice@test.de")).thenReturn(Optional.of(u));

        UserController.UpdateMeRequest patch =
                new UserController.UpdateMeRequest("  NewFirst  ", null, 22, "  weiblich  ");

        User updated = service.updateMe(patch);

        assertSame(u, updated);
        assertEquals("NewFirst", u.getFirstName()); // trimmed
        assertEquals("Name", u.getLastName());      // unchanged
        assertEquals(22, u.getAge());
        assertEquals("weiblich", u.getGender());    // trimmed
    }

    @Test
    void updateMeShouldNotChangeAnythingWhenAllPatchFieldsNull() {
        setAuth(auth("alice@test.de", true));

        User u = new User();
        u.setUsername("alice@test.de");
        u.setFirstName("A");
        u.setLastName("B");
        u.setAge(20);
        u.setGender("g");

        when(repo.findByUsername("alice@test.de")).thenReturn(Optional.of(u));

        UserController.UpdateMeRequest patch =
                new UserController.UpdateMeRequest(null, null, null, null);

        User updated = service.updateMe(patch);

        assertSame(u, updated);
        assertEquals("A", u.getFirstName());
        assertEquals("B", u.getLastName());
        assertEquals(20, u.getAge());
        assertEquals("g", u.getGender());
    }

    @Test
    void listAllShouldReturnRepoFindAll() {
        List<User> list = List.of(new User(), new User());
        when(repo.findAll()).thenReturn(list);

        List<User> result = service.listAll();

        assertSame(list, result);
        verify(repo).findAll();
    }
}
