import Parser from "web-tree-sitter";

export class IncrementalParser {
  private parser: Parser | null = null;
  private tree: Parser.Tree | null = null;
  private language: Parser.Language | null = null;

  /**
   * Initialize the parser with WASM and language
   * @param wasmPath Optional path to tree-sitter WASM file
   */
  async init(wasmPath?: string): Promise<void> {
    try {
      // Initialize tree-sitter with WASM
      if (wasmPath) {
        await Parser.init({
          locateFile: () => wasmPath,
        });
      } else {
        await Parser.init();
      }

      this.parser = new Parser();

      // Load JavaScript/TypeScript language
      // In a real environment, this would load from web-tree-sitter language packages
      // For now, we'll set up the parser ready for language assignment
      if (!this.parser) {
        throw new Error("Failed to create parser instance");
      }
    } catch (error) {
      console.error("Failed to initialize parser:", error);
      throw error;
    }
  }

  /**
   * Parse source code and create/update tree
   * @param sourceCode The source code to parse
   * @returns The parsed tree
   */
  parse(sourceCode: string): Parser.Tree {
    if (!this.parser) {
      throw new Error("Parser not initialized. Call init() first.");
    }

    try {
      // Parse the source code using the old tree for incremental updates
      const newTree = this.parser.parse(sourceCode, this.tree);
      this.tree = newTree;
      return newTree;
    } catch (error) {
      console.error("Error parsing code:", error);
      throw error;
    }
  }

  /**
   * Apply an incremental edit to the tree
   * @param edit Edit information
   */
  applyEdit(edit: EditInfo): void {
    if (!this.tree) {
      throw new Error("No tree available. Call parse() first.");
    }

    try {
      this.tree.edit({
        startIndex: edit.startIndex,
        oldEndIndex: edit.oldEndIndex,
        newEndIndex: edit.newEndIndex,
        startPosition: edit.startPosition,
        oldEndPosition: edit.oldEndPosition,
        newEndPosition: edit.newEndPosition,
      });
    } catch (error) {
      console.error("Error applying edit to tree:", error);
      throw error;
    }
  }

  /**
   * Reparse after applying an edit
   * @param newSource The new source code after the edit
   * @returns The updated tree
   */
  reparse(newSource: string): Parser.Tree {
    if (!this.tree) {
      throw new Error("No tree available. Call parse() first.");
    }

    try {
      const updatedTree = this.parser!.parse(newSource, this.tree);
      this.tree = updatedTree;
      return updatedTree;
    } catch (error) {
      console.error("Error reparsing code:", error);
      throw error;
    }
  }

  /**
   * Get the current tree
   * @returns The current syntax tree
   */
  getTree(): Parser.Tree | null {
    return this.tree;
  }

  /**
   * Get the root node of the tree
   * @returns The root syntax node
   */
  getRootNode(): Parser.SyntaxNode | null {
    if (!this.tree) {
      return null;
    }
    return this.tree.rootNode;
  }

  /**
   * Cleanup and free resources
   */
  dispose(): void {
    if (this.tree) {
      this.tree.delete();
      this.tree = null;
    }
    // Parser cleanup is handled by garbage collection
  }
}

export interface EditInfo {
  startIndex: number;
  oldEndIndex: number;
  newEndIndex: number;
  startPosition: { row: number; column: number };
  oldEndPosition: { row: number; column: number };
  newEndPosition: { row: number; column: number };
}

/**
 * Convert Operational Transform delta to EditInfo
 * @param oldSource The original source code
 * @param delta Array of OT delta operations
 * @returns EditInfo for the incremental parser
 */
export function convertOTDeltaToEdit(
  oldSource: string,
  delta: Array<{ retain?: number; insert?: string; delete?: number }>
): EditInfo {
  let startIndex = 0;
  let deleteCount = 0;
  let insertText = "";

  for (const op of delta) {
    if (op.retain) {
      startIndex += op.retain;
    } else if (op.delete) {
      deleteCount = op.delete;
    } else if (op.insert) {
      insertText = op.insert;
    }
  }

  const oldEndIndex = startIndex + deleteCount;
  const newEndIndex = startIndex + insertText.length;

  // Calculate positions (row and column) from indices
  const startPos = calculatePosition(oldSource, startIndex);
  const oldEndPos = calculatePosition(oldSource, oldEndIndex);
  const newEndPos = { row: startPos.row, column: startPos.column + insertText.length };

  return {
    startIndex,
    oldEndIndex,
    newEndIndex,
    startPosition: startPos,
    oldEndPosition: oldEndPos,
    newEndPosition: newEndPos,
  };
}

/**
 * Calculate row and column position from character index
 */
function calculatePosition(source: string, index: number): { row: number; column: number } {
  let row = 0;
  let column = 0;
  let currentIndex = 0;

  for (let i = 0; i < source.length && currentIndex < index; i++) {
    if (source[i] === "\n") {
      row++;
      column = 0;
    } else {
      column++;
    }
    currentIndex++;
  }

  return { row, column };
}
