package az.kirayla.repo;

import az.kirayla.domain.WishlistItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WishlistRepository extends JpaRepository<WishlistItem, WishlistItem.Key> {
    List<WishlistItem> findByUserIdOrderByCreatedAtDesc(Long userId);
}
