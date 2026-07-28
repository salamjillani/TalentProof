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
};

export default nextConfig;
