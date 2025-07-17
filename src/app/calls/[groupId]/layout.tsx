
// This file is necessary to handle dynamic routes with `output: 'export'`.
// We can't fetch real group IDs at build time due to security rules,
// so we return an empty array.
// With `dynamicParams: true` in next.config.ts, Next.js will generate pages
// on-demand when a user first accesses them.

export async function generateStaticParams() {
  // We cannot fetch group IDs at build time because it would require authentication.
  // Returning an empty array satisfies the `output: 'export'` requirement.
  // The pages will be generated on-demand at the first request.
  return [];
}

export default function GroupChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
