export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-[calc(100vh-57px)] overflow-hidden bg-editor-bg">
      {children}
    </div>
  );
}
