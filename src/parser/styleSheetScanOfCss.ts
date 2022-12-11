import { JsxElementNode, JsxElementSelector,CandidateTextNode } from './extractCssSelector'

export default class StyleSheetScanOfCss{
  /**
   * .user,#user,{.age{}}
   */
  text = ''
  private nodes:{offset:number,node: any,text:string}[] = [] 
  getText(){
    return this.text
  }
  setText(text:string,node:any){
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
    let nodeLength = this.nodes.length
    let textNode = this.nodes.find((node,index)=>{
      let nextNode = this.nodes[index]
      if(node.offset >= offset && (!nextNode || nextNode.offset > offset)){
        return true
      }
    })
    return textNode
  }
}
