import { JsxElementNode, JsxElementSelector,CandidateTextNode } from './extractCssSelector'
import * as Nodes from 'vscode-css-languageservice/lib/umd/parser/cssNodes'

type Node = JsxElementSelector|CandidateTextNode | {type:'braceOpen'|'braceClose'} | {type:'cssNode',node: Nodes.Node}


export default class StyleSheetScan{
  /**
   * .user,#user,{.age{}}
   */
  text = ''
  private nodes:{offset:number,node: Node,text:string}[] = [] 
  getText(){
    return this.text
  }
  setText(text:string,node:Node){
    let lastCharacter = this.text.slice(-1)
    if(lastCharacter && lastCharacter != '{' && node.type != 'braceOpen' && node.type != 'braceClose'){
      this.text += ','
    }
    let offset = this.text.length
    this.text += text
    let textNode = {
      text,
      node,
      offset,
    }
    this.nodes.push(textNode)
  }
  // getOffset(){
  //   return this.text.length
  // }
  getTextNode(offset:number){
    let textNode = this.nodes.find((node,index)=>{
      let nextNode = this.nodes[index+1]
      if(node.offset >= offset && (!nextNode || nextNode.offset > offset)){
        return true
      }
    })
    return textNode
  }
}
