package az.kirayla.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * Lets the app run on hosts that hand out a libpq-style connection string (Neon, Render, Heroku):
 * {@code DATABASE_URL=postgresql://user:pass@host[:port]/db?sslmode=require} becomes
 * {@code spring.datasource.url=jdbc:postgresql://host:port/db?sslmode=require} plus username/password.
 * {@code JDBC_DATABASE_URL}/{@code JDBC_DATABASE_USERNAME}/{@code JDBC_DATABASE_PASSWORD} take precedence.
 */
public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication application) {
        Map<String, Object> props = new HashMap<>();
        String jdbcUrl = env.getProperty("JDBC_DATABASE_URL");
        String databaseUrl = env.getProperty("DATABASE_URL");
        if (jdbcUrl != null && !jdbcUrl.isBlank()) {
            props.put("spring.datasource.url", jdbcUrl);
            putIfSet(props, "spring.datasource.username", env.getProperty("JDBC_DATABASE_USERNAME"));
            putIfSet(props, "spring.datasource.password", env.getProperty("JDBC_DATABASE_PASSWORD"));
        } else if (databaseUrl != null && !databaseUrl.isBlank()) {
            props.putAll(convert(databaseUrl));
        }
        if (!props.isEmpty()) {
            env.getPropertySources().addFirst(new MapPropertySource("kiraylaDatabaseUrl", props));
        }
    }

    static Map<String, Object> convert(String databaseUrl) {
        Map<String, Object> props = new HashMap<>();
        if (databaseUrl.startsWith("jdbc:")) {
            props.put("spring.datasource.url", databaseUrl);
            return props;
        }
        URI uri = URI.create(databaseUrl.replaceFirst("^postgres(ql)?://", "postgresql://"));
        int port = uri.getPort() == -1 ? 5432 : uri.getPort();
        String query = uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery();
        props.put("spring.datasource.url", "jdbc:postgresql://" + uri.getHost() + ":" + port + uri.getRawPath() + query);
        String userInfo = uri.getRawUserInfo();
        if (userInfo != null) {
            String[] parts = userInfo.split(":", 2);
            props.put("spring.datasource.username", URLDecoder.decode(parts[0], StandardCharsets.UTF_8));
            if (parts.length > 1) {
                props.put("spring.datasource.password", URLDecoder.decode(parts[1], StandardCharsets.UTF_8));
            }
        }
        return props;
    }

    private static void putIfSet(Map<String, Object> props, String key, String value) {
        if (value != null && !value.isBlank()) props.put(key, value);
    }
}
