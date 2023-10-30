import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

function isReactBootstrapImport(node: ts.Node): boolean {
  if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
    return /react-bootstrap/.test(node.moduleSpecifier.getText());
  }
  return false;
}

function getTsxImportReferences(node: ts.Node): string[] {
  const references: string[] = [];
  if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
    const importPath = node.moduleSpecifier.text;
    references.push(importPath);
  }
  return references;
}

function traverseTsxFiles(filePath: string, visitedFiles: Set<string>): boolean {
  if (visitedFiles.has(filePath)) {
    return false; // Avoid circular dependencies
  }

  visitedFiles.add(filePath);

  // If the file doesn't exist, try appending .tsx and checking again.
  if (!fs.existsSync(filePath)) {
    filePath = filePath + ".tsx";
  }

  // If the path is a directory, try looking for an index.tsx inside it.
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.tsx");
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return false;
    }
  } else if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return false;
  }

  const fileContent = fs.readFileSync(filePath).toString();
  const sourceFile = ts.createSourceFile(filePath, fileContent, ts.ScriptTarget.Latest, true);

  let hasReactBootstrapImport = false;

  ts.forEachChild(sourceFile, (node) => {
    if (isReactBootstrapImport(node)) {
      hasReactBootstrapImport = true;
    }

    getTsxImportReferences(node).forEach((importPath) => {
      console.log("Log from inside forEach getTsxImportReferences");
      const absoluteImportPath = path.resolve(path.dirname(filePath), importPath);
      console.log({ absoluteImportPath });
      if (traverseTsxFiles(absoluteImportPath, visitedFiles)) {
        hasReactBootstrapImport = true;
      }
    });
  });

  if (hasReactBootstrapImport) {
    console.log(`React-Bootstrap import found in: ${filePath}`);
  }

  return hasReactBootstrapImport;
}

// Entry point
const rootTsxFile = "../../flowty-app/packages/web/src/components/Footer.tsx";
const visitedFiles = new Set<string>();
const hasBootstrap = traverseTsxFiles(rootTsxFile, visitedFiles);

console.log({ hasBootstrap });
