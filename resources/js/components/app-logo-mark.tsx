import type { ImgHTMLAttributes } from 'react';

/**
 * The mark of the app without its tile (`public/logo-mark.svg`), for a white page: the logo of the header and
 * of the box. `AppLogoIcon` is the app icon with its background, for everywhere else.
 */
export function AppLogoMark(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img src="/logo-mark.svg" alt="" width={118} height={118} {...props} />
    );
}
