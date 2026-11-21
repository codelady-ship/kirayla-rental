import type { ReactNode } from "react";

/** For t.rich(): keeps brand and product names out of browser auto-translate. Usable from server and client components. */
export const brand = (chunks: ReactNode) => <span translate="no">{chunks}</span>;
