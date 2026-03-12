import { test, expect, vi, beforeEach } from "vitest";

const mockSign = vi.fn().mockResolvedValue("mock.jwt.token");
const mockSetExpirationTime = vi.fn().mockReturnThis();
const mockSetIssuedAt = vi.fn().mockReturnThis();
const mockSetProtectedHeader = vi.fn().mockReturnThis();
const MockSignJWT = vi.fn().mockImplementation(() => ({
  setProtectedHeader: mockSetProtectedHeader,
  setExpirationTime: mockSetExpirationTime,
  setIssuedAt: mockSetIssuedAt,
  sign: mockSign,
}));

vi.mock("server-only", () => ({}));
vi.mock("jose", () => ({ SignJWT: MockSignJWT, jwtVerify: vi.fn() }));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const { createSession } = await import("@/lib/auth");

beforeEach(() => {
  vi.clearAllMocks();
  mockSign.mockResolvedValue("mock.jwt.token");
  mockSetProtectedHeader.mockReturnThis();
  mockSetExpirationTime.mockReturnThis();
  mockSetIssuedAt.mockReturnThis();
});

test("createSession creates a JWT with userId and email in the payload", async () => {
  await createSession("user-123", "test@example.com");

  expect(MockSignJWT).toHaveBeenCalledWith(
    expect.objectContaining({ userId: "user-123", email: "test@example.com" })
  );
});

test("createSession signs the JWT with HS256 and 7d expiry", async () => {
  await createSession("user-123", "test@example.com");

  expect(mockSetProtectedHeader).toHaveBeenCalledWith({ alg: "HS256" });
  expect(mockSetExpirationTime).toHaveBeenCalledWith("7d");
  expect(mockSetIssuedAt).toHaveBeenCalled();
  expect(mockSign).toHaveBeenCalled();
});

test("createSession sets an httpOnly cookie named auth-token", async () => {
  await createSession("user-123", "test@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();
  const [name, token, options] = mockCookieStore.set.mock.calls[0];
  expect(name).toBe("auth-token");
  expect(token).toBe("mock.jwt.token");
  expect(options.httpOnly).toBe(true);
  expect(options.path).toBe("/");
  expect(options.sameSite).toBe("lax");
});

test("createSession sets cookie expiry to ~7 days from now", async () => {
  const before = Date.now();
  await createSession("user-123", "test@example.com");
  const after = Date.now();

  const expires: Date = mockCookieStore.set.mock.calls[0][2].expires;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 100);
  expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 100);
});
