type Props = {
  variant?: "logo" | "icon";
  className?: string;
  alt?: string;
};

/** Cache-bust when assets are regenerated from /assets */
const ASSET_V = "6";
const LOGO = `/mc_scrapper_logo.png?v=${ASSET_V}`;
const ICON = `/mc_scrapper_icon.png?v=${ASSET_V}`;

export function BrandMark({ variant = "logo", className = "", alt = "MC Scrapper" }: Props) {
  const isIcon = variant === "icon";
  const classes = ["brand-mark", isIcon ? "brand-mark-icon" : "brand-mark-logo", className]
    .filter(Boolean)
    .join(" ");

  return (
    <img
      className={classes}
      src={isIcon ? ICON : LOGO}
      alt={alt}
      width={isIcon ? 128 : 320}
      height={isIcon ? 128 : 110}
      decoding="async"
      draggable={false}
    />
  );
}
