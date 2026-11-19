import { createContext, useContext } from 'react'

/** o App fornece a abertura das configurações; sem provider (testes de aba isolada) a engrenagem some */
export const OpenSettingsContext = createContext<(() => void) | undefined>(undefined)
export const useOpenSettings = () => useContext(OpenSettingsContext)
