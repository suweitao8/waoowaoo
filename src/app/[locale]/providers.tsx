'use client'

import { SessionProvider } from "next-auth/react"
import { ToastProvider } from "@/contexts/ToastContext"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { SingleUserAutoLogin } from "@/components/SingleUserAutoLogin"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchOnWindowFocus={false}
      refetchInterval={0}
    >
      <SingleUserAutoLogin>
        <QueryProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </QueryProvider>
      </SingleUserAutoLogin>
    </SessionProvider>
  )
}
