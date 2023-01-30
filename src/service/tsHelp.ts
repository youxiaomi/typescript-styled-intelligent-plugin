


type Ts  = typeof import("typescript")
// import  from 'typescript/lib/tsserverlibrary'
import * as ts from 'typescript'
import { containerNames } from '../parser/types'
import { getTaggedLiteralName, getTagName, isTaggedLiteral } from '../utils/templateUtil'
import { omitUndefined, unique } from '../utils/utils'

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
    let referenceNodes:ts.Node[] = []
    references?.forEach(reference => {

      let sourceFile = program?.getSourceFile(reference.fileName)
      if (sourceFile) {
        if(!reference.contextSpan){
          return undefined
        }
        let start = reference.contextSpan?.start || 0
        let end  = ( reference.contextSpan?.start || 0 )+ (reference.contextSpan?.length || 0 )
        const  node = this.findNodeByRange(sourceFile,start, end)
        if(node){
          referenceNodes.push(node)
        }
        return node
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
  getDefinitionNodes(fileName:string,pos:number){
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
  getDefinitionNodesByNode = (node:ts.Node)=>{
    let sourceFile = node.getSourceFile();
    return omitUndefined(this.getDefinitionNodes(sourceFile.fileName,node.getStart()))
  }
  getDefinitionLastNodeByIdentiferNode = (node:ts.Node)=>{
    return this.getDefinitionNodesByNode(node)[0]
  }
  isCustomJsxElement(node){
    // return node && node.containerName != 'JSX.IntrinsicElements'
    return node && !['StyledComponentBase','JSX.IntrinsicElements'].includes(node.containerName)
  }
  isFunctionComponent = (node)=>{
    return node && ![containerNames.JsxIntrinsicElements,containerNames.StyledComponentBase].includes(node.containerName)
  }
  isIntrinsicElement = (defineNode:ts.DefinitionInfo)=>{
    return defineNode.containerName === containerNames.JsxIntrinsicElements
  }
  isStyledComponentElement = (defineNode:ts.DefinitionInfo)=>{
    return defineNode.containerName === containerNames.StyledComponentBase
  }
  getStyledTemplateScss = (node:ts.Node):{sassText:string,TaggedTemplateNode:ts.TaggedTemplateExpression,template: ts.TemplateLiteral}|undefined=>{
    if(node.kind == ts.SyntaxKind.FirstStatement){
      let _node = node as ts.VariableStatement
      let { declarationList } = _node
      let { declarations } = declarationList
      let scssText:string = ''
      let TaggedTemplateNode
      let template
      declarations.forEach(declaration=>{
        if(declaration.initializer && declaration.initializer.kind == ts.SyntaxKind.TaggedTemplateExpression){
          let node = declaration.initializer  as ts.TaggedTemplateExpression
          template = node.template
          scssText = node.template.getText();
          scssText = scssText.slice(1,-1)
          TaggedTemplateNode = declaration.initializer
        }
      })
      return {
        sassText: scssText,
        TaggedTemplateNode,
        template: template,
      }
    }
  }

  getJsxOpeningElementIdentier = (openingElement: ts.JsxOpeningElement) =>{
    return  ts.forEachChild(openingElement,(node)=>{
      if(node.kind == ts.SyntaxKind.Identifier){
        return node
      }
    }) as  ts.Node;
  }
  getTag = (node: ts.Node)=>{
    switch(node.kind){
      case ts.SyntaxKind.TaggedTemplateExpression: 
        return getTagName(node as ts.TaggedTemplateExpression,['styled'])
      case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
        return getTaggedLiteralName(this.typescript, node as ts.NoSubstitutionTemplateLiteral,['styled'])
      case ts.SyntaxKind.TemplateHead:
        if(node.parent && node.parent.parent){
          return this.getTag(node.parent.parent)
        }
      case ts.SyntaxKind.TemplateExpression:
        return this.getTag(node.parent);
      case ts.SyntaxKind.TemplateMiddle:
      case ts.SyntaxKind.TemplateTail:
        if(node.parent && node.parent.parent){
          return this.getTag(node.parent.parent.parent)
        }
    }
  }
  getTagVariableDeclarationNode = (node: ts.Node | undefined) => {
    if (!node) {
      return
    }
  
    switch(node.kind){
      case ts.SyntaxKind.TaggedTemplateExpression: 
      case ts.SyntaxKind.TemplateExpression: 
        return this.getTagVariableDeclarationNode(node.parent)
      case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
        return this.getTagVariableDeclarationNode(node.parent as ts.TaggedTemplateExpression)
      case ts.SyntaxKind.TemplateHead:
        if(node.parent && node.parent.parent){
          return this.getTagVariableDeclarationNode(node.parent.parent)
        }
      case ts.SyntaxKind.TemplateMiddle:
      case ts.SyntaxKind.TemplateTail:
        if(node.parent && node.parent.parent){
          return this.getTagVariableDeclarationNode(node.parent.parent.parent)
        }
      case ts.SyntaxKind.VariableDeclaration:
        return node
    }
    return undefined
  }
  getTemplateNode = (sourceFile: ts.SourceFile,position:number)=>{
    let node = this.findNode(sourceFile,position)
    const getTemplateNode = (node:ts.Node)=>{
      switch(node.kind){
        case ts.SyntaxKind.TemplateHead:
          return node.parent;
        case ts.SyntaxKind.LastTemplateToken:
          return getTemplateNode(node.parent);
        case ts.SyntaxKind.TemplateSpan:
          return getTemplateNode(node.parent)
      }
      return node
    }
    return getTemplateNode(node!)
  }
}

