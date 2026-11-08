import { expect, test } from "@playwright/test";

test("(log in if required,) create a site, work a task across views, see it on the dashboard and flags", async ({ page }) => {
  await page.goto("/readiness");
  if (process.env.REQUIRE_LOGIN === "true") {
    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel("Email").fill("admin@readiness.local");
    await page.getByLabel("Password").fill("readiness");
    await page.getByRole("button", { name: "Sign in" }).click();
  }
  await expect(page.getByRole("heading", { name: "Sites" })).toBeVisible();

  // create a site from the seeded template
  await page.getByRole("link", { name: "+ New site" }).click();
  await page.getByLabel("Site name *").fill("E2E Test Tower");
  await page.getByRole("button", { name: "Create site" }).click();
  await expect(page.getByRole("heading", { name: "E2E Test Tower" })).toBeVisible();

  // open the Onboarding workstream and make the first task overdue
  await page.getByRole("link", { name: /Onboarding/ }).first().click();
  const row = () => page.locator("table").first().locator("tbody tr").first();
  await row().getByLabel("target date").fill("2020-01-01");
  await expect(row().locator('[title^="Red"]')).toBeVisible();

  // it appears on the Flags tab
  await page.getByRole("link", { name: "Flags", exact: true }).click();
  await expect(page.getByText(/days overdue/).first()).toBeVisible();

  // complete it with the status picker — the flag clears and progress goes to 100%
  await page.getByRole("link", { name: "Workstreams" }).click();
  await page.getByRole("link", { name: "Onboarding", exact: true }).click();
  await row().getByRole("button", { name: "status" }).click();
  await page.getByRole("menuitem", { name: "Completed" }).click();
  await expect(row().locator('[title^="Green"]')).toBeVisible();
  await expect(row().getByText("100%")).toBeVisible();

  // post an update on the task
  await row().getByTitle("Open task").click();
  await page.getByLabel("Write an update").fill("Client confirmed today");
  await page.getByRole("button", { name: "Update", exact: true }).click();
  await expect(page.getByText("Client confirmed today")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(row().getByTitle("1 update")).toBeVisible();

  // approval: add a person, make them approver on another task, complete it, approve it
  await page.getByRole("link", { name: "Contacts" }).click();
  await page.getByRole("button", { name: "+ Add contact" }).click();
  await page.locator("input[name=name]").fill("Pat Client");
  await page.locator("input[name=initials]").fill("PC");
  await page.getByRole("button", { name: "Save contact" }).click();
  await expect(page.getByRole("cell", { name: "Pat Client" })).toBeVisible();
  await page.getByRole("link", { name: "Workstreams" }).click();
  await page.getByRole("link", { name: "Onboarding", exact: true }).click();
  const second = page.locator("table").first().locator("tbody tr").nth(1);
  await second.getByRole("button", { name: "Approver", exact: true }).click();
  await page.getByRole("menuitem", { name: /Pat Client/ }).click();
  await second.getByRole("button", { name: "status" }).click();
  await page.getByRole("menuitem", { name: "Completed" }).click();
  await expect(second.getByRole("button", { name: "status" })).toHaveText("Awaiting approval");
  await second.getByTitle("Open task").click();
  await expect(page.getByText("Waiting for approval from")).toBeVisible();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText(/Approved by/)).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(second.getByRole("button", { name: "status" })).toHaveText("Completed");

  // other views render the same tasks
  await page.getByRole("tab", { name: /Bucket/ }).click();
  await expect(page.getByText("Drop tasks here").or(page.locator("[draggable=true]")).first()).toBeVisible();
  await page.getByRole("tab", { name: /Timeline/ }).click();
  await expect(page.getByRole("button", { name: "Jump to today" })).toBeVisible();
  await page.getByRole("tab", { name: /Calendar/ }).click();
  await expect(page.getByText("Mon", { exact: true })).toBeVisible();

  // dashboard and flags reflect the change
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByText("Tasks by status")).toBeVisible();
  await page.getByRole("link", { name: "Flags", exact: true }).click();
  await expect(page.getByText("No red or yellow flags")).toBeVisible();
});
