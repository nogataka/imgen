import { describe, expect, it, vi } from "vitest";
import {
  createErrorOutput,
  createSuccessOutput,
  printJson,
  type JsonErrorOutput,
  type JsonSuccessOutput,
} from "./output.js";

describe("output", () => {
  describe("createSuccessOutput", () => {
    it("should create success output with result", () => {
      const output = createSuccessOutput("test", { data: "value" });
      expect(output).toEqual({
        success: true,
        command: "test",
        result: { data: "value" },
      });
    });

    it("should create success output with complex result", () => {
      const result = {
        path: "/path/to/file.png",
        format: "png",
        size: "1024x1024",
      };
      const output = createSuccessOutput("image gen", result);
      expect(output.success).toBe(true);
      expect(output.command).toBe("image gen");
      expect(output.result).toEqual(result);
    });
  });

  describe("createErrorOutput", () => {
    it("should create error output with message", () => {
      const output = createErrorOutput("test", "Something went wrong");
      expect(output).toEqual({
        success: false,
        command: "test",
        error: { message: "Something went wrong" },
      });
    });

    it("should create error output with message and code", () => {
      const output = createErrorOutput("test", "File not found", "FILE_NOT_FOUND");
      expect(output).toEqual({
        success: false,
        command: "test",
        error: { message: "File not found", code: "FILE_NOT_FOUND" },
      });
    });

    it("should not include code when undefined", () => {
      const output = createErrorOutput("test", "Error message", undefined);
      expect(output.error).not.toHaveProperty("code");
    });
  });

  describe("printJson", () => {
    it("should print JSON to console", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      const output: JsonSuccessOutput<{ data: string }> = {
        success: true,
        command: "test",
        result: { data: "value" },
      };
      printJson(output);
      expect(spy).toHaveBeenCalledWith(JSON.stringify(output, null, 2));
      spy.mockRestore();
    });
  });
});
