
import React from 'react'
import styled from 'styled-components'


var bb = 123

var User = styled.div`
  a234567890abced
`

var roots = {
  aaa:'aaa',
}
const getAge = ()=>{
  let   aa = 'a123'
  let bb = aa ? 'user1' : 'b123'
  return a ? aa :      bb      
}
var Member = styled.div`
  .user,.user1 div.member{
    color: blue;
    .age{
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
    <Member id='testid' className={`bbbb ${getAge()} member ${u} aaaa`}>
      <div className='member-age'></div>
    </Member>
  </div>
}

var u:string = 'user1'
const AA = () => {

  return <div>
    <User className={`user ${u}`}>
      <ShowMemeber>

      </ShowMemeber>
      { ShowMemeber({}) }
      <div className='name'>tom</div>
      <div className='name'>tom</div>
      <div className='age'>age</div>
    </User>
    <div>

    </div>
    <User className='user user2'>
      <div className='name name2'>tom</div>
      <div className='name'>tom</div>
      <div className='age'>age</div>
    </User>
  </div>
}