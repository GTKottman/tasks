import { describe, expect, it } from "vitest";
import { defaultSettings, normalizeSettings, resolveTheme } from "./settings";

describe("settings helpers", () => {
  it("resolves light and dark themes correctly", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("keeps persisted MTV mode and saved preferences", () => {
    const normalized = normalizeSettings({
      theme: "dark",
      sounds: false,
      density: "compact",
      reduceMotion: true,
      mtv90sTheme: true,
    }, "on");

    expect(normalized).toEqual({
      theme: "dark",
      sounds: false,
      density: "compact",
      reduceMotion: true,
      mtv90sTheme: true,
    });
  });

  it("falls back to defaults for invalid values and honors legacy sound off", () => {
    const normalized = normalizeSettings({
      theme: "retro" as never,
      density: "tight" as never,
      reduceMotion: "yes" as never,
      mtv90sTheme: "on" as never,
    }, "off");

    expect(normalized).toEqual({
      ...defaultSettings,
      sounds: false,
    });
  });
});
