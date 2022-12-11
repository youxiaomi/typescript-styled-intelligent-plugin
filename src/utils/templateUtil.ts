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
export function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
export function isTagged(node: ts.TaggedTemplateExpression, tags: ReadonlyArray<string>): boolean {
  const text = node.tag.getText();
  return tags.some(tag =>
      text === tag
      || new RegExp(`$${escapeRegExp(tag)}\\s*^`).test(text)
      || text.startsWith(tag + '.')
      || text.endsWith('.' + tag)
      || text.startsWith(tag + '(')
      || text.startsWith(tag + '<')
      || text.startsWith(tag + '[')
  );
}
export const getTag = (node: ts.TemplateLiteral)=>{
  let tagTemplateNode =  node.parent as ts.TaggedTemplateExpression
  let text = tagTemplateNode.tag.getText()
  // let tags = ['styled']
  return (text.match(/(?<=styled\.).+/) || [])[0]
}