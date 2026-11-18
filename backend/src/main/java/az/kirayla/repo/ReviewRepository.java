package az.kirayla.repo;

import az.kirayla.domain.Review;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    boolean existsByBookingId(Long bookingId);

    List<Review> findByListingIdOrderByCreatedAtDesc(Long listingId, Pageable pageable);

    @Query("select avg(r.rating) from Review r where r.listing.id = :listingId")
    Double averageForListing(@Param("listingId") Long listingId);

    long countByListingId(Long listingId);

    @Query("select avg(r.rating) from Review r where r.listing.owner.id = :ownerId")
    Double averageForOwner(@Param("ownerId") Long ownerId);

    @Query("select count(r) from Review r where r.listing.owner.id = :ownerId")
    long countForOwner(@Param("ownerId") Long ownerId);
}
