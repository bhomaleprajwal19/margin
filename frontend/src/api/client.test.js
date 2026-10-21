import { describe, expect, it } from "vitest";
import { ApiError } from "./client";

describe("ApiError", () => {
  it("uses DRF's detail message", () => {
    expect(new ApiError(401, { detail: "Invalid token." }).message).toBe("Invalid token.");
  });

  it("joins non-field errors", () => {
    const err = new ApiError(400, { non_field_errors: ["Username or password is incorrect."] });
    expect(err.message).toBe("Username or password is incorrect.");
    expect(err.fields).toEqual({});
  });

  it("maps field errors for forms", () => {
    const err = new ApiError(400, { name: ["Too long.", "Already used."], color: "Bad." });
    expect(err.fields).toEqual({ name: "Too long. Already used.", color: "Bad." });
  });

  it("falls back to the status code", () => {
    expect(new ApiError(500, null).message).toBe("Request failed (500)");
  });
});

describe("api()", () => {
  it("turns a network failure into a readable error", async () => {
    globalThis.window = { location: { origin: "http://localhost" } };
    globalThis.localStorage = { getItem: () => null };
    globalThis.fetch = () => Promise.reject(new TypeError("Failed to fetch"));
    const { api } = await import("./client");
    await expect(api("/health/")).rejects.toMatchObject({ status: 0 });
  });
});
