package az.kirayla.config;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class DatabaseUrlEnvironmentPostProcessorTest {

    @Test
    void convertsNeonStyleUrl() {
        Map<String, Object> p = DatabaseUrlEnvironmentPostProcessor.convert(
                "postgresql://kirayla_owner:p%40ss@ep-cool-1.eu-central-1.aws.neon.tech/kirayla?sslmode=require");
        assertThat(p).containsEntry("spring.datasource.url",
                        "jdbc:postgresql://ep-cool-1.eu-central-1.aws.neon.tech:5432/kirayla?sslmode=require")
                .containsEntry("spring.datasource.username", "kirayla_owner")
                .containsEntry("spring.datasource.password", "p@ss");
    }

    @Test
    void keepsJdbcUrlsAndPostgresScheme() {
        assertThat(DatabaseUrlEnvironmentPostProcessor.convert("jdbc:postgresql://h/db"))
                .containsEntry("spring.datasource.url", "jdbc:postgresql://h/db");
        assertThat(DatabaseUrlEnvironmentPostProcessor.convert("postgres://u:p@h:6543/db"))
                .containsEntry("spring.datasource.url", "jdbc:postgresql://h:6543/db");
    }
}
