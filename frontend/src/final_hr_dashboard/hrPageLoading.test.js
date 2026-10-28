import { describe, it, expect } from "vitest"; // using Jest? delete this line
import { getPageTitle, shouldShowLoader, HR_PAGE_LOADING_MS } from "./hrPageLoading";

describe("hrPageLoading", () => {
  it("uses a friendly title for the dashboard page", () => {
    expect(getPageTitle("Dashboard")).toBe("HR Dashboard");
    expect(getPageTitle("Payroll System")).toBe("Payroll System");
  });
  it("shows the loader only when the page changes", () => {
    expect(shouldShowLoader("Dashboard", "Dashboard")).toBe(false);
    expect(shouldShowLoader("Dashboard", "My Task")).toBe(true);
  });
  it("has a short default delay", () => {
    expect(HR_PAGE_LOADING_MS).toBeGreaterThan(0);
    expect(HR_PAGE_LOADING_MS).toBeLessThan(1000);
  });
});
