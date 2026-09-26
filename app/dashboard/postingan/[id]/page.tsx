// Server-component shell for static export. The actual UI lives in
// page-client.tsx (a "use client" component using useParams() to read
// the real id at runtime in the browser). We only need ONE static
// param here as a build-time placeholder -- see /public/_redirects for
// how Netlify routes any real id to this same pre-rendered HTML shell.
import PageClient from "./page-client";

export function generateStaticParams() {
  return [{ id: "_" }];
}
export const dynamicParams = false;

export default function Page() {
  return <PageClient />;
}
