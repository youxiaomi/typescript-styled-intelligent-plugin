// type Ts  = typeof import("typescript")
// import  from 'typescript/lib/tsserverlibrary'
import * as ts from 'typescript/lib/tsserverlibrary'
import TsHelp from '../service/tsHelp'
import { AbstractParser } from './abstractParser';
import { StyledComponentNode } from './cssSelectorParser';
import { findResult, flatten, omitUndefined, unique } from '../utils/utils'
import logger from '../service/logger';



export class JsxParser extends AbstractParser{
  constructor(typescript: typeof ts,languageService: ts.LanguageService,tsHelp: TsHelp){
    super(typescript,languageService,tsHelp);
    this.iterateParentParser = new IterateParentParser(this.typescript,this.languageService,this.tsHelp)
  }
  iterateParentParser: IterateParentParser
  findJsxOpeningElementOfParent(node:ts.Node){
    // return this.iterateParentParser.findStyledElement(node)
  }
  findJsxClassAttrOfParent(){

  }
  findStyledNodeOfParent(node){
    return this.iterateParentParser.findTopStyledElement(node)
  }


}

  
export type ParentReferenceNode = ({type: 'styledElement',referenceNode:ts.Node} | {type: 'variableReference'|'className'|'id'|'node'}) &  { tsNode: ts.Node  };

class IterateParentParser extends AbstractParser{
  fileName = ''
  init(fileName:string){
    this.fileName = fileName
  }
  findReferencesNodes(node:ts.Node,):ParentReferenceNode[]{
    let ts = this.typescript
    if(!node){
      return []
    }
    logger.info(node.getFullText())
    switch(node.kind){
      case ts.SyntaxKind.VariableDeclaration:
        return this.findVariableDeclarationParent(node as ts.VariableDeclaration);
      case ts.SyntaxKind.JsxAttribute:
        return this.findJsxAttr(node as ts.JsxAttribute,);
      // case ts.SyntaxKind.JsxOpeningElement:
      //   return this.findJsxOpeningElement(node as ts.JsxOpeningElement,fileName)
      case ts.SyntaxKind.JsxElement:
        return this.findJsxOpeningElement((node as ts.JsxElement),)
      case ts.SyntaxKind.FunctionDeclaration:
        return this.findFunctionDeclaration(node as ts.FunctionDeclaration)
      case ts.SyntaxKind.JsxClosingElement:
        return []
      default:
        return this.findReferencesNodes(node.parent)
    }
  }
  findVariableDeclarationParent(node:ts.VariableDeclaration ){
    const sourceFile = node.getSourceFile()
    let fileName = sourceFile.fileName
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
  findParentNodes(node, type: ParentReferenceNode['type'] ,options?:{isAllParent?:boolean,topParent?:boolean,iterateLevel?:number}){
    let { isAllParent = false } = options || {}
    let parentReferenceNodes:ParentReferenceNode[] = []
    let nodes:ParentReferenceNode[] = [{tsNode: node, type:'node'}];
    while(nodes.length){
      let currentNode = nodes.shift()
      logger.info(currentNode?.tsNode.getFullText())
      if(currentNode){
        if(currentNode.type == type){
          parentReferenceNodes.push(currentNode)
          if(isAllParent){
            nodes = nodes.concat(this.findReferencesNodes(currentNode.tsNode.parent))
          }
        }else{
          let referenceNodes = this.findReferencesNodes(currentNode.tsNode.parent)
          nodes = nodes.concat(referenceNodes)
        }
      }
    }
    return parentReferenceNodes
  }
  findStyledElement(node,isAllParent = false){
    return this.findParentNodes(node,'styledElement',{isAllParent})
  }
  findAllStyledElement(){

  }
  findTopStyledElement(node){
    let nodes =  this.findParentNodes(node,'styledElement',{isAllParent:true})
    return nodes[nodes.length - 1]
  }
  findJsxAttr(node:ts.JsxAttribute):ParentReferenceNode[]{
    let { name } = node
    if(['className','id'].includes(name.escapedText.toString())){
      return [{
        type: name.escapedText.toString() == 'id' ? 'id' : 'className',
        tsNode: node
      }]
    }
    return []
  }
  findJsxClassName(node){
    
  }
  findJsxId(node){

  }
  findJsxOpeningElement(jsxNode: ts.JsxElement):ParentReferenceNode[]{
    let node = jsxNode.openingElement
    let sourceFile = jsxNode.getSourceFile()
    let fileName = sourceFile.fileName
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
          tsNode: jsxNode,
          referenceNode: node
        }]
      }
    }
    return [{type:'node',tsNode: jsxNode}]
  }
  findFunctionDeclaration(node: ts.FunctionDeclaration):ParentReferenceNode[]{
    const { name } = node
    let sourceFile = node.getSourceFile()
    let references = this.tsHelp.getReferenceNodes(sourceFile.fileName, node.getStart());
    return references.map(ref=>{
      return {
        type:'node',
        tsNode: ref,
        // reference: ref,
      }
    })
  }

}


//  new JsxParser()
