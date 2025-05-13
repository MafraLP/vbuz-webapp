// src/boot/pinia.js
import { boot } from 'quasar/wrappers'
import { createPinia } from 'pinia'

// Crie uma nova instância do Pinia
const pinia = createPinia()

export default boot(({ app }) => {
  // Adicione o Pinia à aplicação
  app.use(pinia)
})
