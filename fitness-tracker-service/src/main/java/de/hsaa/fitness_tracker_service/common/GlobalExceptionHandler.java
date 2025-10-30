package de.hsaa.fitness_tracker_service.common;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(EntityNotFoundException.class)
	public ProblemDetail handleNotFound(EntityNotFoundException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
		var detail = ex.getBindingResult().getFieldErrors().stream()
				.map(err -> err.getField() + ": " + err.getDefaultMessage()).findFirst().orElse("Validation failed");
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	public ProblemDetail handleConflict(DataIntegrityViolationException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Constraint/Duplicate violation");
	}

	@ExceptionHandler(IllegalArgumentException.class)
	public ProblemDetail handleIllegalArg(IllegalArgumentException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
	}
}
