import type Parser from "web-tree-sitter";

export interface ASTNode {
  id: string;
  type: string;
  name?: string;
  line: number;
  column: number;
  text?: string;
  childCount: number;
}

export interface ASTDiff {
  added: ASTNode[];
  removed: ASTNode[];
  modified: ASTNode[];
  stats: {
    totalChanges: number;
    functionsAffected: number;
  };
}

/**
 * Compute the AST difference between two trees
 * Focuses on declarations: functions, variables, classes
 */
export function computeASTDiff(
  oldTree: Parser.Tree | Parser.SyntaxNode | null,
  newTree: Parser.Tree | Parser.SyntaxNode | null
): ASTDiff {
  try {
    if (!oldTree || !newTree) {
      return {
        added: [],
        removed: [],
        modified: [],
        stats: {
          totalChanges: 0,
          functionsAffected: 0,
        },
      };
    }

    const oldRoot = isTree(oldTree) ? oldTree.rootNode : (oldTree as Parser.SyntaxNode);
    const newRoot = isTree(newTree) ? newTree.rootNode : (newTree as Parser.SyntaxNode);

    // Extract symbols from both trees
    const oldSymbols = extractSymbols(oldRoot);
    const newSymbols = extractSymbols(newRoot);

    const added: ASTNode[] = [];
    const removed: ASTNode[] = [];
    const modified: ASTNode[] = [];

    // Find added and modified symbols
    for (const [symbolName, newNode] of newSymbols) {
      const oldNode = oldSymbols.get(symbolName);

      if (!oldNode) {
        // Symbol was added
        added.push(newNode);
      } else if (
        oldNode.text !== newNode.text ||
        oldNode.line !== newNode.line
      ) {
        // Symbol was modified
        modified.push(newNode);
      }
    }

    // Find removed symbols
    for (const [symbolName, oldNode] of oldSymbols) {
      if (!newSymbols.has(symbolName)) {
        removed.push(oldNode);
      }
    }

    // Count functions affected
    const functionsAffected = added.concat(removed, modified).filter(
      (node) =>
        node.type === "function_declaration" ||
        node.type === "arrow_function" ||
        node.type === "function_expression"
    ).length;

    return {
      added,
      removed,
      modified,
      stats: {
        totalChanges: added.length + removed.length + modified.length,
        functionsAffected,
      },
    };
  } catch (error) {
    console.error("Error computing AST diff:", error);
    return {
      added: [],
      removed: [],
      modified: [],
      stats: {
        totalChanges: 0,
        functionsAffected: 0,
      },
    };
  }
}

/**
 * Extract named symbols from an AST tree
 * Returns a map of symbol name to ASTNode
 */
export function extractSymbols(rootNode: Parser.SyntaxNode): Map<string, ASTNode> {
  const symbols = new Map<string, ASTNode>();

  function traverse(node: Parser.SyntaxNode): void {
    // Extract function declarations
    if (node.type === "function_declaration") {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        const astNode: ASTNode = {
          id: `${node.type}_${node.startIndex}`,
          type: node.type,
          name,
          line: node.startPosition.row + 1,
          column: node.startPosition.column,
          text: node.text,
          childCount: node.childCount,
        };
        symbols.set(name, astNode);
      }
    }

    // Extract variable declarations
    if (node.type === "variable_declarator") {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        const astNode: ASTNode = {
          id: `${node.type}_${node.startIndex}`,
          type: "variable_declaration",
          name,
          line: node.startPosition.row + 1,
          column: node.startPosition.column,
          text: node.text,
          childCount: node.childCount,
        };
        symbols.set(name, astNode);
      }
    }

    // Extract class declarations
    if (node.type === "class_declaration") {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        const astNode: ASTNode = {
          id: `${node.type}_${node.startIndex}`,
          type: node.type,
          name,
          line: node.startPosition.row + 1,
          column: node.startPosition.column,
          text: node.text,
          childCount: node.childCount,
        };
        symbols.set(name, astNode);
      }
    }

    // Extract arrow functions (when assigned to variable)
    if (
      node.type === "arrow_function" &&
      node.parent &&
      node.parent.type === "variable_declarator"
    ) {
      const parentNameNode = node.parent.childForFieldName("name");
      if (parentNameNode) {
        const name = parentNameNode.text;
        const astNode: ASTNode = {
          id: `${node.type}_${node.startIndex}`,
          type: node.type,
          name,
          line: node.startPosition.row + 1,
          column: node.startPosition.column,
          text: node.text,
          childCount: node.childCount,
        };
        symbols.set(name, astNode);
      }
    }

    // Recurse through children
    let child = node.child(0);
    while (child) {
      traverse(child);
      child = child.nextSibling;
    }
  }

  traverse(rootNode);
  return symbols;
}

/**
 * Flatten a tree into a list of all nodes
 */
function flattenTree(node: Parser.SyntaxNode): ASTNode[] {
  const nodes: ASTNode[] = [];

  function traverse(currentNode: Parser.SyntaxNode): void {
    const astNode: ASTNode = {
      id: `${currentNode.type}_${currentNode.startIndex}`,
      type: currentNode.type,
      name: extractNodeName(currentNode),
      line: currentNode.startPosition.row + 1,
      column: currentNode.startPosition.column,
      text: currentNode.text.substring(0, 100), // Truncate for comparison
      childCount: currentNode.childCount,
    };

    nodes.push(astNode);

    // Visit children
    let child = currentNode.child(0);
    while (child) {
      traverse(child);
      child = child.nextSibling;
    }
  }

  traverse(node);
  return nodes;
}

/**
 * Extract a meaningful name from a node
 */
function extractNodeName(node: Parser.SyntaxNode): string | undefined {
  if (node.type === "function_declaration" || node.type === "class_declaration") {
    const nameNode = node.childForFieldName("name");
    if (nameNode) {
      return nameNode.text;
    }
  }

  if (node.type === "variable_declarator") {
    const nameNode = node.childForFieldName("name");
    if (nameNode) {
      return nameNode.text;
    }
  }

  return undefined;
}

/**
 * Check if a value is a Parser.Tree
 */
function isTree(value: Parser.Tree | Parser.SyntaxNode): value is Parser.Tree {
  return (value as Parser.Tree).rootNode !== undefined;
}

/**
 * Compute detailed diff with change statistics
 */
export interface DetailedDiff extends ASTDiff {
  statistics: {
    totalAdded: number;
    totalRemoved: number;
    totalModified: number;
    percentageChanged: number;
  };
}

/**
 * Compute detailed AST diff with statistics
 */
export function computeDetailedASTDiff(
  oldTree: Parser.Tree | Parser.SyntaxNode | null,
  newTree: Parser.Tree | Parser.SyntaxNode | null
): DetailedDiff {
  const diff = computeASTDiff(oldTree, newTree);

  const oldRoot = oldTree
    ? isTree(oldTree)
      ? oldTree.rootNode
      : (oldTree as Parser.SyntaxNode)
    : null;
  const newRoot = newTree
    ? isTree(newTree)
      ? newTree.rootNode
      : (newTree as Parser.SyntaxNode)
    : null;

  const oldNodeCount = oldRoot ? flattenTree(oldRoot).length : 0;
  const newNodeCount = newRoot ? flattenTree(newRoot).length : 0;
  const totalNodes = Math.max(oldNodeCount, newNodeCount, 1);

  const changedNodes = diff.added.length + diff.removed.length + diff.modified.length;
  const percentageChanged = (changedNodes / totalNodes) * 100;

  return {
    ...diff,
    statistics: {
      totalAdded: diff.added.length,
      totalRemoved: diff.removed.length,
      totalModified: diff.modified.length,
      percentageChanged: Math.round(percentageChanged * 100) / 100,
    },
  };
}
