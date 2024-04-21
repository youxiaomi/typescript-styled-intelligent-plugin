import React from 'react'
import { User } from "./base"
import Components from './components'




export default ()=>{

  const getClassName = ()=>{
    return 'user22' || 'user3'
  }
  return <div>
    <Components.Shop className='shop'>
      <div className='user b123 user3'></div>
      <div className={`user3 ${getClassName()}`}></div>
    </Components.Shop>
  </div>
}