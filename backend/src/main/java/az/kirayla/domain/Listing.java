package az.kirayla.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "listings")
public class Listing {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "owner_id") private User owner;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "category_id") private Category category;
    @Column(nullable = false) private String title;
    @Column(nullable = false, length = 4000) private String description;
    @Column(nullable = false) private String city;
    private String district;
    @Column(name = "daily_price", nullable = false) private BigDecimal dailyPrice;
    @Column(nullable = false) private BigDecimal deposit = BigDecimal.ZERO;
    @Enumerated(EnumType.STRING) @Column(name = "item_condition", nullable = false) private ItemCondition condition = ItemCondition.GOOD;
    @Column(name = "min_days", nullable = false) private int minDays = 1;
    @Column(name = "max_days", nullable = false) private int maxDays = 30;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private ListingStatus status = ListingStatus.ACTIVE;
    @Column(name = "rating_avg", nullable = false) private BigDecimal ratingAvg = BigDecimal.ZERO;
    @Column(name = "review_count", nullable = false) private int reviewCount;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt = LocalDateTime.now();
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "listing", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    @BatchSize(size = 50)
    private List<ListingPhoto> photos = new ArrayList<>();

    /** First photo by sort order, or null when the listing has no photos yet. */
    public String coverUrl() { return photos.isEmpty() ? null : photos.get(0).getUrl(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }
    public BigDecimal getDailyPrice() { return dailyPrice; }
    public void setDailyPrice(BigDecimal dailyPrice) { this.dailyPrice = dailyPrice; }
    public BigDecimal getDeposit() { return deposit; }
    public void setDeposit(BigDecimal deposit) { this.deposit = deposit; }
    public ItemCondition getCondition() { return condition; }
    public void setCondition(ItemCondition condition) { this.condition = condition; }
    public int getMinDays() { return minDays; }
    public void setMinDays(int minDays) { this.minDays = minDays; }
    public int getMaxDays() { return maxDays; }
    public void setMaxDays(int maxDays) { this.maxDays = maxDays; }
    public ListingStatus getStatus() { return status; }
    public void setStatus(ListingStatus status) { this.status = status; }
    public BigDecimal getRatingAvg() { return ratingAvg; }
    public void setRatingAvg(BigDecimal ratingAvg) { this.ratingAvg = ratingAvg; }
    public int getReviewCount() { return reviewCount; }
    public void setReviewCount(int reviewCount) { this.reviewCount = reviewCount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public List<ListingPhoto> getPhotos() { return photos; }
}
