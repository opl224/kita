// This file is required to provide generateStaticParams for the dynamic route.
// It tells Next.js not to pre-render any specific group pages at build time,
// which avoids Firestore permission errors during the build process.
// The pages will be generated on-demand on the client side.
export async function generateStaticParams() {
  return [];
}

export default function GroupChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
