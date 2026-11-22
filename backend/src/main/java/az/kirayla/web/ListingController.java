package az.kirayla.web;

import az.kirayla.common.PageResponse;
import az.kirayla.service.CategoryService;
import az.kirayla.service.ListingService;
import az.kirayla.service.ListingSpecs;
import az.kirayla.web.dto.Dtos.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.util.List;

@RestController
@Tag(name = "Listings & categories")
public class ListingController {
    private final ListingService listings;
    private final CategoryService categories;

    public ListingController(ListingService listings, CategoryService categories) {
        this.listings = listings;
        this.categories = categories;
    }

    @GetMapping("/api/categories")
    public List<CategoryDto> categories() {
        return categories.active();
    }

    @GetMapping("/api/listings")
    public PageResponse<ListingCard> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return listings.search(new ListingSpecs.Filter(q, category, city, minPrice, maxPrice, from, to), sort, page, size);
    }

    /**
     * The home page's floating cards: the most rented and the newest active listings, alternating (see
     * {@link ListingService#highlights}). Public catalogue data only; browsers and the site may cache it a minute.
     */
    @GetMapping("/api/listings/highlights")
    public ResponseEntity<List<ListingCard>> highlights(@RequestParam(defaultValue = "7") int size) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofSeconds(60)).cachePublic())
                .body(listings.highlights(size));
    }

    @GetMapping("/api/listings/{id}")
    public ListingDetail detail(@PathVariable Long id) {
        return listings.detail(id);
    }

    @PostMapping("/api/listings")
    @ResponseStatus(HttpStatus.CREATED)
    public ListingDetail create(@Valid @RequestBody ListingRequest req) {
        return listings.create(req);
    }

    @PutMapping("/api/listings/{id}")
    public ListingDetail update(@PathVariable Long id, @Valid @RequestBody ListingRequest req) {
        return listings.update(id, req);
    }

    @DeleteMapping("/api/listings/{id}")
    public ResponseEntity<Void> archive(@PathVariable Long id) {
        listings.archive(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/api/listings/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<PhotoDto> uploadPhotos(@PathVariable Long id, @RequestParam("files") List<MultipartFile> files) {
        return listings.addPhotos(id, files);
    }

    @DeleteMapping("/api/listings/{id}/photos/{photoId}")
    public ResponseEntity<Void> deletePhoto(@PathVariable Long id, @PathVariable Long photoId) {
        listings.deletePhoto(id, photoId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/listings/{id}/blocks")
    public List<BlockDto> blocks(@PathVariable Long id) {
        return listings.listBlocks(id);
    }

    @PostMapping("/api/listings/{id}/blocks")
    @ResponseStatus(HttpStatus.CREATED)
    public BlockDto addBlock(@PathVariable Long id, @Valid @RequestBody BlockRequest req) {
        return listings.addBlock(id, req);
    }

    @DeleteMapping("/api/listings/{id}/blocks/{blockId}")
    public ResponseEntity<Void> deleteBlock(@PathVariable Long id, @PathVariable Long blockId) {
        listings.deleteBlock(id, blockId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/listings/{id}/reports")
    public ResponseEntity<Void> report(@PathVariable Long id, @Valid @RequestBody ReportRequest req) {
        listings.report(id, req);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
