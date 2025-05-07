// src/boot/modal.ts
import { boot } from 'quasar/wrappers';
import { modalService } from 'src/services/ModalService';

export default boot(({ app }) => {
  // Registra o serviço de modais como propriedade global
  app.config.globalProperties.$modal = modalService;
});

// Exporta o serviço para uso em componentes via importação
export { modalService };
