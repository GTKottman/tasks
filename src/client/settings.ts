export type ThemePreference = "system" | "light" | "dark";
export type DensityPreference = "comfortable" | "compact";
export type AppSettings = {
  theme: ThemePreference;
  sounds: boolean;
  density: DensityPreference;
  reduceMotion: boolean;
  mtv90sTheme: boolean;
};

export const SETTINGS_KEY = "daily-routines-settings";
export const SETTINGS_EVENT = "daily-routines-settings-changed";

export const defaultSettings: AppSettings = {
  theme: "system",
  sounds: true,
  density: "comfortable",
  reduceMotion: false,
  mtv90sTheme: false,
};

const themeValues: ThemePreference[] = ["system", "light", "dark"];
const densityValues: DensityPreference[] = ["comfortable", "compact"];

function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && themeValues.includes(value as ThemePreference);
}

function isDensityPreference(value: unknown): value is DensityPreference {
  return typeof value === "string" && densityValues.includes(value as DensityPreference);
}

export function resolveTheme(theme: ThemePreference, prefersDark: boolean): "light" | "dark" {
  return theme === "dark" || (theme === "system" && prefersDark) ? "dark" : "light";
}

export function normalizeSettings(saved: Partial<AppSettings>, legacySoundPreference: string | null): AppSettings {
  return {
    theme: isThemePreference(saved.theme) ? saved.theme : defaultSettings.theme,
    sounds: typeof saved.sounds === "boolean" ? saved.sounds : legacySoundPreference !== "off",
    density: isDensityPreference(saved.density) ? saved.density : defaultSettings.density,
    reduceMotion: typeof saved.reduceMotion === "boolean" ? saved.reduceMotion : defaultSettings.reduceMotion,
    mtv90sTheme: typeof saved.mtv90sTheme === "boolean" ? saved.mtv90sTheme : defaultSettings.mtv90sTheme,
  };
}

export function readSettings(storage: Storage = localStorage): AppSettings {
  try {
    const saved = JSON.parse(storage.getItem(SETTINGS_KEY) ?? "{}") as Partial<AppSettings>;
    return normalizeSettings(saved, storage.getItem("routine-sound"));
  } catch {
    return { ...defaultSettings };
  }
}

export function applySettings(settings: AppSettings, root: HTMLElement = document.documentElement) {
  const isDark = resolveTheme(settings.theme, window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = isDark;
  root.dataset.density = settings.density;
  root.dataset.reduceMotion = String(settings.reduceMotion);
  root.dataset.styleVariant = settings.mtv90sTheme ? "mtv-90s" : "default";
}

export function saveSettings(settings: AppSettings, storage: Storage = localStorage) {
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  storage.setItem("routine-sound", settings.sounds ? "on" : "off");
  applySettings(settings);
  window.dispatchEvent(new CustomEvent<AppSettings>(SETTINGS_EVENT, { detail: settings }));
}
