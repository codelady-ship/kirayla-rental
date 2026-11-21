package az.kirayla.repo;

import az.kirayla.domain.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {

    /** Deletes the token and tells whether it existed: 1 = it was still valid and is now spent, 0 = already used or revoked. */
    @Modifying
    @Query("delete from RefreshToken t where t.id = :id")
    int revoke(@Param("id") String id);
}
