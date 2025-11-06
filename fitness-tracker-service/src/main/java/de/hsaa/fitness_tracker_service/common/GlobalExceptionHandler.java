package de.hsaa.fitness_tracker_service.common;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

//@RestControllerAdvice=fängt Exceptions aus allen Controllern zentral ab
@RestControllerAdvice
public class GlobalExceptionHandler {

	// @ExceptionHandler für 404,wenn eine Ressource nicht existiert
	@ExceptionHandler(EntityNotFoundException.class)
	public ProblemDetail handleNotFound(EntityNotFoundException ex) {
		var pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
		pd.setTitle("Not Found");
		return pd;
	}

	// @ExceptionHandler für 400,wenn Bean-Validation(@Valid) fehlschlägt
	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
		var detail = ex.getBindingResult().getFieldErrors().stream()
				.map(err -> err.getField() + ": " + err.getDefaultMessage()).findFirst().orElse("Validation failed");
		var pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
		pd.setTitle("Bad Request");
		return pd;
	}

	// @ExceptionHandler für 409,wenn es z.B.einen Unique-Constraint-Konflikt gibt
	@ExceptionHandler(DataIntegrityViolationException.class)
	public ProblemDetail handleConflict(DataIntegrityViolationException ex) {
		var pd = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Constraint/Duplicate violation");
		pd.setTitle("Conflict");
		return pd;
	}

	// @ExceptionHandler für 400,wenn Request-Body z.B.kein gültiges JSON/Datum ist
	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ProblemDetail handleUnreadable(HttpMessageNotReadableException ex) {
		var pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Malformed JSON or type mismatch");
		pd.setTitle("Bad Request");
		return pd;
	}

	// @ExceptionHandler für 400,wenn z.B.eine ID nicht in eine Zahl geparst werden kann
	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ProblemDetail handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
		var msg = "Invalid parameter '" + ex.getName() + "'";
		var pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, msg);
		pd.setTitle("Bad Request");
		return pd;
	}

	// @ExceptionHandler für 400,falls gezielt IllegalArgumentException geworfen wird
	@ExceptionHandler(IllegalArgumentException.class)
	public ProblemDetail handleIllegalArg(IllegalArgumentException ex) {
		var pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
		pd.setTitle("Bad Request");
		return pd;
	}
}
