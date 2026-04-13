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
export declare function computeASTDiff(oldTree: Parser.Tree | Parser.SyntaxNode | null, newTree: Parser.Tree | Parser.SyntaxNode | null): ASTDiff;
/**
 * Extract named symbols from an AST tree
 * Returns a map of symbol name to ASTNode
 */
export declare function extractSymbols(rootNode: Parser.SyntaxNode): Map<string, ASTNode>;
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
export declare function computeDetailedASTDiff(oldTree: Parser.Tree | Parser.SyntaxNode | null, newTree: Parser.Tree | Parser.SyntaxNode | null): DetailedDiff;
//# sourceMappingURL=diff.d.ts.map