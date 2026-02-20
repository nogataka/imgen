import { describe, expect, it } from "vitest";
import { LANGUAGE_DESCRIPTIONS } from "./lang.js";

describe("LANGUAGE_DESCRIPTIONS", () => {
  it("should have all supported languages", () => {
    expect(LANGUAGE_DESCRIPTIONS).toEqual({
      ja: "日本語", en: "英語", zh: "中国語", ko: "韓国語",
      es: "スペイン語", fr: "フランス語", de: "ドイツ語",
      it: "イタリア語", ru: "ロシア語", vi: "ベトナム語",
    });
  });

  it("should have 10 languages", () => {
    expect(Object.keys(LANGUAGE_DESCRIPTIONS).length).toBe(10);
  });
});
