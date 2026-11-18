package az.kirayla.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "listing_photos")
public class ListingPhoto {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "listing_id") private Listing listing;
    @Column(nullable = false) private String url;
    @Column(name = "storage_key") private String storageKey;
    private String credit;
    @Column(name = "credit_url") private String creditUrl;
    @Column(name = "sort_order", nullable = false) private int sortOrder;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Listing getListing() { return listing; }
    public void setListing(Listing listing) { this.listing = listing; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getStorageKey() { return storageKey; }
    public void setStorageKey(String storageKey) { this.storageKey = storageKey; }
    public String getCredit() { return credit; }
    public void setCredit(String credit) { this.credit = credit; }
    public String getCreditUrl() { return creditUrl; }
    public void setCreditUrl(String creditUrl) { this.creditUrl = creditUrl; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}
