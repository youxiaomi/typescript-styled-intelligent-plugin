

import { describe ,suite} from "mocha"
import * as assert from "assert"
import { getScssService } from "../service/scssService"



// describe('Array', function () {
//   describe('#indexOf()', function () {
//     it('should return -1 when the value is not present', function () {
     
//     });
//   });
// });
const testText = `
  .shop{
    .goods{
      
    }
    color:red;
    .member{
      width:100px;
      .age{
        color:red;
      }
      color:red;
    }
    .name{
      color:blue;
    }
    div{
      .age{
        color:blue;
      }
    }
  }


`



const scssService = getScssService();

let styleSheet = scssService.getScssStyleSheet(testText)

let nodes= scssService.getClassNameNode(styleSheet);


console.log(nodes);

