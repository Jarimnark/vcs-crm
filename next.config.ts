import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The droplet cannot run `next build` (1 GB RAM) — CI builds this output
  // and deploys `.next/standalone` under systemd. See docs/03-tech-stack.md §10.
  output: 'standalone',

  // G4: serverActions.bodySizeLimit stays at its 1 MB default on purpose.
  // Uploads go through the /api/upload Route Handler, which has its own cap —
  // an oversized payload anywhere else should fail loudly, not be absorbed.
}

export default nextConfig
