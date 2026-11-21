package az.kirayla.repo;

import az.kirayla.domain.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    @Query("""
            select u from User u
            where lower(u.fullName) like :q or lower(u.email) like :q or lower(coalesce(u.city, '')) like :q
            """)
    Page<User> search(@Param("q") String q, Pageable pageable);

    /** Same list, matched only on fields that are shown unmasked (used for the read-only demo admin). */
    @Query("""
            select u from User u
            where lower(u.fullName) like :q or lower(coalesce(u.city, '')) like :q
            """)
    Page<User> searchPublicFields(@Param("q") String q, Pageable pageable);

    List<User> findByCreatedAtAfter(LocalDateTime after);
}
