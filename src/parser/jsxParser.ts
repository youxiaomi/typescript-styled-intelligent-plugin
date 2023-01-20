type Ts  = typeof import("typescript")
// import  from 'typescript/lib/tsserverlibrary'
import * as ts from 'typescript'
import TsHelp from '../service/tsHelp'
import { AbstractParser } from './abstractParser';
import { StyledComponentNode } from './cssSelectorParser';
import { findResult, flatten, omitUndefined, unique } from '../utils/utils'



export class JsxParser extends AbstractParser{



  // iterateParentNode(node:ts.Node):StyledComponentNode[]|undefined{

  // }
  findJsxOpeningElementOfParent(){

  }
  findJsxClassAttrOfParent(){

  }
  findStyledNodeOfParent(){


  }


}

class IterateParentParser extends AbstractParser{
  fileName = ''

  init(fileName:string){
    this.fileName = fileName
  }
  workVariableDeclarationwork = (node:ts.VariableDeclaration)=>{
    const findStyledNode = this.findStyledNode
    let stringReferences = this.tsHelp.getReferences(fileName,node.getStart());
    let stringNodeReferences = stringReferences.map(reference=>{
      return this.tsHelp.findNode(sourceFile!,reference.textSpan.start)
    })
    let result = stringNodeReferences.map(referenceNode=>{
      return findStyledNode(referenceNode!)
    }).filter(item => item) as StyledComponentNode[][]
    
    return unique(flatten(result),(pre,current)=>{
      return pre.tsNode == current.tsNode
    })
  }
  workJsxAttribute = (node:ts.JsxAttribute)=>{
    const findStyledNode = this.findStyledNode
    let { name } = node
    if(name.escapedText == 'className' || name.escapedText == 'id'){
      return findStyledNode(node.parent)
    }
  }
  workJsxOpeningElement = (node:ts.JsxOpeningElement):StyledComponentNode[] | undefined=>{
    const findStyledNode = this.findStyledNode
    let identifier = this.tsHelp.getJsxOpeningElementIdentier(node);
    if(identifier){
      let definitions = this.tsHelp.getDefinition(fileName,identifier.pos);
      let isCustomeJsxElement = definitions.find(node=>this.tsHelp.isCustomJsxElement(node))
      if(isCustomeJsxElement){
        let referenceNodes = this.tsHelp.getReferenceNodes(fileName,identifier.pos) as  ts.Node[]
        let {scssText} = findResult(referenceNodes,this.tsHelp.getStyledTemplateScss) || {}
        if(scssText){
          return [
            {
              type: 'styledElement',
              scssText: scssText,
              tsNode: node.parent,
              parent: node.parent && node.parent.parent && findStyledNode(node.parent.parent) || []
            }
          ]
        }else{
          return node.parent && node.parent.parent && findStyledNode(node.parent.parent) || undefined
        }
      }else{
        return node.parent && node.parent.parent && findStyledNode(node.parent.parent) || undefined
      }
    }
  }
  findStyledNode = (node:ts.Node):StyledComponentNode[]|undefined=>{
    console.log(ts.SyntaxKind[node.kind],node.getFullText());
    switch(node.kind){
      case ts.SyntaxKind.VariableDeclaration:
        return this.workVariableDeclarationwork(node as ts.VariableDeclaration);
      case ts.SyntaxKind.JsxAttribute:
        return this.workJsxAttribute(node as ts.JsxAttribute);
      case ts.SyntaxKind.JsxOpeningElement:
        return this.workJsxOpeningElement(node as ts.JsxOpeningElement)
      case ts.SyntaxKind.JsxElement:
        return this.workJsxOpeningElement((node as ts.JsxElement).openingElement)
      case ts.SyntaxKind.JsxClosingElement:
        return undefined
      default:
        return this.findStyledNode(node.parent)
    }
  }
  findParentNode(node:ts.Node,type: 'jsxClassAttr'|'openingElement'|'styledJsxElement'){
    const typeMap = {
      jsxClassAttr: (node)=>{
        return true
      },
      openingElement:(node)=>{
        return true
      },
      styledJsxElement:(node)=>{
        return true
      }
    }
    let currentHandler = typeMap[type]

    while(node && !currentHandler(node)){
      switch(node.kind){
        case ts.SyntaxKind.VariableDeclaration:
          return this.workVariableDeclarationwork(node as ts.VariableDeclaration);
        case ts.SyntaxKind.JsxAttribute:
          return this.workJsxAttribute(node as ts.JsxAttribute);
        case ts.SyntaxKind.JsxOpeningElement:
          return this.workJsxOpeningElement(node as ts.JsxOpeningElement)
        case ts.SyntaxKind.JsxElement:
          return this.workJsxOpeningElement((node as ts.JsxElement).openingElement)
        case ts.SyntaxKind.JsxClosingElement:
          return undefined
        default:
          return this.findStyledNode(node.parent)
      }
    }
  }
  findVariableDeclarationParent(node:ts.VariableDeclaration){
    this.programe.getSourceFile
    this.languageService.
    let references = this.tsHelp.getReferenceNodes(node)


  }


}


//  new JsxParser()
