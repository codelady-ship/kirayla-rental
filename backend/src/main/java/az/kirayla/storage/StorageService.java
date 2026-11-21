package az.kirayla.storage;

import org.springframework.web.multipart.MultipartFile;

/**
 * Where uploaded listing photos live.
 *
 * <p>The dev/demo implementation is {@link LocalStorageService} (files on disk, served by the API at
 * {@code /api/uploads/**}). To move to S3 or Cloudinary, add another implementation of this interface
 * (e.g. {@code S3StorageService} using the AWS SDK {@code PutObject} and returning the bucket/CDN URL,
 * or {@code CloudinaryStorageService} using {@code uploader().upload(...)} and returning
 * {@code secure_url}), annotate it with {@code @ConditionalOnProperty(name = "kirayla.storage.provider",
 * havingValue = "s3")} and set {@code STORAGE_PROVIDER=s3}. Callers only see {@link StoredFile}
 * (an opaque key for deletion plus a public URL), so no other code changes.
 */
public interface StorageService {

    /** Validates and stores an image under {@code folder}; returns its key and public URL. */
    StoredFile store(MultipartFile file, String folder);

    /** Deletes a previously stored file; unknown keys are ignored. */
    void delete(String key);

    record StoredFile(String key, String url) {}
}
