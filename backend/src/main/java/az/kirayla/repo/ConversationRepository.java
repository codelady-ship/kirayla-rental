package az.kirayla.repo;

import az.kirayla.domain.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    Optional<Conversation> findByListingIdAndRenterId(Long listingId, Long renterId);

    @Query("""
            select c from Conversation c
            where c.renter.id = :userId or c.host.id = :userId
            order by c.lastMessageAt desc
            """)
    List<Conversation> findForUser(@Param("userId") Long userId);
}
