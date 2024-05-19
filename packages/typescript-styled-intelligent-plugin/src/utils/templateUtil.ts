import * as ts from 'typescript/lib/tsserverlibrary';


// export * from './_teamplteUtil'

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

export function getTagName(node: ts.TaggedTemplateExpression, tags: ReadonlyArray<string>){
  const text = node.tag.getText();
  return (text.match(/(?<=styled\.).+/) || [])[0];
}

export function getTaggedLiteralName(
  typescript: typeof ts,
  node: ts.NoSubstitutionTemplateLiteral,
  tags: ReadonlyArray<string>
) {
  if (!node || !node.parent) {
      return 
  }
  if (node.parent.kind !== typescript.SyntaxKind.TaggedTemplateExpression) {
      return
  }
  const tagNode = node.parent as ts.TaggedTemplateExpression;
  return getTagName(tagNode,tags)
}