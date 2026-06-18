# udder-db

npm install cookie

# Build SCSS
```bash
npm run build:css
```

# Deploy locally
```bash
vercel dev
```

# Deploying to prod
## Note
Before deploying to prod, make sure to comment out the section below in `build.js`.
```bash
// comment out for production
if (process.env.VERCEL_ENV !== "production") {
    fs.writeFileSync("vercel.json", JSON.stringify({
        buildCommand: "npm run build",
        outputDirectory: "./"
    }, null, 2));
  console.log("⏭  Skipping build — not production");
  process.exit(0);
}
```

```bash
npm run build // always run build first before deploying to prod
npx vercel --prod
```