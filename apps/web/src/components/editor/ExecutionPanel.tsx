"use client";

import { ExecutionResult } from "@/lib/api";

interface ExecutionPanelProps {
  executionResult: ExecutionResult | null;
  isLoading?: boolean;
}

/**
 * Panel showing execution results with status, output, errors, and duration
 */
export const ExecutionPanel = ({
  executionResult,
  isLoading = false,
}: ExecutionPanelProps) => {
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-gray-500">Executing code...</div>
      </div>
    );
  }

  if (!executionResult) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-gray-400 text-center">
          <p className="text-sm">Click &ldquo;실행&rdquo; to execute your code</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-900 text-white rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center gap-3">
        <div
          className={`w-3 h-3 rounded-full ${
            executionResult.success ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="font-semibold">
          {executionResult.success ? "Execution Successful" : "Execution Failed"}
        </span>
        {executionResult.duration_ms && (
          <span className="text-gray-400 text-sm ml-auto">
            {executionResult.duration_ms}ms
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        {executionResult.success && executionResult.output ? (
          <div className="text-green-400 whitespace-pre-wrap break-words">
            {executionResult.output}
          </div>
        ) : null}

        {!executionResult.success && executionResult.error ? (
          <div>
            <div className="text-red-400 font-semibold mb-2">Error:</div>
            <div className="text-red-300 whitespace-pre-wrap break-words">
              {executionResult.error}
            </div>
          </div>
        ) : null}

        {!executionResult.output && !executionResult.error && (
          <div className="text-gray-400">No output</div>
        )}
      </div>
    </div>
  );
};

export default ExecutionPanel;
