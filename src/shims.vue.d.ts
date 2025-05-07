// Desabilitar verificações de tipo para o Vue e outras bibliotecas
declare module '*.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<any, any, any>;
  export default component;
}

declare module 'leaflet' {
  const L: any;
  export default L;
}
