package az.kirayla.service;

import az.kirayla.common.ApiException;
import az.kirayla.domain.ListingStatus;
import az.kirayla.domain.WishlistItem;
import az.kirayla.repo.ListingRepository;
import az.kirayla.repo.WishlistRepository;
import az.kirayla.security.CurrentUser;
import az.kirayla.web.dto.Dtos.ListingCard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class WishlistService {
    private final WishlistRepository wishlist;
    private final ListingRepository listings;
    private final Mapper mapper;

    public WishlistService(WishlistRepository wishlist, ListingRepository listings, Mapper mapper) {
        this.wishlist = wishlist;
        this.listings = listings;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<ListingCard> list() {
        List<Long> ids = ids();
        return listings.findAllById(ids).stream()
                .filter(l -> l.getStatus() == ListingStatus.ACTIVE)
                .sorted((a, b) -> Integer.compare(ids.indexOf(a.getId()), ids.indexOf(b.getId())))
                .map(mapper::card).toList();
    }

    @Transactional(readOnly = true)
    public List<Long> ids() {
        return wishlist.findByUserIdOrderByCreatedAtDesc(CurrentUser.id()).stream()
                .map(WishlistItem::getListingId).toList();
    }

    @Transactional
    public void add(Long listingId) {
        Long me = CurrentUser.id();
        if (!listings.existsById(listingId)) throw ApiException.notFound("Listing");
        if (!wishlist.existsById(new WishlistItem.Key(me, listingId))) {
            wishlist.save(new WishlistItem(me, listingId));
        }
    }

    @Transactional
    public void remove(Long listingId) {
        WishlistItem.Key key = new WishlistItem.Key(CurrentUser.id(), listingId);
        if (wishlist.existsById(key)) wishlist.deleteById(key);
    }
}
