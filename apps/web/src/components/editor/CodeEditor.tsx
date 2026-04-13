"use client";

import { Suspense, useRef, forwardRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { loader } from "@monaco-editor/react";
import type { OnMount, EditorProps } from "@monaco-editor/react";

// Load Monaco from local public/vs instead of CDN
loader.config({ paths: { vs: "/vs" } });

// Dynamic import to avoid SSR issues with Monaco
const Editor = dynamic<any>(
  () => import("@monaco-editor/react"),
  { ssr: false, loading: () => <EditorSkeleton /> },
);

export interface CodeIssue {
  line: number;
  message: string;
  severity: "error" | "warning" | "info";
}

interface CodeEditorProps {
  defaultValue?: string;
  onChange?: (value: string | undefined) => void;
  language?: string;
  theme?: string;
  readOnly?: boolean;
  height?: string;
  width?: string;
  onMount?: (editor: any) => void;
  issues?: CodeIssue[];
}

const EditorSkeleton = () => (
  <div className="w-full h-full bg-gray-900 animate-pulse flex items-center justify-center">
    <p className="text-gray-400">편집기 로딩 중...</p>
  </div>
);

export const CodeEditor = forwardRef<any, CodeEditorProps>(
  (
    {
      defaultValue = "",
      onChange,
      language = "javascript",
      theme = "vs-dark",
      readOnly = false,
      height = "400px",
      width = "100%",
      onMount,
      issues = [],
    },
    ref
  ) => {
    const editorRef = useRef<any>(null);
    const decorationsRef = useRef<string[]>([]);

    const handleEditorMount: OnMount = (editorInstance, monaco) => {
      editorRef.current = editorInstance;
      if (ref && typeof ref === "object") {
        (ref as any).current = editorInstance;
      }
      onMount?.(editorInstance);

      // Ctrl+Enter shortcut
      editorInstance.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => {
          window.dispatchEvent(
            new CustomEvent("runCode", {
              detail: { code: editorInstance.getValue() },
            })
          );
        }
      );

      // Apply initial decorations
      if (issues.length > 0) {
        applyDecorations(editorInstance, monaco, issues);
      }
    };

    // Update decorations when issues change
    useEffect(() => {
      if (editorRef.current && typeof window !== "undefined") {
        import("monaco-editor").then(({ editor: monacoEditor }) => {
          // Use the monaco instance from the editor
        }).catch(() => {});
        // Use the editor's built-in model
        const editorInstance = editorRef.current;
        const model = editorInstance?.getModel?.();
        if (model && editorInstance) {
          const monaco = (window as any).monaco;
          if (monaco) {
            applyDecorations(editorInstance, monaco, issues);
          }
        }
      }
    }, [issues]);

    const applyDecorations = (editorInstance: any, monaco: any, currentIssues: CodeIssue[]) => {
      if (!editorInstance || currentIssues.length === 0) return;

      const model = editorInstance.getModel();
      if (!model) return;

      const newDecorations = currentIssues.map((issue) => ({
        range: new monaco.Range(issue.line, 1, issue.line, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName:
            issue.severity === "error"
              ? "codicon codicon-error"
              : issue.severity === "warning"
                ? "codicon codicon-warning"
                : "codicon codicon-info",
          glyphMarginHoverMessage: { value: issue.message },
          minimap: {
            color:
              issue.severity === "error"
                ? "#ff4444"
                : issue.severity === "warning"
                  ? "#ffaa00"
                  : "#0088ff",
            position: 2,
          },
        },
      }));

      decorationsRef.current = editorInstance.deltaDecorations(
        decorationsRef.current,
        newDecorations
      );
    };

    return (
      <div className="w-full border border-gray-700 rounded-lg overflow-hidden flex flex-col bg-gray-900">
        {/* Status bar */}
        <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between text-xs text-gray-400">
          <span>JavaScript</span>
          <div className="flex items-center gap-4">
            {issues.length > 0 && (
              <span className="text-yellow-500">
                {issues.filter((i) => i.severity === "error").length} 오류
              </span>
            )}
            <span>Ctrl+Enter: 실행</span>
          </div>
        </div>

        {/* Editor */}
        <Editor
          height={height}
          width={width}
          language={language}
          theme={theme}
          defaultValue={defaultValue}
          onChange={onChange}
          options={{
            readOnly,
            minimap: { enabled: true, size: "proportional" },
            fontSize: 14,
            fontFamily: "Fira Code, monospace",
            wordWrap: "on",
            automaticLayout: true,
            bracketPairColorization: { enabled: true },
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            tabSize: 2,
            insertSpaces: true,
            lineNumbers: "on",
            formatOnPaste: true,
            scrollBeyondLastLine: false,
          }}
          onMount={handleEditorMount}
          loading={<EditorSkeleton />}
        />
      </div>
    );
  }
);

CodeEditor.displayName = "CodeEditor";

export default CodeEditor;
