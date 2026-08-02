import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface KoroMarkProps {
  className?: string;
  priority?: boolean;
  size?: number;
}

export function KoroMark({ className, priority = false, size = 40 }: KoroMarkProps) {
  return (
    <Image
      src="/brand/koro-pebble.png"
      alt="Koro.ai"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}

interface KoroBrandProps extends KoroMarkProps {
  href?: string;
  showSubtitle?: boolean;
}

export function KoroBrand({
  className,
  href = "/dashboard",
  priority = false,
  showSubtitle = true,
  size = 40,
}: KoroBrandProps) {
  return (
    <Link
      href={href}
      aria-label="Koro.ai home"
      className={cn("inline-flex items-center gap-3", className)}
    >
      <KoroMark priority={priority} size={size} />
      <span className="text-left">
        <span className="block text-xl font-bold leading-tight text-foreground">Koro.ai</span>
        {showSubtitle && (
          <span className="block text-xs text-muted-foreground">AI Learning Platform</span>
        )}
      </span>
    </Link>
  );
}
