// Fix Node.js 25+ Web Storage SSR compatibility.
// Replaces node-compat.cjs --require workaround.
export async function register() {
  if (typeof globalThis !== "undefined" && typeof window === "undefined") {
    delete (globalThis as any).localStorage;
    delete (globalThis as any).sessionStorage;
  }
}
