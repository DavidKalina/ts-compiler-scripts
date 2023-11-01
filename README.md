# ts-compiler-scripts


# Setup
1. Install Dependencies
```bash
bun install
```

2. Set ROOT_PATH in `.env.local`

# To Run
```bash
bun run importFinder.ts
```


3. D3.js Component Tree

After running the script, it will output two files in `/output` -> `bootstrapComponentHierarchy.json` and `bootstrapComponentsList.json`

There's an `index.html` that you can view with the live preview extension that will plug in `bootstrapComponentHierarchy.json` and render a tree. 




This project was created using `bun init` in bun v1.0.2. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
