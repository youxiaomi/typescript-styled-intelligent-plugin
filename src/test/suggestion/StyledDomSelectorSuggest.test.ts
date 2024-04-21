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
  it('should className index equal', () => {
    let pos = text?.search(`.index{`) || 0
    let resultPos = text?.search(`='index'`) || 0
    resultPos+=2
    let result = cssSelectorParser.getDomSelectorByStyledTemplateSelector(filePath, pos)
    assert.equal(!!result, true)
    let start = result?.definitions && result?.definitions[0].textSpan.start
    assert.equal(start, resultPos,)
  })
  it('should className user equal', () => {
    let pos = text?.search(`.user,.user2`) || 0
   
    let result = cssSelectorParser.getDomSelectorByStyledTemplateSelector(filePath, pos)
    // assert.equal(result?.definitions?.length, 3)
    let definitionConfigs = [
      new DefinitionConfig(`user`, `className='`, text,` user2'`),
      new DefinitionConfig(`user`, `className='`, text,`'>`),
      new DefinitionConfig(`user'`, `className='test `,text),
    ]
    // let definitions = result?.definitions?.sort((a,b)=>a.textSpan.start - b.textSpan.start)
    result?.definitions?.forEach((item, index) => {
      let definitionConfig = definitionConfigs[index]
      let start = item.textSpan.start
      assert.equal(start, definitionConfig.getStart(),`index:${index}`)
    })

    // let start = result?.definitions && result?.definitions[0].textSpan.start
    // assert.equal(start, resultPos,)
  })
})

function verifyDefinitionAndBoundSpan(result: ts.DefinitionInfoAndBoundSpan | undefined, text: string, pos: number, expectPos: number) {
  assert.equal(!!result, true)
  let start = result?.definitions && result?.definitions[0].textSpan.start
  assert.equal(start, expectPos,)
}
class DefinitionConfig{
  constructor(public classNameSelector:string,public prefix:string,public fileText:string = '',public suffix:string = ''){


  }
  getStart(){
    let resultPos = this.fileText?.search(`${this.prefix}${this.classNameSelector}${this.suffix}`) || 0
    resultPos+=this.prefix.length
    return resultPos
  }

}