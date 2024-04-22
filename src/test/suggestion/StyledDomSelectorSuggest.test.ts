// const chai = import('chai');
import TsHelp from '../../service/tsHelp';
import CssSelectorParser from '../../parser/cssSelectorParser';
import { languageService } from '../utils/createTsLanguageService';
import * as ts from 'typescript/lib/tsserverlibrary'
import 'mocha'
import assert from 'assert'
describe('StyledDomSelectorSuggest', () => {

  let tsHelp = new TsHelp(ts, languageService);
  let cssSelectorParser = new CssSelectorParser(ts, languageService, tsHelp)
  let program = languageService.getProgram()
  let filePath = 'example/base.tsx'
  let file = program?.getSourceFile(filePath);
  let text = file?.getFullText();



  it(`should className index equal`, () => {
    let pos = text?.search(`.index{`) || 0
    let result = cssSelectorParser.getDomSelectorByStyledTemplateSelector(filePath, pos)
    let definitionConfigs = [
      new DefinitionConfig(`index`, `className='`, text),
    ]
    verifyDefinitions(result,definitionConfigs)
  })

  it('should className user equal', () => {
    let pos = text?.search(`user,.user2`) || 0
   
    let result = cssSelectorParser.getDomSelectorByStyledTemplateSelector(filePath, pos)
    let definitionConfigs = [
      new DefinitionConfig(`user`, `className='`, text,` user2'`),
      new DefinitionConfig(`user`, `className='`, text,`'>`),
      new DefinitionConfig(`user'`, `className='test  `,text),
    ]
   verifyDefinitions(result,definitionConfigs)

  })

  it('show className user2 equal', () => {

    let pos = text?.search(`user2,.testUser2`) || 0
    let result = cssSelectorParser.getDomSelectorByStyledTemplateSelector(filePath, pos)
    let definitionConfigs = [
      new DefinitionConfig(`user2`, `className='user `, text),
    ]
    assert.equal(result?.definitions?.length, 1)
    verifyDefinitions(result,definitionConfigs)
  })

  it(`show + select`, () => {
    let pos = new DefinitionConfig(`name`, `&+.`, text).getStart()
    let result = cssSelectorParser.getDomSelectorByStyledTemplateSelector(filePath, pos)
    let definitionConfigs = [
      new DefinitionConfig(`name`, ``, text,` testSiblingSelector`),
    ]
    verifyDefinitions(result, definitionConfigs)
  })

})

function verifyDefinitions(result:ts.DefinitionInfoAndBoundSpan|undefined,definitionConfigs:DefinitionConfig[]){
  assert.equal(result?.definitions?.length, definitionConfigs.length)
  definitionConfigs.forEach((item,index)=>{
    let definition = result?.definitions?.[index]
    let start = definition?.textSpan.start
    assert.equal(start, item.getStart(),`index:${index}`)
  })
}

class DefinitionConfig{
  constructor(public classNameSelector:string,public prefix:string,public fileText:string = '',public suffix:string = ''){


  }
  getStart(){
    let resultPos = this.fileText?.indexOf(`${this.prefix}${this.classNameSelector}${this.suffix}`) || 0
    resultPos+=this.prefix.length
    return resultPos
  }

}