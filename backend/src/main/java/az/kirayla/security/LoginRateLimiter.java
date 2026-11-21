package az.kirayla.security;

import az.kirayla.common.ApiException;
import az.kirayla.demo.SeedData;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Slows down password guessing: failed logins are counted in a sliding window per (client address, e-mail)
 * and per client address. Over the limit the API answers 429 until old failures leave the window.
 * A successful login clears the pair's counter.
 *
 * <p>The three public demo accounts are left out of the per-(address, e-mail) lock: their password is public,
 * so the lock protects nothing, and behind a shared proxy hop one visitor's wrong passwords would otherwise
 * lock the demo buttons for everyone else. They still count towards, and obey, the per-address limit.
 *
 * <p>In memory on purpose (one small instance, no extra infrastructure). The address is
 * {@code HttpServletRequest#getRemoteAddr()}; behind Render's proxy Tomcat's RemoteIpValve
 * ({@code server.forward-headers-strategy=native} in the prod profile) resolves it from the right-most
 * untrusted X-Forwarded-For entry, which a client cannot forge by sending its own header.
 */
@Component
public class LoginRateLimiter {
    public static final String CODE = "TOO_MANY_ATTEMPTS";
    private static final int MAX_KEYS = 50_000;

    private final int maxPerPair;
    private final int maxPerAddress;
    private final long windowMs;
    private final Map<String, Deque<Long>> failures = new ConcurrentHashMap<>();

    public LoginRateLimiter(@Value("${kirayla.login-limit.per-email:8}") int maxPerPair,
                            @Value("${kirayla.login-limit.per-address:40}") int maxPerAddress,
                            @Value("${kirayla.login-limit.window:PT10M}") Duration window) {
        this.maxPerPair = maxPerPair;
        this.maxPerAddress = maxPerAddress;
        this.windowMs = window.toMillis();
    }

    /** Throws 429 when this address (or this address for this e-mail) has failed too often recently. */
    public void check(String address, String email) {
        long now = System.currentTimeMillis();
        if ((!isPublicDemo(email) && count(pair(address, email), now) >= maxPerPair) || count(address, now) >= maxPerAddress) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, CODE,
                    "Too many failed sign-in attempts. Wait a few minutes and try again.");
        }
    }

    public void failed(String address, String email) {
        long now = System.currentTimeMillis();
        if (failures.size() > MAX_KEYS) prune(now);
        if (!isPublicDemo(email)) add(pair(address, email), now);
        add(address, now);
    }

    public void succeeded(String address, String email) {
        failures.remove(pair(address, email));
    }

    private static String normal(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean isPublicDemo(String email) {
        return SeedData.PUBLIC_LOGINS.contains(normal(email));
    }

    private static String pair(String address, String email) {
        return address + "|" + normal(email);
    }

    private void add(String key, long now) {
        Deque<Long> q = failures.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (q) {
            q.addLast(now);
        }
    }

    private int count(String key, long now) {
        Deque<Long> q = failures.get(key);
        if (q == null) return 0;
        synchronized (q) {
            while (!q.isEmpty() && now - q.peekFirst() > windowMs) q.removeFirst();
            return q.size();
        }
    }

    private void prune(long now) {
        failures.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                return e.getValue().isEmpty() || now - e.getValue().peekLast() > windowMs;
            }
        });
    }
}
