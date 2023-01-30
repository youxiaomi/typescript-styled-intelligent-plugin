type Ts  = typeof import("typescript")
// import  from 'typescript/lib/tsserverlibrary'
import * as ts from 'typescript'
import TsHelp from '../service/tsHelp'
import { AbstractParser } from './abstractParser';
import { StyledComponentNode } from './cssSelectorParser';
import { findResult, flatten, omitUndefined, unique } from '../utils/utils'



export class JsxParser extends AbstractParser{
  constructor(typescript: Ts,languageService: ts.LanguageService,tsHelp: TsHelp){
    super(typescript,languageService,tsHelp);
    this.iterateParentParser = new IterateParentParser(this.typescript,this.languageService,this.tsHelp)
  }
  iterateParentParser: IterateParentParser
  findJsxOpeningElementOfParent(node:ts.Node,fileName:string){
    return this.iterateParentParser.findStyledElement(node,fileName)
  }
  findJsxClassAttrOfParent(){

  }
  findStyledNodeOfParent(node,fileName){
    return this.iterateParentParser.findStyledElement(node,fileName)
  }


}

  
export type ParentReferenceNode = ({type: 'styledElement',referenceNode:ts.Node} | {type: 'variableReference'|'className'|'id'|'node'}) &  { tsNode: ts.Node ,fileName:string };

class IterateParentParser extends AbstractParser{
  fileName = ''
  init(fileName:string){
    this.fileName = fileName
  }
  findReferencesNodes(node:ts.Node,fileName:string):ParentReferenceNode[]{

    switch(node.kind){
      case ts.SyntaxKind.VariableDeclaration:
        return this.findVariableDeclarationParent(node as ts.VariableDeclaration,fileName);
      case ts.SyntaxKind.JsxAttribute:
        return this.findJsxAttr(node as ts.JsxAttribute,fileName);
      // case ts.SyntaxKind.JsxOpeningElement:
      //   return this.findJsxOpeningElement(node as ts.JsxOpeningElement,fileName)
      case ts.SyntaxKind.JsxElement:
        return this.findJsxOpeningElement((node as ts.JsxElement),fileName)
      case ts.SyntaxKind.JsxClosingElement:
        return []
      default:
        return this.findReferencesNodes(node.parent,fileName)
    }
  }
  findVariableDeclarationParent(node:ts.VariableDeclaration,fileName:string, ){
    const sourceFile = this.programe.getSourceFile(fileName)
    // this.languageService. 
    let references = this.tsHelp.getReferences(fileName,node.getStart());
    let parentReferenceNodes: ParentReferenceNode[] = []
    references.forEach((reference=>{
      let node =  this.tsHelp.findNode(sourceFile!,reference.textSpan.start)
      if(node){
        // let referenceNode = this.findReferencesNodes(node,fileName)
        // parentReferenceNodes = parentReferenceNodes.concat(referenceNode)
        parentReferenceNodes.push({
          type: 'variableReference',
          tsNode: node,
          fileName: reference.fileName
        })
      }
    }));
    return parentReferenceNodes
    // let nodes = this.tsHelp.getReferenceNodes(fileName, node.getStart());
    // return nodes.map(node=>{
    //   return {
    //     type: 'variableReference',
    //     tsNode: node,
    //     fileName: fileName
    //   }
    // })
  }
  findParentNodes(node,fileName, type: ParentReferenceNode['type'] ,isAllParent = false){
    let parentReferenceNodes:ParentReferenceNode[] = []
    let nodes:ParentReferenceNode[] = [{fileName,tsNode: node, type:'node'}];
    while(nodes.length){
      let currentNode = nodes.shift()
      if(currentNode){
        if(currentNode.type == type){
          parentReferenceNodes.push(currentNode)
          if(isAllParent){
            nodes = nodes.concat(this.findReferencesNodes(currentNode.tsNode.parent,currentNode.fileName))
          }
        }else{
          let referenceNodes = this.findReferencesNodes(currentNode.tsNode.parent,currentNode.fileName)
          nodes = nodes.concat(referenceNodes)
        }
      }
    }
    return parentReferenceNodes
  }
  findStyledElement(node,fileName,isAllParent = false){
    return this.findParentNodes(node,fileName,'styledElement')
  }
  findAllStyledElement(){

  }
  findJsxAttr(node:ts.JsxAttribute,fileName):ParentReferenceNode[]{
    let { name } = node
    if(['className','id'].includes(name.escapedText.toString())){
      return [{
        type: name.escapedText.toString() == 'id' ? 'id' : 'className',
        fileName: fileName,
        tsNode: node
      }]
    }
    return []
  }
  findJsxClassName(node){
    
  }
  findJsxId(node){

  }
  findJsxOpeningElement(jsxNode: ts.JsxElement,fileName):ParentReferenceNode[]{
    let node = jsxNode.openingElement
    let identifier = this.tsHelp.getJsxOpeningElementIdentier(node);
    //default first
    let definition = this.tsHelp.getDefinition(fileName,identifier.pos)[0];
    if(this.tsHelp.isCustomJsxElement(definition)){
      let node = this.tsHelp.getReferenceNodes(fileName,identifier.pos)[0] as  ts.Node
      let {sassText} = this.tsHelp.getStyledTemplateScss(node) || {}
      if(sassText){
        return [{
          type: 'styledElement',
          // sassText: sassText,
          fileName: fileName,
          tsNode: jsxNode,
          referenceNode: node
        }]
      }
    }
    return [{type:'node',fileName,tsNode: jsxNode}]
  }


}


//  new JsxParser()
