import type Parser from "web-tree-sitter";
/**
 * Compute cyclomatic complexity for a given AST node
 * Cyclomatic complexity = number of linearly independent paths through code
 * Base complexity is 1, incremented by 1 for each decision point
 */
export declare function computeCyclomaticComplexity(rootNode: Parser.SyntaxNode): number;
/**
 * Compute cognitive complexity for a given AST node
 * Similar to cyclomatic but adds weight for nesting depth
 * Each decision point adds 1 + current nesting depth
 */
export declare function computeCognitiveComplexity(rootNode: Parser.SyntaxNode): number;
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
export declare function computeFunctionMetrics(rootNode: Parser.SyntaxNode): FunctionMetric[];
/**
 * Compute maximum nesting depth in the tree
 */
export declare function computeMaxNestingDepth(rootNode: Parser.SyntaxNode): number;
//# sourceMappingURL=metrics.d.ts.map