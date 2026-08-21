import { describe, expect, it } from "vitest";
import { completionUpdates, type CompletableItem } from "./taskCompletion";

const items: CompletableItem[] = [
  { id: "parent-daily", sourceItemId: "parent", parentSourceId: null, completed: false },
  { id: "first-daily", sourceItemId: "first", parentSourceId: "parent", completed: false },
  { id: "second-daily", sourceItemId: "second", parentSourceId: "parent", completed: false },
];

describe("completionUpdates", () => {
  it("completes the parent when its final nested item is completed", () => {
    const current = items.map((item) => item.id === "first-daily" ? { ...item, completed: true } : item);

    expect([...completionUpdates(current, "second-daily", true)]).toEqual([
      ["parent-daily", true],
      ["second-daily", true],
    ]);
  });

  it("completes all nested items when the parent is completed", () => {
    expect([...completionUpdates(items, "parent-daily", true)]).toEqual([
      ["parent-daily", true],
      ["first-daily", true],
      ["second-daily", true],
    ]);
  });

  it("clears the parent when a nested item is cleared", () => {
    const completed = items.map((item) => ({ ...item, completed: true }));

    expect([...completionUpdates(completed, "first-daily", false)]).toEqual([
      ["parent-daily", false],
      ["first-daily", false],
    ]);
  });

  it("only completes the selected nested item when legacy links form a chain", () => {
    const chained = [
      items[0],
      items[1],
      { ...items[2], parentSourceId: "first" },
      { id: "third-daily", sourceItemId: "third", parentSourceId: "second", completed: false },
    ];

    expect([...completionUpdates(chained, "first-daily", true)]).toEqual([
      ["first-daily", true],
    ]);
  });

  it("completes the top-level parent only after every chained nested item is complete", () => {
    const chained = [
      items[0],
      { ...items[1], completed: true },
      { ...items[2], parentSourceId: "first", completed: true },
      { id: "third-daily", sourceItemId: "third", parentSourceId: "second", completed: false },
    ];

    expect([...completionUpdates(chained, "third-daily", true)]).toEqual([
      ["parent-daily", true],
      ["third-daily", true],
    ]);
  });
});
