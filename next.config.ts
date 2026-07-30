import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Lockfiles exist in parent directories, so pin the workspace root here rather
  // than letting Turbopack infer it.
  turbopack: {
    root: import.meta.dirname,
  },
  // Research scripts and the frozen v1 pipeline live under archive/ and are not
  // part of the app build.
  outputFileTracingExcludes: {
    '*': ['./archive/**'],
  },
}

export default nextConfig
