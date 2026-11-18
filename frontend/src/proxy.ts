import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // everything except Next internals, metadata routes and files with an extension
  matcher: ["/((?!api|_next|_vercel|llms.txt|robots.txt|sitemap.xml|.*\..*).*)"],
};
