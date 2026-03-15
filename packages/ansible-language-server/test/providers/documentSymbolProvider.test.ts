import { expect, describe, it } from "vitest";
import { SymbolKind } from "vscode-languageserver";
import { getDoc } from "@test/helper.js";
import {
  getDocumentSymbols,
  flattenSymbols,
} from "@src/providers/documentSymbolProvider.js";

describe("getDocumentSymbols()", () => {
  describe("playbook with plays, tasks, and handlers", () => {
    const textDoc = getDoc("documentSymbol/playbook.yml");
    const symbols = getDocumentSymbols(textDoc);

    it("should return symbols for all plays", () => {
      expect(symbols).not.toBeNull();
      expect(symbols).toHaveLength(2);
    });

    it("should identify plays as Struct", () => {
      expect(symbols![0].kind).toBe(SymbolKind.Struct);
      expect(symbols![1].kind).toBe(SymbolKind.Struct);
    });

    it("should use play name", () => {
      expect(symbols![0].name).toBe("Install webserver");
      expect(symbols![1].name).toBe("Configure database");
    });

    it("should include tasks section with child tasks", () => {
      const play1 = symbols![0];
      const tasksSection = play1.children?.find((c) => c.name === "tasks");
      expect(tasksSection).toBeDefined();
      expect(tasksSection!.kind).toBe(SymbolKind.Field);
      expect(tasksSection!.children).toHaveLength(2);
      expect(tasksSection!.children![0].name).toBe("Install nginx");
      expect(tasksSection!.children![0].kind).toBe(SymbolKind.Function);
    });

    it("should include handlers section", () => {
      const play1 = symbols![0];
      const handlersSection = play1.children?.find(
        (c) => c.name === "handlers",
      );
      expect(handlersSection).toBeDefined();
      expect(handlersSection!.children).toHaveLength(1);
      expect(handlersSection!.children![0].name).toBe("Restart nginx");
    });

    it("should include pre_tasks and post_tasks sections", () => {
      const play2 = symbols![1];
      const preTasksSection = play2.children?.find(
        (c) => c.name === "pre_tasks",
      );
      const postTasksSection = play2.children?.find(
        (c) => c.name === "post_tasks",
      );
      expect(preTasksSection).toBeDefined();
      expect(postTasksSection).toBeDefined();
      expect(preTasksSection!.children).toHaveLength(1);
      expect(postTasksSection!.children).toHaveLength(1);
    });
  });

  describe("playbook with blocks", () => {
    const textDoc = getDoc("documentSymbol/block.yml");
    const symbols = getDocumentSymbols(textDoc);

    it("should return play with block", () => {
      expect(symbols).not.toBeNull();
      expect(symbols).toHaveLength(1);
    });

    it("should identify block as Namespace", () => {
      const play = symbols![0];
      const tasksSection = play.children?.find((c) => c.name === "tasks");
      expect(tasksSection).toBeDefined();
      expect(tasksSection!.children).toHaveLength(1);

      const block = tasksSection!.children![0];
      expect(block.kind).toBe(SymbolKind.Namespace);
      expect(block.name).toBe("block: Main block");
    });

    it("should include block/rescue/always sections", () => {
      const block = symbols![0].children?.find((c) => c.name === "tasks")
        ?.children?.[0];
      expect(block).toBeDefined();

      const blockSection = block!.children?.find((c) => c.name === "block");
      const rescueSection = block!.children?.find((c) => c.name === "rescue");
      const alwaysSection = block!.children?.find((c) => c.name === "always");

      expect(blockSection).toBeDefined();
      expect(blockSection!.children).toHaveLength(2);
      expect(rescueSection).toBeDefined();
      expect(rescueSection!.children).toHaveLength(1);
      expect(alwaysSection).toBeDefined();
      expect(alwaysSection!.children).toHaveLength(1);
    });
  });

  describe("playbook with roles", () => {
    const textDoc = getDoc("documentSymbol/roles.yml");
    const symbols = getDocumentSymbols(textDoc);

    it("should include roles section with Package symbols", () => {
      expect(symbols).not.toBeNull();
      const play = symbols![0];
      const rolesSection = play.children?.find((c) => c.name === "roles");
      expect(rolesSection).toBeDefined();
      expect(rolesSection!.children).toHaveLength(3);

      expect(rolesSection!.children![0].name).toBe("common");
      expect(rolesSection!.children![0].kind).toBe(SymbolKind.Package);

      expect(rolesSection!.children![1].name).toBe("nginx");
      expect(rolesSection!.children![1].kind).toBe(SymbolKind.Package);

      expect(rolesSection!.children![2].name).toBe("app");
      expect(rolesSection!.children![2].kind).toBe(SymbolKind.Package);
    });
  });

  describe("tasklist without play", () => {
    const textDoc = getDoc("documentSymbol/tasklist.yml");
    const symbols = getDocumentSymbols(textDoc);

    it("should return tasks at root level", () => {
      expect(symbols).not.toBeNull();
      expect(symbols).toHaveLength(3);
    });

    it("should use task name when available", () => {
      expect(symbols![0].name).toBe("Install package");
      expect(symbols![0].kind).toBe(SymbolKind.Function);
    });

    it("should fall back to module name when name is absent", () => {
      expect(symbols![1].name).toBe("ansible.builtin.debug");
      expect(symbols![1].kind).toBe(SymbolKind.Function);
    });
  });

  describe("empty file", () => {
    const textDoc = getDoc("documentSymbol/empty.yml");
    const symbols = getDocumentSymbols(textDoc);

    it("should return null for empty file", () => {
      expect(symbols).toBeNull();
    });
  });

  describe("flattenSymbols()", () => {
    const textDoc = getDoc("documentSymbol/playbook.yml");
    const symbols = getDocumentSymbols(textDoc);

    it("should flatten hierarchical symbols", () => {
      expect(symbols).not.toBeNull();
      const flat = flattenSymbols(symbols!, "file:///test.yml");

      // All symbols should have location with uri
      for (const s of flat) {
        expect(s.location.uri).toBe("file:///test.yml");
        expect(s.location.range).toBeDefined();
      }

      // Should include plays, sections, and tasks
      const names = flat.map((s) => s.name);
      expect(names).toContain("Install webserver");
      expect(names).toContain("tasks");
      expect(names).toContain("Install nginx");
      expect(names).toContain("handlers");
      expect(names).toContain("Restart nginx");
    });

    it("should have more items than top-level symbols", () => {
      const flat = flattenSymbols(symbols!, "file:///test.yml");
      expect(flat.length).toBeGreaterThan(symbols!.length);
    });
  });
});
