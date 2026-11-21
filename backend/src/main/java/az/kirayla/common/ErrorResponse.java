package az.kirayla.common;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

/** Uniform error body: {"status":409,"code":"BOOKING_CONFLICT","message":"...","fieldErrors":{...}}. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(int status, String code, String message, Map<String, String> fieldErrors) {
    public static ErrorResponse of(int status, String code, String message) {
        return new ErrorResponse(status, code, message, null);
    }
}
