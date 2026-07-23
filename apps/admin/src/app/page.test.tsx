import { describe, it, expect } from "@jest/globals";
import { render } from "@testing-library/react";
import HomePage from "./page";

describe("HomePage", () => {
  it("throws a NEXT_REDIRECT when rendered (redirect to /login)", () => {
    let caught: unknown;
    try {
      render(<HomePage />);
    } catch (error) {
      caught = error;
    }
    // The redirect() call throws an error with digest "NEXT_REDIRECT;replace;/login;307;"
    expect(caught).toBeDefined();
    expect(String((caught as Error).message)).toBe("NEXT_REDIRECT");
  });

  it("redirect destination matches /login", () => {
    let caught: unknown;
    try {
      render(<HomePage />);
    } catch (error) {
      caught = error;
    }
    const digest = (caught as { digest?: string }).digest ?? "";
    // digest format: NEXT_REDIRECT;type;url;status;
    const parts = digest.split(";");
    expect(parts[2]).toBe("/login");
  });
});
