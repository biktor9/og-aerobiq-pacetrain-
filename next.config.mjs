/**
 * Plain ESM so Next never has to transpile this file at boot. Next 15 loads a
 * TypeScript config through its own TypeScript tooling, which only works with
 * the classic compiler API — the project pins TypeScript 6 for that reason
 * (Next 15 rejects TypeScript 7 outright), and a .mjs config keeps this file
 * out of that dependency entirely.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // better-sqlite3 is a native module: keep it out of the server bundle.
  serverExternalPackages: ['better-sqlite3'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  }
};

export default nextConfig;
