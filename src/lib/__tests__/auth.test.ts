// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

// Mock server-only so it doesn't throw outside Next.js server context
vi.mock("server-only", () => ({}));

// Mock next/headers cookies()
const mockCookieGet = vi.fn();
const mockCookieSet = vi.fn();
const mockCookieDelete = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: mockCookieGet,
    set: mockCookieSet,
    delete: mockCookieDelete,
  })),
}));

const { createSession, getSession, deleteSession, verifySession } =
  await import("../auth");

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: object, expiresIn = "7d") {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

// ─── createSession ────────────────────────────────────────────────────────────

describe("createSession", () => {
  beforeEach(() => {
    mockCookieSet.mockClear();
  });

  test("sets an auth-token cookie", async () => {
    await createSession("user-1", "test@example.com");

    expect(mockCookieSet).toHaveBeenCalledOnce();
    expect(mockCookieSet.mock.calls[0][0]).toBe("auth-token");
  });

  test("cookie contains a valid JWT token", async () => {
    await createSession("user-1", "test@example.com");

    const token = mockCookieSet.mock.calls[0][1] as string;
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload).toBeDefined();
  });

  test("JWT payload contains the correct userId and email", async () => {
    await createSession("user-42", "kenny@stomp.com");

    const token = mockCookieSet.mock.calls[0][1] as string;
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("kenny@stomp.com");
  });

  test("cookie is set with httpOnly flag", async () => {
    await createSession("user-1", "test@example.com");

    const options = mockCookieSet.mock.calls[0][2] as Record<string, unknown>;
    expect(options.httpOnly).toBe(true);
  });

  test("cookie is set with sameSite lax", async () => {
    await createSession("user-1", "test@example.com");

    const options = mockCookieSet.mock.calls[0][2] as Record<string, unknown>;
    expect(options.sameSite).toBe("lax");
  });

  test("cookie is set with path /", async () => {
    await createSession("user-1", "test@example.com");

    const options = mockCookieSet.mock.calls[0][2] as Record<string, unknown>;
    expect(options.path).toBe("/");
  });

  test("cookie expires approximately 7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "test@example.com");
    const after = Date.now();

    const options = mockCookieSet.mock.calls[0][2] as Record<string, unknown>;
    const expires = (options.expires as Date).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expires).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expires).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });
});

// ─── getSession ───────────────────────────────────────────────────────────────

describe("getSession", () => {
  beforeEach(() => {
    mockCookieGet.mockReset();
  });

  test("returns null when no auth-token cookie is present", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns the session payload for a valid token", async () => {
    const token = await makeToken({ userId: "user-1", email: "a@b.com" });
    mockCookieGet.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session?.userId).toBe("user-1");
    expect(session?.email).toBe("a@b.com");
  });

  test("returns null for a tampered token", async () => {
    mockCookieGet.mockReturnValue({ value: "not.a.valid.jwt" });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const token = await makeToken(
      { userId: "user-1", email: "a@b.com" },
      "-1s"
    );
    mockCookieGet.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).toBeNull();
  });
});

// ─── deleteSession ────────────────────────────────────────────────────────────

describe("deleteSession", () => {
  beforeEach(() => {
    mockCookieDelete.mockClear();
  });

  test("calls delete on the cookie store", async () => {
    await deleteSession();

    expect(mockCookieDelete).toHaveBeenCalledOnce();
  });

  test("deletes the auth-token cookie by name", async () => {
    await deleteSession();

    expect(mockCookieDelete).toHaveBeenCalledWith("auth-token");
  });
});

// ─── verifySession ────────────────────────────────────────────────────────────

describe("verifySession", () => {
  test("returns null when request has no auth-token cookie", async () => {
    const request = new NextRequest("http://localhost/");

    const session = await verifySession(request);

    expect(session).toBeNull();
  });

  test("returns the session payload for a valid token in the request", async () => {
    const token = await makeToken({ userId: "user-99", email: "z@z.com" });
    const request = new NextRequest("http://localhost/", {
      headers: { cookie: `auth-token=${token}` },
    });

    const session = await verifySession(request);

    expect(session?.userId).toBe("user-99");
    expect(session?.email).toBe("z@z.com");
  });

  test("returns null for a tampered token in the request", async () => {
    const request = new NextRequest("http://localhost/", {
      headers: { cookie: "auth-token=bad.token.value" },
    });

    const session = await verifySession(request);

    expect(session).toBeNull();
  });

  test("returns null for an expired token in the request", async () => {
    const token = await makeToken(
      { userId: "user-1", email: "a@b.com" },
      "-1s"
    );
    const request = new NextRequest("http://localhost/", {
      headers: { cookie: `auth-token=${token}` },
    });

    const session = await verifySession(request);

    expect(session).toBeNull();
  });
});
