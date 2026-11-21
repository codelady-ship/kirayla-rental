# syntax=docker/dockerfile:1

# ---- build stage: compile and package the Spring Boot jar ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY src/ src/
# Tests run in CI (GitHub Actions); the image build only packages.
RUN ./mvnw -B -q package -DskipTests

# ---- runtime stage: small JRE image, non-root user ----
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 10001 spring && mkdir -p /app/data/uploads && chown -R spring /app/data
COPY --from=build /workspace/target/kirayla-api.jar app.jar
USER spring
ENV SPRING_PROFILES_ACTIVE=prod \
    STORAGE_DIR=/app/data/uploads \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -Xss512k -Duser.timezone=Asia/Baku"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
