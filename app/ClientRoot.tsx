"use client";

import Providers from "./providers";

export default function ClientRoot({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}