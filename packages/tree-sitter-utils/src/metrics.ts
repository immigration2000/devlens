import type Parser from "web-tree-sitter";

/**
 * Compute cyclomatic complexity for a given AST node
 * Cyclomatic complexity = number of linearly independent paths through code
 * Base complexity is 1, incremented by 1 for each decision point
 */
export function computeCyclomaticComplexity(rootNode: Parser.SyntaxNode): number {
  if (!rootNode) {
    return 0;
  }

  let complexity = 1; // Base complexity

  function traverse(node: Parser.SyntaxNode) {
    // Count decision points
    if (
      node.type === "if_statement" ||
      node.type === "switch_statement" ||
      node.type === "while_statement" ||
      node.type === "for_statement" ||
      node.type === "do_statement" ||
      node.type === "catch_clause" ||
      node.type === "ternary_expression"
    ) {
      complexity++;
    }

    // Count logical operators as decision points
    if (
      node.type === "binary_expression" &&
      (node.text?.includes("&&") || node.text?.includes("||"))
    ) {
      complexity++;
    }

    // Recurse through children
    let child = node.child(0);
    while (child) {
      traverse(child);
      child = child.nextSibling;
    }
  }

  traverse(rootNode);
  return complexity;
}

/**
 * Compute cognitive complexity for a given AST node
 * Similar to cyclomatic but adds weight for nesting depth
 * Each decision point adds 1 + current nesting depth
 */
export function computeCognitiveComplexity(rootNode: Parser.SyntaxNode): number {
  if (!rootNode) {
    return 0;
  }

  let complexity = 0;
  const nesting: { [key: string]: number } = {};

  function traverse(node: Parser.SyntaxNode, depth: number = 0) {
    const nodeKey = `${node.type}_${node.startIndex}`;
    nesting[nodeKey] = depth;

    // Increment nesting for control structures
    let nextDepth = depth;
    if (
      node.type === "if_statement" ||
      node.type === "for_statement" ||
      node.type === "while_statement" ||
      node.type === "do_statement" ||
      node.type === "switch_statement" ||
      node.type === "try_statement" ||
      node.type === "arrow_function" ||
      node.type === "function_declaration"
    ) {
      nextDepth = depth + 1;
    }

    // Add complexity for decision points
    if (
      node.type === "if_statement" ||
      node.type === "switch_statement" ||
      node.type === "while_statement" ||
      node.type === "for_statement" ||
      node.type === "do_statement" ||
      node.type === "catch_clause" ||
      node.type === "ternary_expression"
    ) {
      complexity += 1 + depth;
    }

    // Count logical operators with nesting penalty
    if (
      node.type === "binary_expression" &&
      (node.text?.includes("&&") || node.text?.includes("||"))
    ) {
      complexity += 1 + depth;
    }

    // Recurse through children
    let child = node.child(0);
    while (child) {
      traverse(child, nextDepth);
      child = child.nextSibling;
    }
  }

  traverse(rootNode);
  return complexity;
}

/**
 * Function metric information
 */
export interface FunctionMetric {
  name: string;
  startLine: number;
  endLine: number;
  lineCount: number;
  paramCount: number;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  nestingDepth: number;
}

/**
 * Compute metrics for all functions in a tree
 */
export function computeFunctionMetrics(
  rootNode: Parser.SyntaxNode
): FunctionMetric[] {
  if (!rootNode) {
    return [];
  }

  const functions: FunctionMetric[] = [];
  const maxNestingMap: { [key: string]: number } = {};

  function traverse(node: Parser.SyntaxNode, nestingDepth: number = 0): void {
    // Update max nesting depth
    const nodeKey = `${node.type}_${node.startIndex}`;
    if (!maxNestingMap[nodeKey] || maxNestingMap[nodeKey] < nestingDepth) {
      maxNestingMap[nodeKey] = nestingDepth;
    }

    // Find function and arrow function declarations
    if (node.type === "function_declaration" || node.type === "arrow_function") {
      const name = extractFunctionName(node);
      const startLine = node.startPosition.row + 1;
      const endLine = node.endPosition.row + 1;
      const lineCount = endLine - startLine + 1;
      const paramCount = countFunctionParams(node);
      const cyclomaticComplexity = computeCyclomaticComplexity(node);
      const cognitiveComplexity = computeCognitiveComplexity(node);

      functions.push({
        name,
        startLine,
        endLine,
        lineCount,
        paramCount,
        cyclomaticComplexity,
        cognitiveComplexity,
        nestingDepth,
      });
    }

    // Increment nesting for control structures
    let nextNestingDepth = nestingDepth;
    if (
      node.type === "if_statement" ||
      node.type === "for_statement" ||
      node.type === "while_statement" ||
      node.type === "do_statement" ||
      node.type === "switch_statement" ||
      node.type === "try_statement"
    ) {
      nextNestingDepth = nestingDepth + 1;
    }

    // Recurse through children
    let child = node.child(0);
    while (child) {
      traverse(child, nextNestingDepth);
      child = child.nextSibling;
    }
  }

  traverse(rootNode);
  return functions;
}

/**
 * Compute maximum nesting depth in the tree
 */
export function computeMaxNestingDepth(rootNode: Parser.SyntaxNode): number {
  if (!rootNode) {
    return 0;
  }

  let maxDepth = 0;

  function traverse(node: Parser.SyntaxNode, depth: number = 0): void {
    if (depth > maxDepth) {
      maxDepth = depth;
    }

    // Increment depth for control structures
    let nextDepth = depth;
    if (
      node.type === "if_statement" ||
      node.type === "for_statement" ||
      node.type === "while_statement" ||
      node.type === "do_statement" ||
      node.type === "switch_statement" ||
      node.type === "try_statement" ||
      node.type === "block"
    ) {
      nextDepth = depth + 1;
    }

    // Recurse through children
    let child = node.child(0);
    while (child) {
      traverse(child, nextDepth);
      child = child.nextSibling;
    }
  }

  traverse(rootNode);
  return maxDepth;
}

/**
 * Extract function name from a function declaration or arrow function
 */
function extractFunctionName(node: Parser.SyntaxNode): string {
  if (node.type === "function_declaration") {
    // function name() { ... }
    const identifier = node.childForFieldName("name");
    if (identifier) {
      return identifier.text;
    }
  } else if (node.type === "arrow_function") {
    // const name = () => { ... } or (params) => { ... }
    // Try to get parent which should be variable_declarator
    const parent = node.parent;
    if (parent && parent.type === "variable_declarator") {
      const nameNode = parent.childForFieldName("name");
      if (nameNode) {
        return nameNode.text;
      }
    }
  }

  return "anonymous";
}

/**
 * Count function parameters
 */
function countFunctionParams(node: Parser.SyntaxNode): number {
  if (node.type === "function_declaration") {
    const formalParams = node.childForFieldName("parameters");
    if (formalParams) {
      // Count commas and add 1 (unless empty)
      const text = formalParams.text;
      if (text === "()" || text === "( )") {
        return 0;
      }
      const commaCount = (text.match(/,/g) || []).length;
      return commaCount + 1;
    }
  } else if (node.type === "arrow_function") {
    const params = node.childForFieldName("parameters");
    if (params) {
      const text = params.text;
      if (text === "()" || text === "( )" || text.length === 0) {
        return 0;
      }
      const commaCount = (text.match(/,/g) || []).length;
      return commaCount + 1;
    }
  }

  return 0;
}
