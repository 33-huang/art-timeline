import { createContext } from 'react'
import { s } from './styles'

// 手机视图用 Provider 传入放大字号的样式；电脑版不包 Provider，用默认样式
export const ViewStyleContext = createContext(s)
