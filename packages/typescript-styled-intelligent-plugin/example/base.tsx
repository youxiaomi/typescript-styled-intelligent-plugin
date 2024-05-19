
import React, { PropsWithChildren } from 'react'
import styled from 'styled-components'


const IndexView = styled.div`
  .index{
    div .user2{}
    .user,.user2{

    }
    .user{/*testuser1*/
      &.user2,.testUser2{

      }
    }
    .user.user2{

    }
    .user+.name{

    }
    .user{/*testuser2*/
      &+.name{

      }
      .name{

      }
    }
    #testMethod{}
  }
`

class IndexClass extends React.Component{

  renderMethod(){

    return <div id='testMethod'></div>
  }

  render(){
    return <IndexView>
      <div className='index'>
        <div className='user user2'></div>
        <div className='user'>
          <div className='user2'>{/*user2 mark1*/}
            <div className='name'></div>
          </div>
        </div>
        <div className=' name testSiblingSelector'></div>
        <div className='test  user'>
          <div>
            <div className='name'></div>{/**+name*/}
          </div>
        </div>
        {this.renderMethod()}
      </div>
    </IndexView>
  }
}
