package az.kirayla.service;

import az.kirayla.common.ApiException;
import az.kirayla.domain.Category;
import az.kirayla.repo.CategoryRepository;
import az.kirayla.repo.ListingRepository;
import az.kirayla.web.dto.Dtos.CategoryDto;
import az.kirayla.web.dto.Dtos.CategoryRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoryService {
    private final CategoryRepository categories;
    private final ListingRepository listings;
    private final Mapper mapper;

    public CategoryService(CategoryRepository categories, ListingRepository listings, Mapper mapper) {
        this.categories = categories;
        this.listings = listings;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<CategoryDto> active() {
        return categories.findByActiveTrueOrderBySortOrderAscIdAsc().stream().map(mapper::category).toList();
    }

    @Transactional(readOnly = true)
    public List<CategoryDto> all() {
        return categories.findAllByOrderBySortOrderAscIdAsc().stream().map(mapper::category).toList();
    }

    @Transactional
    public CategoryDto create(CategoryRequest req) {
        if (categories.existsBySlug(req.slug())) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATE", "A category with this slug already exists");
        }
        Category c = new Category();
        apply(c, req);
        return mapper.category(categories.save(c));
    }

    @Transactional
    public CategoryDto update(Long id, CategoryRequest req) {
        Category c = categories.findById(id).orElseThrow(() -> ApiException.notFound("Category"));
        categories.findBySlug(req.slug()).filter(o -> !o.getId().equals(id)).ifPresent(o -> {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATE", "A category with this slug already exists");
        });
        apply(c, req);
        return mapper.category(c);
    }

    @Transactional
    public void delete(Long id) {
        Category c = categories.findById(id).orElseThrow(() -> ApiException.notFound("Category"));
        if (listings.countByCategoryId(id) > 0) {
            throw ApiException.invalidState("This category still has listings — hide it instead");
        }
        categories.delete(c);
    }

    private static void apply(Category c, CategoryRequest req) {
        c.setSlug(req.slug());
        c.setNameAz(req.nameAz().trim());
        c.setNameEn(req.nameEn().trim());
        c.setIcon(req.icon().trim());
        c.setSortOrder(req.sortOrder());
        c.setActive(req.active() == null || req.active());
    }
}
