package az.kirayla.storage;

import az.kirayla.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

/** Stores photos on the local filesystem under {@code STORAGE_DIR}; served at {@code /api/uploads/**}. */
@Service
@ConditionalOnProperty(name = "kirayla.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalStorageService implements StorageService {
    public static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg", "image/png", "png", "image/webp", "webp");

    private final Path root;
    private final String publicBaseUrl;

    public LocalStorageService(@Value("${kirayla.storage.dir}") String dir,
                               @Value("${kirayla.public-base-url}") String publicBaseUrl) {
        this.root = Path.of(dir).toAbsolutePath().normalize();
        this.publicBaseUrl = publicBaseUrl.replaceAll("/+$", "");
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot create storage dir " + root, e);
        }
    }

    public Path root() { return root; }

    @Override
    public StoredFile store(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) throw ApiException.validation("Empty file");
        if (file.getSize() > MAX_BYTES) throw ApiException.validation("Each photo must be 5 MB or smaller");
        String ext = EXTENSIONS.get(String.valueOf(file.getContentType()).toLowerCase());
        if (ext == null) throw ApiException.validation("Only JPEG, PNG or WebP images are allowed");
        String safeFolder = folder.replaceAll("[^a-zA-Z0-9/_-]", "");
        String key = safeFolder + "/" + UUID.randomUUID() + "." + ext;
        Path target = root.resolve(key).normalize();
        if (!target.startsWith(root)) throw ApiException.validation("Invalid path");
        try (InputStream in = file.getInputStream()) {
            byte[] head = in.readNBytes(12);
            if (!looksLikeImage(head)) throw ApiException.validation("File content is not a valid image");
            Files.createDirectories(target.getParent());
            try (InputStream rest = file.getInputStream()) {
                Files.copy(rest, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return new StoredFile(key, publicBaseUrl + "/api/uploads/" + key);
    }

    @Override
    public void delete(String key) {
        if (key == null || key.isBlank()) return;
        Path target = root.resolve(key).normalize();
        if (!target.startsWith(root)) return;
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // best effort
        }
    }

    /** Magic-byte sniffing so a renamed non-image is rejected. */
    static boolean looksLikeImage(byte[] h) {
        if (h.length >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) return true; // JPEG
        if (h.length >= 8 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G') return true;       // PNG
        return h.length >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P';                                   // WebP
    }
}
