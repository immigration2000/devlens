import { describe, it, expect } from "vitest";
import {
  computeCyclomaticComplexity,
  computeCognitiveComplexity,
  computeFunctionMetrics,
  computeMaxNestingDepth,
} from "../metrics";

// Mock SyntaxNode structure for testing
interface MockSyntaxNode {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  startIndex: number;
  endIndex: number;
  childCount: number;
  children: MockSyntaxNode[];
  parent?: MockSyntaxNode;

  child(index: number): MockSyntaxNode | null;
  nextSibling: MockSyntaxNode | null;
  childForFieldName(fieldName: string): MockSyntaxNode | null;
}

/**
 * Create a mock syntax node for testing
 */
function createMockNode(
  type: string,
  text: string,
  startRow: number = 0,
  startCol: number = 0,
  endRow: number = 0,
  endCol: number = 0,
  children: MockSyntaxNode[] = []
): MockSyntaxNode {
  const node: MockSyntaxNode = {
    type,
    text,
    startPosition: { row: startRow, column: startCol },
    endPosition: { row: endRow, column: endCol },
    startIndex: 0,
    endIndex: 0,
    childCount: children.length,
    children,
    nextSibling: null,

    child(index: number) {
      return children[index] || null;
    },

    childForFieldName(fieldName: string): MockSyntaxNode | null {
      // Find child by field name - simplified for testing
      if (fieldName === "name") {
        return children[0] || null;
      }
      if (fieldName === "parameters") {
        return children.find((c) => c.type === "formal_parameters") || null;
      }
      return null;
    },
  };

  // Link siblings
  for (let i = 0; i < children.length - 1; i++) {
    children[i].nextSibling = children[i + 1];
    children[i].parent = node;
  }
  if (children.length > 0) {
    children[children.length - 1].nextSibling = null;
    children[children.length - 1].parent = node;
  }

  return node as any;
}

describe("Complexity Metrics", () => {
  it("should compute cyclomatic complexity 1 for simple function with no branches", () => {
    const mockNode = createMockNode("function_declaration", "function foo() { return 1; }");
    const complexity = computeCyclomaticComplexity(mockNode as any);
    expect(complexity).toBe(1);
  });

  it("should compute cyclomatic complexity for function with if statement", () => {
    const ifNode = createMockNode("if_statement", "if (x > 0) {}");
    const funcNode = createMockNode("function_declaration", "function foo() { if (x > 0) {} }", 0, 0, 2, 0, [
      ifNode,
    ]);
    const complexity = computeCyclomaticComplexity(funcNode as any);
    expect(complexity).toBeGreaterThanOrEqual(2);
  });

  it("should increment complexity for multiple if statements", () => {
    const if1 = createMockNode("if_statement", "if (x) {}");
    const if2 = createMockNode("if_statement", "if (y) {}");
    const if3 = createMockNode("if_statement", "if (z) {}");
    const funcNode = createMockNode(
      "function_declaration",
      "function foo() { if (x) {} if (y) {} if (z) {} }",
      0,
      0,
      4,
      0,
      [if1, if2, if3]
    );
    const complexity = computeCyclomaticComplexity(funcNode as any);
    expect(complexity).toBeGreaterThanOrEqual(3);
  });

  it("should count logical operators in complexity", () => {
    const binaryExpr = createMockNode("binary_expression", "x && y");
    const funcNode = createMockNode(
      "function_declaration",
      "function foo() { return x && y; }",
      0,
      0,
      1,
      0,
      [binaryExpr]
    );
    const complexity = computeCyclomaticComplexity(funcNode as any);
    expect(complexity).toBeGreaterThanOrEqual(2);
  });

  it("should compute cognitive complexity with nesting penalty", () => {
    const ifNode = createMockNode("if_statement", "if (x) {}");
    const funcNode = createMockNode("function_declaration", "function foo() { if (x) {} }", 0, 0, 1, 0, [
      ifNode,
    ]);
    const cognitive = computeCognitiveComplexity(funcNode as any);
    expect(cognitive).toBeGreaterThan(0);
  });

  it("should increase cognitive complexity with nesting", () => {
    const innerIf = createMockNode("if_statement", "if (y) {}");
    const outerIf = createMockNode("if_statement", "if (x) { if (y) {} }", 1, 0, 2, 0, [
      innerIf,
    ]);
    const funcNode = createMockNode(
      "function_declaration",
      "function foo() { if (x) { if (y) {} } }",
      0,
      0,
      3,
      0,
      [outerIf]
    );
    const cognitive = computeCognitiveComplexity(funcNode as any);
    expect(cognitive).toBeGreaterThan(0);
  });

  it("should compute max nesting depth", () => {
    const innerIf = createMockNode("if_statement", "if (y) {}");
    const outerIf = createMockNode("if_statement", "if (x) { if (y) {} }", 1, 0, 2, 0, [
      innerIf,
    ]);
    const funcNode = createMockNode(
      "function_declaration",
      "function foo() { if (x) { if (y) {} } }",
      0,
      0,
      3,
      0,
      [outerIf]
    );
    const maxDepth = computeMaxNestingDepth(funcNode as any);
    expect(maxDepth).toBeGreaterThan(1);
  });
});

describe("Function Metrics", () => {
  it("should extract function name", () => {
    const nameNode = createMockNode("identifier", "myFunc");
    const funcNode = createMockNode(
      "function_declaration",
      "function myFunc() { return 1; }",
      0,
      0,
      1,
      0,
      [nameNode]
    );
    nameNode.parent = funcNode;

    const metrics = computeFunctionMetrics(funcNode as any);
    expect(metrics.length).toBeGreaterThan(0);
    if (metrics.length > 0) {
      expect(metrics[0].name).toBeDefined();
    }
  });

  it("should calculate function line count", () => {
    const funcNode = createMockNode(
      "function_declaration",
      "function foo() {\n  return 1;\n}",
      0,
      0,
      2,
      0
    );
    const metrics = computeFunctionMetrics(funcNode as any);
    expect(metrics.length).toBeGreaterThan(0);
    if (metrics.length > 0) {
      expect(metrics[0].lineCount).toBeGreaterThan(0);
    }
  });

  it("should compute cyclomatic complexity per function", () => {
    const ifNode = createMockNode("if_statement", "if (x) {}");
    const nameNode = createMockNode("identifier", "testFunc");
    const funcNode = createMockNode(
      "function_declaration",
      "function testFunc() {\n  if (x) {}\n}",
      0,
      0,
      2,
      0,
      [nameNode, ifNode]
    );
    nameNode.parent = funcNode;

    const metrics = computeFunctionMetrics(funcNode as any);
    expect(metrics.length).toBeGreaterThan(0);
    if (metrics.length > 0) {
      expect(metrics[0].cyclomaticComplexity).toBeGreaterThan(0);
    }
  });
});

describe("Edge Cases", () => {
  it("should handle null nodes gracefully", () => {
    const complexity = computeCyclomaticComplexity(null as any);
    expect(complexity).toBe(0);

    const cognitive = computeCognitiveComplexity(null as any);
    expect(cognitive).toBe(0);

    const metrics = computeFunctionMetrics(null as any);
    expect(metrics).toEqual([]);

    const maxDepth = computeMaxNestingDepth(null as any);
    expect(maxDepth).toBe(0);
  });

  it("should handle empty trees", () => {
    const emptyNode = createMockNode("program", "");
    const complexity = computeCyclomaticComplexity(emptyNode as any);
    expect(complexity).toBe(1); // Base complexity

    const cognitive = computeCognitiveComplexity(emptyNode as any);
    expect(cognitive).toBe(0);
  });
});
