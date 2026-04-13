import Parser from "web-tree-sitter";
export declare class IncrementalParser {
    private parser;
    private tree;
    private language;
    /**
     * Initialize the parser with WASM and language
     * @param wasmPath Optional path to tree-sitter WASM file
     */
    init(wasmPath?: string): Promise<void>;
    /**
     * Parse source code and create/update tree
     * @param sourceCode The source code to parse
     * @returns The parsed tree
     */
    parse(sourceCode: string): Parser.Tree;
    /**
     * Apply an incremental edit to the tree
     * @param edit Edit information
     */
    applyEdit(edit: EditInfo): void;
    /**
     * Reparse after applying an edit
     * @param newSource The new source code after the edit
     * @returns The updated tree
     */
    reparse(newSource: string): Parser.Tree;
    /**
     * Get the current tree
     * @returns The current syntax tree
     */
    getTree(): Parser.Tree | null;
    /**
     * Get the root node of the tree
     * @returns The root syntax node
     */
    getRootNode(): Parser.SyntaxNode | null;
    /**
     * Cleanup and free resources
     */
    dispose(): void;
}
export interface EditInfo {
    startIndex: number;
    oldEndIndex: number;
    newEndIndex: number;
    startPosition: {
        row: number;
        column: number;
    };
    oldEndPosition: {
        row: number;
        column: number;
    };
    newEndPosition: {
        row: number;
        column: number;
    };
}
/**
 * Convert Operational Transform delta to EditInfo
 * @param oldSource The original source code
 * @param delta Array of OT delta operations
 * @returns EditInfo for the incremental parser
 */
export declare function convertOTDeltaToEdit(oldSource: string, delta: Array<{
    retain?: number;
    insert?: string;
    delete?: number;
}>): EditInfo;
//# sourceMappingURL=parser.d.ts.map