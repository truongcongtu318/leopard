import {
  ForbiddenException,
  HttpStatus,
  UnauthorizedException
} from "@nestjs/common";

export function invalidCredentialsException() {
  return new UnauthorizedException({
    statusCode: HttpStatus.UNAUTHORIZED,
    code: "AUTH_INVALID_CREDENTIALS",
    message: "Email or password is invalid.",
    details: {}
  });
}

export function tokenRequiredException() {
  return new UnauthorizedException({
    statusCode: HttpStatus.UNAUTHORIZED,
    code: "AUTH_TOKEN_REQUIRED",
    message: "Missing or invalid bearer token.",
    details: {}
  });
}

export function forbiddenRoleException() {
  return new ForbiddenException({
    statusCode: HttpStatus.FORBIDDEN,
    code: "AUTH_FORBIDDEN_ROLE",
    message: "Wrong role for endpoint.",
    details: {}
  });
}
