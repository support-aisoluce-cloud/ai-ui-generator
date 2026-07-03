import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignInAction = vi.fn();
const mockSignUpAction = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignInAction(...args),
  signUp: (...args: unknown[]) => mockSignUpAction(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setup() {
  return renderHook(() => useAuth());
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-project-id" });
});

// ─── signIn ───────────────────────────────────────────────────────────────────

describe("signIn", () => {
  test("returns the result from the signIn action", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "proj-1" }]);

    const { result } = setup();
    let returnValue: unknown;

    await act(async () => {
      returnValue = await result.current.signIn("a@b.com", "password123");
    });

    expect(returnValue).toEqual({ success: true });
  });

  test("calls signIn action with email and password", async () => {
    mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = setup();

    await act(async () => {
      await result.current.signIn("user@example.com", "secret");
    });

    expect(mockSignInAction).toHaveBeenCalledWith("user@example.com", "secret");
  });

  test("sets isLoading to true while signing in, then false after", async () => {
    let resolveFn!: (v: unknown) => void;
    mockSignInAction.mockReturnValue(new Promise((r) => (resolveFn = r)));

    const { result } = setup();

    let promise: Promise<unknown>;
    act(() => {
      promise = result.current.signIn("a@b.com", "pass");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveFn({ success: false });
      await promise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("resets isLoading to false when action throws", async () => {
    mockSignInAction.mockRejectedValue(new Error("network error"));

    const { result } = setup();

    await act(async () => {
      await result.current.signIn("a@b.com", "pass").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("does not navigate when sign-in fails", async () => {
    mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = setup();

    await act(async () => {
      await result.current.signIn("a@b.com", "wrong");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("returns the failure result when sign-in fails", async () => {
    const failResult = { success: false, error: "Invalid credentials" };
    mockSignInAction.mockResolvedValue(failResult);

    const { result } = setup();
    let returnValue: unknown;

    await act(async () => {
      returnValue = await result.current.signIn("a@b.com", "wrong");
    });

    expect(returnValue).toEqual(failResult);
  });
});

// ─── signUp ───────────────────────────────────────────────────────────────────

describe("signUp", () => {
  test("returns the result from the signUp action", async () => {
    mockSignUpAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "proj-1" }]);

    const { result } = setup();
    let returnValue: unknown;

    await act(async () => {
      returnValue = await result.current.signUp("a@b.com", "password123");
    });

    expect(returnValue).toEqual({ success: true });
  });

  test("calls signUp action with email and password", async () => {
    mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = setup();

    await act(async () => {
      await result.current.signUp("user@example.com", "secret");
    });

    expect(mockSignUpAction).toHaveBeenCalledWith("user@example.com", "secret");
  });

  test("sets isLoading to true while signing up, then false after", async () => {
    let resolveFn!: (v: unknown) => void;
    mockSignUpAction.mockReturnValue(new Promise((r) => (resolveFn = r)));

    const { result } = setup();

    let promise: Promise<unknown>;
    act(() => {
      promise = result.current.signUp("a@b.com", "pass");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveFn({ success: false });
      await promise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("resets isLoading to false when action throws", async () => {
    mockSignUpAction.mockRejectedValue(new Error("network error"));

    const { result } = setup();

    await act(async () => {
      await result.current.signUp("a@b.com", "pass").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("does not navigate when sign-up fails", async () => {
    mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = setup();

    await act(async () => {
      await result.current.signUp("a@b.com", "pass");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});

// ─── Post-sign-in routing: anonymous work ─────────────────────────────────────

describe("post-sign-in: anonymous work with messages", () => {
  const anonWork = {
    messages: [{ role: "user", content: "make a button" }],
    fileSystemData: { "/App.jsx": "export default function App() {}" },
  };

  beforeEach(() => {
    mockGetAnonWorkData.mockReturnValue(anonWork);
    mockSignInAction.mockResolvedValue({ success: true });
    mockCreateProject.mockResolvedValue({ id: "anon-project-id" });
  });

  test("creates a project from anonymous work on successful sign-in", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalledWith({
      name: expect.stringContaining("Design from"),
      messages: anonWork.messages,
      data: anonWork.fileSystemData,
    });
  });

  test("clears anonymous work after creating project", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockClearAnonWork).toHaveBeenCalledOnce();
  });

  test("navigates to the new project created from anonymous work", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
  });

  test("does not call getProjects when anonymous work exists", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockGetProjects).not.toHaveBeenCalled();
  });
});

// ─── Post-sign-in routing: no anon work, existing projects ───────────────────

describe("post-sign-in: no anonymous work, existing projects", () => {
  beforeEach(() => {
    mockGetAnonWorkData.mockReturnValue(null);
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "existing-1" }, { id: "existing-2" }]);
  });

  test("navigates to the most recent project", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockPush).toHaveBeenCalledWith("/existing-1");
  });

  test("does not create a new project when existing projects exist", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockCreateProject).not.toHaveBeenCalled();
  });
});

// ─── Post-sign-in routing: no anon work, no projects ─────────────────────────

describe("post-sign-in: no anonymous work, no existing projects", () => {
  beforeEach(() => {
    mockGetAnonWorkData.mockReturnValue(null);
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "brand-new-id" });
  });

  test("creates a new blank project", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalledWith({
      name: expect.stringMatching(/^New Design #\d+$/),
      messages: [],
      data: {},
    });
  });

  test("navigates to the newly created blank project", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockPush).toHaveBeenCalledWith("/brand-new-id");
  });
});

// ─── Post-sign-in routing: anon work with empty messages ─────────────────────

describe("post-sign-in: anonymous work with empty messages", () => {
  beforeEach(() => {
    mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
    mockSignInAction.mockResolvedValue({ success: true });
  });

  test("falls through to existing projects when anon work has no messages", async () => {
    mockGetProjects.mockResolvedValue([{ id: "proj-fallback" }]);

    const { result } = setup();

    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockPush).toHaveBeenCalledWith("/proj-fallback");
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  test("does not clear anon work when messages are empty", async () => {
    mockGetProjects.mockResolvedValue([{ id: "proj-fallback" }]);

    const { result } = setup();

    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockClearAnonWork).not.toHaveBeenCalled();
  });
});

// ─── signUp post-sign-in routing ─────────────────────────────────────────────

describe("signUp post-sign-in routing", () => {
  test("navigates to existing project after successful sign-up", async () => {
    mockSignUpAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([{ id: "proj-after-signup" }]);

    const { result } = setup();

    await act(async () => {
      await result.current.signUp("new@user.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/proj-after-signup");
  });

  test("creates project from anon work after successful sign-up", async () => {
    mockSignUpAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({
      messages: [{ role: "user", content: "hello" }],
      fileSystemData: { "/App.jsx": "" },
    });
    mockCreateProject.mockResolvedValue({ id: "signup-anon-project" });

    const { result } = setup();

    await act(async () => {
      await result.current.signUp("new@user.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/signup-anon-project");
    expect(mockClearAnonWork).toHaveBeenCalledOnce();
  });
});

// ─── initial state ────────────────────────────────────────────────────────────

describe("initial state", () => {
  test("isLoading starts as false", () => {
    const { result } = setup();
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn, signUp, and isLoading", () => {
    const { result } = setup();
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(typeof result.current.isLoading).toBe("boolean");
  });
});
