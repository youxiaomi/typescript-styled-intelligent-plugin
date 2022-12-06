import * as ts from 'typescript';


export * from './_teamplteUtil'



export const getTagVariableDeclarationNode = (node: ts.Node | undefined) => {
  if (!node) {
    return
  }
  if (node.kind == ts.SyntaxKind.FirstTemplateToken) {
    node = node.parent
  }
  if (node.kind == ts.SyntaxKind.TaggedTemplateExpression) {
    node = node.parent
  }
  if (node.kind == ts.SyntaxKind.VariableDeclaration) {
    return node
  }
  return undefined
}