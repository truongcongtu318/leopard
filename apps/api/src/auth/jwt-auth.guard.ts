import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable
} from "@nestjs/common";

import { tokenRequiredException } from "./auth.errors";
import { TOKEN_SERVICE, type JwtPayload, type TokenService } from "./token.service";

interface RequestWithUser {
  headers: {
    authorization?: string;
  };
  user?: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokens: TokenService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      throw tokenRequiredException();
    }

    try {
      request.user = await this.tokens.verify(token);
      return true;
    } catch {
      throw tokenRequiredException();
    }
  }
}

function extractBearerToken(authorization?: string) {
  const [type, token] = authorization?.split(" ") ?? [];

  return type === "Bearer" ? token : undefined;
}
