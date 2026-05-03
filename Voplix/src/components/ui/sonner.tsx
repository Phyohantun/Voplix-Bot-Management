"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircle, Info, WarningCircle, XCircle, SpinnerGap } from "@phosphor-icons/react"

const Toaster = ({ position: positionProp, ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()
  const toastTheme = resolvedTheme === "dark" ? "dark" : "light"
  const [position, setPosition] = useState<NonNullable<ToasterProps["position"]>>(
    positionProp ?? "bottom-center"
  )

  useEffect(() => {
    if (positionProp) return
    const mq = window.matchMedia("(min-width: 640px)")
    const sync = () => setPosition(mq.matches ? "bottom-right" : "bottom-center")
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [positionProp])

  return (
    <Sonner
      theme={toastTheme as ToasterProps["theme"]}
      position={positionProp ?? position}
      className="toaster group"
      icons={{
        success: (
          <CheckCircle className="size-4" />
        ),
        info: (
          <Info className="size-4" />
        ),
        warning: (
          <WarningCircle className="size-4" />
        ),
        error: (
          <XCircle className="size-4" />
        ),
        loading: (
          <SpinnerGap className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
