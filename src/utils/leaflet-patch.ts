// Este arquivo corrige avisos de propriedades obsoletas no Leaflet
// Deve ser importado antes de qualquer importação do Leaflet

// Patch para Leaflet para evitar avisos de propriedades obsoletas
// Baseado em: https://github.com/Leaflet/Leaflet/issues/7255
const originalMouseEventGetter = Object.getOwnPropertyDescriptor(MouseEvent.prototype, 'mozPressure')?.get;

if (originalMouseEventGetter) {
  // Sobrescrever propriedades obsoletas com versões modernas
  Object.defineProperties(MouseEvent.prototype, {
    mozPressure: {
      get: function() {
        // Se tivermos um PointerEvent, use .pressure
        if (this instanceof PointerEvent) {
          return this.pressure;
        }
        // Caso contrário, volte para o comportamento original
        return originalMouseEventGetter.call(this);
      },
      configurable: true
    },
    mozInputSource: {
      get: function() {
        // Se tivermos um PointerEvent, use .pointerType
        if (this instanceof PointerEvent) {
          return this.pointerType;
        }
        // Valor padrão
        return 0;
      },
      configurable: true
    }
  });
}

export default {};
