


type Ts  = typeof import("typescript")
// import  from 'typescript/lib/tsserverlibrary'
import * as ts from 'typescript'
import { unique } from '../utils/utils'

export default class TsHelp {
  constructor(typescript: Ts,languageService: ts.LanguageService){
    this.typescript = typescript
    typescript
    this.languageService = languageService
  }
  typescript:Ts
  languageService: ts.LanguageService
  isInReferenceNode = (referenceNode:ts.ReferenceEntry,pos)=>{
    return referenceNode.textSpan.start <= pos && referenceNode.textSpan.start+referenceNode.textSpan.length >= pos
  }
  findNode(sourceFile: ts.SourceFile, position: number){
    let  find = (node: ts.Node): ts.Node | undefined  => {
      if (position >= node.getStart() && position < node.getEnd()) {
        return this.typescript.forEachChild(node, find) || node;
      }
    }
    return find(sourceFile);
  }
  findNodeByRange(sourceFile: ts.SourceFile, startPosition: number,endPosition: number){
    let find = (node: ts.Node): ts.Node | undefined  => {
      if (startPosition == node.getStart() && endPosition == node.getEnd()) {
        return node;
      } else{
        let _node = this.typescript.forEachChild(node, find)
        return  _node;
      }
    }
    let _node = find(sourceFile)
    return _node
  }
  getStyledTemplateNodeNameIdentifier(templateNode){
    return templateNode.parent.parent
  }
  getReferences(fileName,pos:number,noSelf:boolean = true){
    let references =  this.languageService.getReferencesAtPosition(fileName,pos) || []
    return references.filter(reference=>{
      if(noSelf && this.isInReferenceNode(reference,pos)){
        return false
      }
      return reference
    })
  }
  getReferenceNodes(fileName:string,pos: number,noSelf:boolean = true){
    let references = this.getReferences(fileName,pos);
    let program = this.languageService.getProgram()
    let referenceNodes = references?.map(reference => {

      let sourceFile = program?.getSourceFile(reference.fileName)
      if (sourceFile) {
        if(!reference.contextSpan){
          return undefined
        }
        let start = reference.contextSpan?.start || 0
        let end  = ( reference.contextSpan?.start || 0 )+ (reference.contextSpan?.length || 0 )
        return this.findNodeByRange(sourceFile,start, end)
      } else {
        return undefined
      }
    })
    
    referenceNodes = referenceNodes.filter(reference => {
      if(!reference){
        return false
      }
      if(noSelf){
        return !(pos >= reference.pos  && pos  <= reference.end)
      }
      return true
    })
    referenceNodes = unique(referenceNodes)
    return referenceNodes
  }
  getDefinition(fileName,pos:number){
    return  this.languageService.getDefinitionAtPosition(fileName,pos) || []
  }
  getDefinitionNodes(fileName,pos:number){
    let definitions = this.getDefinition(fileName,pos)
    let program = this.languageService.getProgram()
    return definitions.map(definition =>{
      let sourceFile = program?.getSourceFile(definition.fileName)
      if (sourceFile) {
        if(!definition.contextSpan){
          return undefined
        }
        let start = definition.contextSpan?.start || 0
        let end  = ( definition.contextSpan?.start || 0 )+ (definition.contextSpan?.length || 0 )
        return this.findNodeByRange(sourceFile,start, end)
      } else {
        return undefined
      }
    })
  }
  isCustomJsxElement(node){
    // return node && node.containerName != 'JSX.IntrinsicElements'
    return node && !['StyledComponentBase','JSX.IntrinsicElements'].includes(node.containerName)
  }
  getStyledTemplateScss = (node:ts.Node):{scssText:string,TaggedTemplateNode:ts.TaggedTemplateExpression}|undefined=>{
    if(node.kind == ts.SyntaxKind.FirstStatement){
      let _node = node as ts.VariableStatement
      let { declarationList } = _node
      let { declarations } = declarationList
      let scssText:string = ''
      let TaggedTemplateNode
      declarations.forEach(declaration=>{
        if(declaration.initializer && declaration.initializer.kind == ts.SyntaxKind.TaggedTemplateExpression){
          let node = declaration.initializer  as ts.TaggedTemplateExpression
          scssText = node.template.getFullText();
          TaggedTemplateNode = declaration.initializer
        }
      })
      return {
        scssText: scssText,
        TaggedTemplateNode,
      }
    }
  }

  getJsxOpeningElementIdentier = (openingElement: ts.JsxOpeningElement)=>{
    return  ts.forEachChild(openingElement,(node)=>{
      if(node.kind == ts.SyntaxKind.Identifier){
        return node
      }
    });
  }
  
}

