

import { getSCSSLanguageService ,TextDocument} from 'vscode-css-languageservice'
import { Node,NodeType } from 'vscode-css-languageservice/lib/umd/parser/cssNodes'




const scssLanguageService = getSCSSLanguageService()


export const getScssStyleSheet = (scssText:string) =>{
  
}


class ScssService {

  getScssStyleSheet(scssText: string) {
    let styleSheet = scssLanguageService.parseStylesheet({
      uri: 'untitled://embedded.scss',
      languageId: 'scss',
      version: 1,
      getText: () => `:root{${scssText}}`,
      positionAt: (offset: number) => {
        // const pos = context.toPosition(this.fromVirtualDocOffset(offset, context));
        // return this.toVirtualDocPosition(pos);
        return {
          line: 0,
          character: 0,
        }
      },
      offsetAt: (p) => {
        // const offset = context.toOffset(this.fromVirtualDocPosition(p));
        // return this.toVirtualDocOffset(offset, context);
        return 0
      },
      lineCount: scssText.split(/\n/g).length + 1,
    }) as Node
    return styleSheet
  }
  getClassNameNode(node: Node){
    function iterationNode(node: Node){
      let nodes = node.getChildren()
      
      return {
        text: node.getText(),
        type: NodeType[node.type],
        pos: node.offset,
        end: node.offset+node.length,
        children: nodes.map(node=>{
          return iterationNode(node)
        })
        
      }
    }
    let classNameNodes = iterationNode(node)
    console.log(classNameNodes)
    return classNameNodes
  }
}

export const getScssService = ()=>{
  return new ScssService()
}
