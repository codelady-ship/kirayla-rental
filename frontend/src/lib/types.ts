// Shapes of the Spring Boot API (see backend controllers / README API table).

export type Role = "USER" | "ADMIN";
export type Condition = "NEW" | "LIKE_NEW" | "GOOD" | "FAIR";
export type ListingStatus = "ACTIVE" | "HIDDEN" | "ARCHIVED";
export type BookingStatus = "REQUESTED" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "COMPLETED";
export type ReportStatus = "OPEN" | "RESOLVED" | "DISMISSED";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  city: string | null;
  bio: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  readOnly: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface PublicUser {
  id: number;
  name: string;
  avatarUrl: string | null;
  city: string | null;
  bio: string | null;
  joinedAt: string;
  listingCount: number;
  ratingAvg: number;
  reviewCount: number;
}

export interface CategoryRef {
  id: number;
  slug: string;
  nameAz: string;
  nameEn: string;
  icon: string;
}

export interface Category extends CategoryRef {
  listingCount: number;
  sortOrder: number;
  active: boolean;
}

export interface ListingCard {
  id: number;
  title: string;
  city: string;
  district: string | null;
  dailyPrice: number;
  deposit: number;
  coverUrl: string | null;
  category: CategoryRef;
  ratingAvg: number;
  reviewCount: number;
  hostId: number;
  hostName: string;
  status: ListingStatus;
  createdAt: string;
}

export interface Photo {
  id: number;
  url: string;
  credit: string | null;
  creditUrl: string | null;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface Unavailable extends DateRange {
  kind: "BOOKED" | "BLOCKED";
}

export interface Review {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  author: { id: number; name: string; avatarUrl: string | null };
}

export interface ListingDetail extends ListingCard {
  description: string;
  condition: Condition;
  minDays: number;
  maxDays: number;
  photos: Photo[];
  host: PublicUser;
  unavailable: Unavailable[];
  reviews: Review[];
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PersonRef {
  id: number;
  name: string;
  avatarUrl: string | null;
}

export interface Booking {
  id: number;
  listing: { id: number; title: string; coverUrl: string | null; city: string };
  renter: PersonRef;
  host: PersonRef;
  startDate: string;
  endDate: string;
  days: number;
  dailyPrice: number;
  rentalTotal: number;
  deposit: number;
  totalDue: number;
  status: BookingStatus;
  message: string | null;
  createdAt: string;
  reviewed: boolean;
  conversationId: number | null;
}

export interface Conversation {
  id: number;
  listing: { id: number; title: string; coverUrl: string | null };
  other: PersonRef;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Message {
  id: number;
  senderId: number;
  body: string;
  createdAt: string;
  mine: boolean;
}

export interface HostListing extends ListingCard {
  photoCount: number;
  bookingCount: number;
  pendingCount: number;
}

export interface Block {
  id: number;
  from: string;
  to: string;
  note: string | null;
}

export interface Earnings {
  totalEarned: number;
  upcoming: number;
  pendingRequests: number;
  completedCount: number;
  averageDailyPrice: number;
  monthly: { month: string; amount: number }[];
  topListings: { id: number; title: string; amount: number; bookings: number }[];
}

export interface AdminStats {
  users: number;
  listings: number;
  activeListings: number;
  hiddenListings: number;
  bookings: number;
  gmv: number;
  openReports: number;
  bookingsByStatus: Partial<Record<BookingStatus, number>>;
  signupsByMonth: { month: string; count: number }[];
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  city: string | null;
  enabled: boolean;
  readOnly: boolean;
  listingCount: number;
  bookingCount: number;
  joinedAt: string;
}

export interface AdminListing {
  id: number;
  title: string;
  hostName: string;
  city: string;
  categoryNameAz: string;
  categoryNameEn: string;
  dailyPrice: number;
  status: ListingStatus;
  reportCount: number;
  createdAt: string;
  coverUrl: string | null;
}

export interface Report {
  id: number;
  listing: { id: number; title: string; status: ListingStatus };
  reporter: { id: number; name: string };
  reason: string;
  status: ReportStatus;
  createdAt: string;
}

export interface ListingInput {
  title: string;
  description: string;
  categoryId: number;
  city: string;
  district: string | null;
  dailyPrice: number;
  deposit: number;
  condition: Condition;
  minDays: number;
  maxDays: number;
}

export interface SearchParams {
  q?: string;
  category?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  from?: string;
  to?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "rating";
  page?: number;
  size?: number;
}
