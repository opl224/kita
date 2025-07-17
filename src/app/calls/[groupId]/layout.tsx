
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { app } from "@/lib/firebase";

// This function is required for static site generation (output: 'export')
// It tells Next.js which dynamic routes to pre-render at build time.
export async function generateStaticParams() {
  // During the build process (`next build`), there is no authenticated user.
  // Attempting to fetch from Firestore here would likely fail due to security rules
  // that require authentication. By returning an empty array, we tell Next.js
  // not to pre-render any group pages at build time. Instead, they will be
  // generated on-demand when a user first navigates to them.
  return [];
}

export default function GroupChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
