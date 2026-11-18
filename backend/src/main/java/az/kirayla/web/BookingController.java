package az.kirayla.web;

import az.kirayla.domain.BookingStatus;
import az.kirayla.service.BookingService;
import az.kirayla.web.dto.Dtos.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@Tag(name = "Bookings")
public class BookingController {
    private final BookingService bookings;

    public BookingController(BookingService bookings) {
        this.bookings = bookings;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookingDto create(@Valid @RequestBody BookingRequest req) {
        return bookings.create(req);
    }

    @GetMapping("/mine")
    public List<BookingDto> mine() {
        return bookings.mine();
    }

    @GetMapping("/incoming")
    public List<BookingDto> incoming(@RequestParam(required = false) BookingStatus status) {
        return bookings.incoming(status);
    }

    @GetMapping("/{id}")
    public BookingDto get(@PathVariable Long id) {
        return bookings.get(id);
    }

    @PostMapping("/{id}/accept")
    public BookingDto accept(@PathVariable Long id) {
        return bookings.accept(id);
    }

    @PostMapping("/{id}/decline")
    public BookingDto decline(@PathVariable Long id) {
        return bookings.decline(id);
    }

    @PostMapping("/{id}/cancel")
    public BookingDto cancel(@PathVariable Long id) {
        return bookings.cancel(id);
    }

    @PostMapping("/{id}/complete")
    public BookingDto complete(@PathVariable Long id) {
        return bookings.complete(id);
    }

    @PostMapping("/{id}/review")
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewDto review(@PathVariable Long id, @Valid @RequestBody ReviewRequest req) {
        return bookings.review(id, req);
    }
}
