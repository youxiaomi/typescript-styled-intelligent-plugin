
import React from 'react'
import styled from 'styled-components'



var bb = 123
const getAge = ()=>{
  let   aa = 'a123'
  let bb = aa ? 'user1' : 'b123'
  return a ? aa :      bb      
}
var User2  = styled.div`


`
// var User = styled.div`
var User = styled(User2)`
  .user{
    .user1{

    }
  }
  .user{
    &.user2.user3{

    }
    .user1{
        #user5{

        }
    }
  }
  .user22,.user3{
    .age{
      .age2{

      }
      .age2{

      }
    }
  }
`

var roots = {
  aaa:'aaa',
}


var Member = styled.div`
 
  .user,.bbbb,.bbb div.member{
    color: blue;
    .user1{
      width:120px
    }
  }
  .user,.user1{
    color:red;

    width: ${p=>p ? '100px':'110px'};
    height: ${p=>p ? '100':'110'}px;
  }
  .b123{
    color:red;
  }
  .member{
    height: 120px;
  }
`

var a = true

var ShowMemeber = (props:any)=>{



  return <div>
    <Member id='testid' className={`bbbb member ${u} aaaa`}>
      <div className={`member-age ${getAge()}`}></div>
    </Member>
  </div>
}

var u:string = 'user1'
var getAA = ()=>{
  return u == 'u' ?  'user' : 'user3'
}
var aa = ['a']
var elements = [
  <div className='user'>123</div>,
  // <div className='user'>123</div>,
  <div className='user user22'>123</div>,
]
function renderElement(ele:any){
  return elements

  // return renderElement2()
  function renderAge(){
    return ele
  }
  // return renderAge()
}
function renderElement2(){
  return <div className='user'>123</div>
}
var ele = <div className='user'>1111</div>

const User22 = styled.div`
  .user22{

  }
`

const AA = () => {

  return <div>
    <User className={`user2 ${u} user9`}>
    <User22>
      { renderElement(ele) }
    </User22>  
      {/* { renderElement2() } */}
      { aa.map(a=>{
        return <div  className='user'></div>
      }) }
      { <div  className='user'></div> }
      <div  className='user'>
        <div className='user1'>
          <div id='user5'></div>
        </div>
      </div>
      <div className={`user22 user3 ${ u ? 'user' : 'user3' }  ${getAA()}`}></div>
      <div  className=' user22 user user3 user2 '>
        
        <div className={` user222   user3   `}>
          <div className='age'>
            <div className='age2'> </div>
          </div>
        </div>
        tom
      </div>
      <div id='user5'></div>

        {/* <ShowMemeber>

      </ShowMemeber>
      { ShowMemeber({}) } */}
      {/* <div id='testid' className='user'> */}
      {/* <div className='name'>tom</div>
      <div className='age'>age</div> */}
    </User>
    {/* <div>

    </div>
    <User className='user user2'>
      <div className='name name2'>tom</div>
      <div className='name'>tom</div>
      <div className='age'>age</div>
    </User> */}
  </div>
}


const AA1= styled.div`
  .user{

  }
`

const bb1 = () => {
  return <AA1 >
    <div className="user"></div>
  </AA1>
}
