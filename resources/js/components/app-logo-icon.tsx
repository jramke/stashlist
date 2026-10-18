import type { ImgHTMLAttributes } from 'react';

/**
 * The icon of the app. It is `public/favicon.svg`, the one source of every icon (`scripts/make-icons.mjs` makes
 * the raster ones from it), so a change of the icon is a change of that file.
 */
export default function AppLogoIcon(
    props: ImgHTMLAttributes<HTMLImageElement>,
) {
    return (
        <img src="/favicon.svg" alt="" width={118} height={118} {...props} />
    );
}
