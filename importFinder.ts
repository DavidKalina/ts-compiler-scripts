import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

interface ComponentNode {
  name: string;
  children: ComponentNode[];
  hasReactBootstrap: boolean;
}

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

// Define the node structure

function traverseTsxFiles(filePath: string, visitedFiles: Set<string>): ComponentNode | null {
  if (visitedFiles.has(filePath)) {
    return null; // Avoid circular dependencies
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
      return null;
    }
  } else if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return null;
  }

  const fileContent = fs.readFileSync(filePath).toString();
  const sourceFile = ts.createSourceFile(filePath, fileContent, ts.ScriptTarget.Latest, true);

  let hasReactBootstrapImport = false;
  const children: ComponentNode[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (isReactBootstrapImport(node)) {
      hasReactBootstrapImport = true;
    }

    getTsxImportReferences(node).forEach((importPath) => {
      const absoluteImportPath = path.resolve(path.dirname(filePath), importPath);
      const childNode = traverseTsxFiles(absoluteImportPath, visitedFiles);
      if (childNode) {
        children.push(childNode);
      }
    });
  });

  if (!hasReactBootstrapImport && children.length === 0) {
    return null;
  }

  return {
    name: filePath,
    children: children,
    hasReactBootstrap: hasReactBootstrapImport,
  };
}

// Entry point
const rootTsxFile = "../../flowty-app/packages/web/src/screens/MarketplaceScreen.tsx";
const visitedFiles = new Set<string>();
const rootNode = traverseTsxFiles(rootTsxFile, visitedFiles);

// Write the results to a JSON file
if (rootNode) {
  fs.writeFileSync("bootstrapComponentsHierarchy.json", JSON.stringify(rootNode, null, 4));
}
