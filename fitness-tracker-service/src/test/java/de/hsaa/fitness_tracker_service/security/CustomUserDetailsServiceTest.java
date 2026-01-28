package de.hsaa.fitness_tracker_service.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import de.hsaa.fitness_tracker_service.user.User;
import de.hsaa.fitness_tracker_service.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class CustomUserDetailsServiceTest {

    @Mock UserRepository users;

    @InjectMocks CustomUserDetailsService service;

    @Test
    void loadUserByUsernameShouldReturnAdminWhenUsernameIsGruppe8() {
        User u = new User();
        u.setUsername("gruppe8@gmail.com");
        u.setPassword("HASH");

        when(users.findByUsername("gruppe8@gmail.com")).thenReturn(Optional.of(u));

        UserDetails details = service.loadUserByUsername("gruppe8@gmail.com");

        assertEquals("gruppe8@gmail.com", details.getUsername());
        assertEquals("HASH", details.getPassword());
        assertTrue(details.getAuthorities().stream().map(GrantedAuthority::getAuthority).anyMatch(a -> a.equals("ROLE_ADMIN")));
        assertFalse(details.getAuthorities().stream().map(GrantedAuthority::getAuthority).anyMatch(a -> a.equals("ROLE_USER")));
    }

    @Test
    void loadUserByUsernameShouldReturnUserRoleForNonAdminUsers() {
        User u = new User();
        u.setUsername("alice@test.de");
        u.setPassword("HASH2");

        when(users.findByUsername("alice@test.de")).thenReturn(Optional.of(u));

        UserDetails details = service.loadUserByUsername("alice@test.de");

        assertEquals("alice@test.de", details.getUsername());
        assertEquals("HASH2", details.getPassword());
        assertTrue(details.getAuthorities().stream().map(GrantedAuthority::getAuthority).anyMatch(a -> a.equals("ROLE_USER")));
        assertFalse(details.getAuthorities().stream().map(GrantedAuthority::getAuthority).anyMatch(a -> a.equals("ROLE_ADMIN")));
    }

    @Test
    void loadUserByUsernameShouldThrowWhenNotFound() {
        when(users.findByUsername("missing@test.de")).thenReturn(Optional.empty());

        assertThrows(UsernameNotFoundException.class,
                () -> service.loadUserByUsername("missing@test.de"));

        verify(users).findByUsername("missing@test.de");
    }
}
