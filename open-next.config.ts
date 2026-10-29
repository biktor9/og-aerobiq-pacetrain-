import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * OpenNext builds the Next.js app into a Worker. Every page in PaceTrain is
 * dynamic (`export const dynamic = 'force-dynamic'`), so there is no ISR cache to
 * put in R2 and no incremental cache configuration to write.
 */
export default defineCloudflareConfig();
