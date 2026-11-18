package az.kirayla.web;

import az.kirayla.common.PageResponse;
import az.kirayla.domain.BookingStatus;
import az.kirayla.domain.ListingStatus;
import az.kirayla.domain.ReportStatus;
import az.kirayla.service.AdminService;
import az.kirayla.service.CategoryService;
import az.kirayla.web.dto.Dtos.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** ROLE_ADMIN only (enforced in SecurityConfig). The demo admin is read-only (DemoReadOnlyFilter). */
@RestController
@RequestMapping("/api/admin")
@Tag(name = "Admin")
public class AdminController {
    private final AdminService admin;
    private final CategoryService categories;

    public AdminController(AdminService admin, CategoryService categories) {
        this.admin = admin;
        this.categories = categories;
    }

    @GetMapping("/stats")
    public AdminStats stats() {
        return admin.stats();
    }

    @GetMapping("/users")
    public PageResponse<AdminUser> users(@RequestParam(required = false) String q,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size) {
        return admin.users(q, page, size);
    }

    @PatchMapping("/users/{id}")
    public AdminUser patchUser(@PathVariable Long id, @RequestBody AdminUserPatch patch) {
        return admin.patchUser(id, patch);
    }

    @GetMapping("/listings")
    public PageResponse<AdminListing> listings(@RequestParam(required = false) String q,
                                               @RequestParam(required = false) ListingStatus status,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size) {
        return admin.listings(q, status, page, size);
    }

    @PatchMapping("/listings/{id}")
    public AdminListing patchListing(@PathVariable Long id, @Valid @RequestBody AdminListingPatch patch) {
        return admin.patchListing(id, patch);
    }

    @GetMapping("/bookings")
    public PageResponse<BookingDto> bookings(@RequestParam(required = false) BookingStatus status,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return admin.bookings(status, page, size);
    }

    @GetMapping("/categories")
    public List<CategoryDto> categories() {
        return categories.all();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryDto createCategory(@Valid @RequestBody CategoryRequest req) {
        return categories.create(req);
    }

    @PutMapping("/categories/{id}")
    public CategoryDto updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest req) {
        return categories.update(id, req);
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        categories.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/reports")
    public List<ReportDto> reports(@RequestParam(required = false) ReportStatus status) {
        return admin.reports(status);
    }

    @PatchMapping("/reports/{id}")
    public ReportDto patchReport(@PathVariable Long id, @Valid @RequestBody ReportPatch patch) {
        return admin.patchReport(id, patch);
    }
}
