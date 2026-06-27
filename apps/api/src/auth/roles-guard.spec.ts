import { RolesGuard } from './roles.guard';
import { UserRole } from '@prisma/client';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';

function createMockExecutionContext(userRole: UserRole | undefined, requiredRoles: UserRole[] | undefined): ExecutionContext {
  const req = { userRole };
  const mockContext = {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;

  return mockContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let mockReflector: any;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new RolesGuard(mockReflector);
  });

  it('should allow access if no roles are required', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined); // no roles metadata
    const ctx = createMockExecutionContext(UserRole.CLIENT_VIEWER, undefined);

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access if user has required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.OPERATOR]);
    const ctx = createMockExecutionContext(UserRole.OPERATOR, [UserRole.ADMIN, UserRole.OPERATOR]);

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException if user role does not match', () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const ctx = createMockExecutionContext(UserRole.CLIENT_VIEWER, [UserRole.ADMIN]);

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user role is missing from request', () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const ctx = createMockExecutionContext(undefined, [UserRole.ADMIN]);

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
