package az.kirayla.repo;

import az.kirayla.domain.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByActiveTrueOrderBySortOrderAscIdAsc();

    List<Category> findAllByOrderBySortOrderAscIdAsc();

    Optional<Category> findBySlug(String slug);

    boolean existsBySlug(String slug);
}
