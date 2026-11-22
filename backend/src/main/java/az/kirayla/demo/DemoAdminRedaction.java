package az.kirayla.demo;

import az.kirayla.common.ErrorResponse;
import az.kirayla.security.AuthUser;
import az.kirayla.security.CurrentUser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.AbstractJackson2HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The read-only demo admin is a public login, so whatever it can read is public. This advice is the ONE place
 * that decides what that account may see: it rewrites every JSON response written for a
 * {@code demo_read_only} principal, whichever controller produced it.
 *
 * <p>It is deny-by-default. A text field leaves the server only if its name is on {@link #PUBLIC_TEXT};
 * a field added to some DTO later is hidden until someone lists it here on purpose.
 * <ul>
 *   <li>e-mail addresses are masked ({@code a***@domain}) — in e-mail fields and anywhere else they appear;</li>
 *   <li>free text people wrote to each other or to moderators ({@link #PRIVATE_TEXT}: booking messages,
 *       chat bodies, report reasons, block notes) is shown only for seed rows and nulled for everything a
 *       visitor wrote;</li>
 *   <li>any other text field is nulled.</li>
 * </ul>
 * Numbers, booleans and structure are left alone, so the admin screens keep working.
 */
@RestControllerAdvice
public class DemoAdminRedaction implements ResponseBodyAdvice<Object> {
    /** Text that is already public on the site (listing pages, public profiles) or is not personal at all. */
    static final Set<String> PUBLIC_TEXT = Set.of(
            // identifiers, enums, dates
            "status", "role", "kind", "condition", "code", "slug", "icon", "month",
            "createdAt", "joinedAt", "lastMessageAt", "startDate", "endDate", "from", "to",
            // public catalogue content
            "title", "description", "city", "district", "nameAz", "nameEn", "categoryNameAz", "categoryNameEn",
            "url", "coverUrl", "avatarUrl", "credit", "creditUrl",
            // public display names, public profile text and public reviews
            "name", "hostName", "bio", "comment",
            // the account's own tokens
            "accessToken", "refreshToken");
    static final Set<String> EMAIL_FIELDS = Set.of("email");
    static final Set<String> PRIVATE_TEXT = Set.of("message", "body", "lastMessage", "reason", "note");

    private static final Pattern EMAIL = Pattern.compile("([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\\.[A-Za-z]{2,})");

    private final ObjectMapper mapper;

    public DemoAdminRedaction(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return AbstractJackson2HttpMessageConverter.class.isAssignableFrom(converterType);
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType contentType,
                                  Class<? extends HttpMessageConverter<?>> converterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {
        if (body == null || body instanceof ErrorResponse) return body;
        boolean readOnly = CurrentUser.optional().map(AuthUser::readOnly).orElse(false);
        if (!readOnly) return body;
        JsonNode tree = mapper.valueToTree(body);
        redact(tree);
        return tree;
    }

    /** Applies the rules above in place. Package-private for tests. */
    static void redact(JsonNode node) {
        if (node instanceof ArrayNode array) {
            array.forEach(DemoAdminRedaction::redact);
        } else if (node instanceof ObjectNode object) {
            boolean seedRow = object.path("id").isIntegralNumber() && SeedData.isSeed(object.get("id").asLong());
            Iterator<Map.Entry<String, JsonNode>> fields = object.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                JsonNode value = field.getValue();
                if (value.isContainerNode()) {
                    if (value.isArray() && hasText(value)) field.setValue(redactTextArray(field.getKey(), (ArrayNode) value, seedRow));
                    else redact(value);
                } else if (value.isTextual()) {
                    field.setValue(text(field.getKey(), value.asText(), seedRow));
                }
            }
        }
    }

    private static boolean hasText(JsonNode array) {
        for (JsonNode n : array) if (n.isTextual()) return true;
        return false;
    }

    private static JsonNode redactTextArray(String name, ArrayNode array, boolean seedRow) {
        ArrayNode out = array.arrayNode();
        for (JsonNode n : array) {
            if (n.isTextual()) out.add(text(name, n.asText(), seedRow));
            else {
                redact(n);
                out.add(n);
            }
        }
        return out;
    }

    private static JsonNode text(String name, String value, boolean seedRow) {
        if (EMAIL_FIELDS.contains(name)) return TextNode.valueOf(maskEmails(value));
        if (PUBLIC_TEXT.contains(name) || (PRIVATE_TEXT.contains(name) && seedRow)) return TextNode.valueOf(maskEmails(value));
        return com.fasterxml.jackson.databind.node.NullNode.getInstance();
    }

    /** {@code aysel@share.az} → {@code a***@share.az}; text without an address is returned unchanged. */
    static String maskEmails(String s) {
        Matcher m = EMAIL.matcher(s);
        return m.find() ? m.replaceAll("$1***@$2") : s;
    }
}
