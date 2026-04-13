export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center bg-editor-bg">
      {children}
    </div>
  );
}
