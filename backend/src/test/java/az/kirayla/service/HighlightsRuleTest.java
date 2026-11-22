package az.kirayla.service;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** The selection rule of the home page's floating cards (ListingService#alternate). */
class HighlightsRuleTest {

    @Test
    void alternatesMostRentedAndNewestStartingWithMostRented() {
        assertThat(ListingService.alternate(List.of(1L, 2L, 3L, 4L), List.of(9L, 8L, 7L, 6L), 7))
                .containsExactly(1L, 9L, 2L, 8L, 3L, 7L, 4L);
    }

    @Test
    void neverRepeatsAListingThatIsBothMostRentedAndNew() {
        // 2 and 1 are on both lists: each is shown once, and each list still takes its turn with its next listing
        assertThat(ListingService.alternate(List.of(1L, 2L, 3L, 4L), List.of(2L, 1L, 5L, 6L), 5))
                .containsExactly(1L, 2L, 3L, 5L, 4L);
        assertThat(ListingService.alternate(List.of(1L, 2L), List.of(1L, 9L), 3)).containsExactly(1L, 9L, 2L);
    }

    @Test
    void theOtherListFillsInWhenOneRunsOut() {
        assertThat(ListingService.alternate(List.of(1L), List.of(9L, 8L, 7L), 4)).containsExactly(1L, 9L, 8L, 7L);
        assertThat(ListingService.alternate(List.of(), List.of(9L, 8L), 7)).containsExactly(9L, 8L);
        assertThat(ListingService.alternate(List.of(1L, 2L, 3L), List.of(), 2)).containsExactly(1L, 2L);
    }

    @Test
    void stopsAtTheRequestedCount() {
        assertThat(ListingService.alternate(List.of(1L, 2L, 3L), List.of(9L, 8L, 7L), 3)).containsExactly(1L, 9L, 2L);
        assertThat(ListingService.alternate(List.of(), List.of(), 7)).isEmpty();
    }
}
