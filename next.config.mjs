/** @type {import('next').NextConfig} */
const nextConfig = {
  // The local embedding model (@huggingface/transformers) uses a native
  // ONNX runtime under the hood. It must be treated as an external Node
  // dependency instead of being bundled, or embedding generation breaks.
  // pdfkit reads its AFM font metrics files from disk via a path relative
  // to its own module directory at runtime; Turbopack's bundling rewrites
  // that to a placeholder path (e.g. "D:\ROOT\...") that doesn't exist on
  // disk, breaking the DOCX-to-PDF fallback converter. Excluding it from
  // bundling keeps its real on-disk module path intact.
  serverExternalPackages: ['@huggingface/transformers', 'onnxruntime-node', 'pdfkit'],

  // onnxruntime-node's native binary (libonnxruntime.so.1 on Linux) is loaded
  // from a path Next's output file tracing doesn't statically detect, so it
  // gets silently dropped from the Vercel function bundle without this —
  // causing "cannot open shared object file" at runtime. Scoped to just the
  // routes that actually call the embedding model (x64 only, Vercel's
  // default function architecture) — applying this to every route via '/*'
  // added ~77MB (both linux archs) to every function and broke the deploy.
  outputFileTracingIncludes: {
    '/api/apply': ['./node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**/*'],
    '/api/resumes/analyze': ['./node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**/*'],
    '/api/resumes/search': ['./node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**/*'],
  },
};

export default nextConfig;
