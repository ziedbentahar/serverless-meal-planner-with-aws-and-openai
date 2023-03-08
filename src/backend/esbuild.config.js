require("esbuild")
  .build({
    entryPoints: ["./backend/lambdas/*.ts"],
    entryNames: "[dir]/[name]",
    outbase: ".",
    bundle: true,
    minify: true,
    sourcemap: false,
    outdir: "../build",
    platform: "node",
    write: true,
  })
  .catch(() => process.exit());
