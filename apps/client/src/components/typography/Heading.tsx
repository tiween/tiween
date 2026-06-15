import React from "react"

import { cn } from "@/lib/utils"

const variantStyles = {
  heading1: "text-4xl md:text-5xl",
  heading2: "text-3xl md:text-4xl",
  heading3: "text-2xl md:text-3xl",
  heading4: "text-xl md:text-2xl",
  heading5: "text-lg md:text-xl",
  heading6: "text-base md:text-lg",
}

const textColorVariants = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  primary: "text-primary",
  destructive: "text-destructive",
  // Backward compatibility aliases
  black: "text-foreground",
  white: "text-white",
}

const fontWeightVariants = {
  black: "font-black",
  extraBold: "font-extrabold",
  bold: "font-bold",
  semiBold: "font-semibold",
  medium: "font-medium",
  normal: "font-normal",
  light: "font-light",
  extraLight: "font-extraLight",
  thin: "font-thin",
}

type Variant = keyof typeof variantStyles
type TextColor = keyof typeof textColorVariants
type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
type FontWeight = keyof typeof fontWeightVariants

interface HeadingProps {
  children: React.ReactNode
  className?: string
  variant?: Variant
  textColor?: TextColor
  fontWeight?: FontWeight
  tag?: HeadingTag
  id?: string
}

export const Heading = ({
  children,
  className,
  variant = "heading3",
  textColor = "default",
  fontWeight = "semiBold",
  tag = "h3",
  id,
}: HeadingProps) => {
  const selectedVariant = variantStyles[variant]
  const selectedTextColor = textColorVariants[textColor]
  const selectedFontWeight = fontWeightVariants[fontWeight]

  const Tag = tag as HeadingTag

  if (!Tag) {
    return null
  }

  return (
    <Tag
      id={id}
      className={cn(
        selectedVariant,
        selectedTextColor,
        selectedFontWeight,
        className
      )}
    >
      {children}
    </Tag>
  )
}

Heading.displayName = "Heading"

export default Heading
