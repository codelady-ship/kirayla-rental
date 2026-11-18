package az.kirayla.repo;

import az.kirayla.domain.ListingPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ListingPhotoRepository extends JpaRepository<ListingPhoto, Long> {
    long countByListingId(Long listingId);
}
