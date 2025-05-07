// Isso estende a definição de tipos do Leaflet para resolver incompatibilidades
import * as L from 'leaflet';

declare module 'leaflet' {
  // Permite qualquer tipo para métodos como addTo
  interface Map {
    addControl(control: any): any;
    removeControl(control: any): any;
    // Adicione outros métodos problemáticos aqui
  }

  // Declara que controles podem ser adicionados a qualquer objeto
  namespace control {
    interface Scale {
      addTo(map: any): any;
    }
  }
}
