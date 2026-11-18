"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Icon } from "../icons";
import { useAuth, useToast, useWishlist } from "../providers";

/** Wishlist toggle: white stroke over photos, coral fill when saved. 48px tap target. */
export function HeartButton({ listingId, variant = "overlay" }: { listingId: number; variant?: "overlay" | "inline" }) {
  const t = useTranslations("Listing");
  const { user } = useAuth();
  const { ids, toggle } = useWishlist();
  const { toast } = useToast();
  const router = useRouter();
  const saved = ids.has(listingId);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push(`/login?next=/listing/${listingId}`);
      return;
    }
    const res = await toggle(listingId);
    if (res !== null) toast(res ? t("saved") : t("removed"));
  };

  if (variant === "inline") {
    return (
      <button type="button" onClick={onClick} aria-pressed={saved} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-[14px] font-medium underline-offset-2 hover:bg-faint hover:underline">
        <Icon name="heart" size={18} className={saved ? "text-coral" : ""} fill={saved ? "currentColor" : "none"} />
        {saved ? t("unsave") : t("save")}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? t("unsave") : t("save")}
      className="absolute right-1 top-1 z-10 flex size-12 items-center justify-center transition-transform active:scale-90"
    >
      <Icon
        name="heart"
        size={24}
        strokeWidth={2}
        className={`drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] ${saved ? "text-coral" : "text-white"}`}
        fill={saved ? "currentColor" : "rgba(0,0,0,0.35)"}
        stroke="white"
      />
    </button>
  );
}
