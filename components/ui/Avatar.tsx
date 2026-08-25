import Image from "next/image";
import { cn } from "@/lib/utils/classnames";

interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-12 w-12 text-base" };
const pixels = { sm: 32, md: 40, lg: 48 };

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (src?.startsWith("/")) {
    return (
      <Image
        src={src}
        alt={name}
        width={pixels[size]}
        height={pixels[size]}
        className={cn("rounded-full object-cover", sizes[size], className)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={name}
      className={cn(
        "flex items-center justify-center rounded-full bg-violet-600 font-semibold text-white",
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
