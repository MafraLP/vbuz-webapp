// src/services/ModalService.ts
interface ModalInstance {
  open: (initialData?: any) => void;
  close: () => void;
}

export class ModalService {
  private modals: Record<string, ModalInstance> = {};
  private activeModals: string[] = [];

  registerModal(id: string, modalInstance: ModalInstance): void {
    this.modals[id] = modalInstance;
  }

  unregisterModal(id: string): void {
    delete this.modals[id];
    this.activeModals = this.activeModals.filter(modalId => modalId !== id);
  }

  openModal(id: string, initialData: any = null): boolean {
    const modal = this.modals[id];
    if (modal) {
      modal.open(initialData);
      if (!this.activeModals.includes(id)) {
        this.activeModals.push(id);
      }
      return true;
    }
    console.warn(`Modal com ID '${id}' não encontrado.`);
    return false;
  }

  closeModal(id: string): boolean {
    const modal = this.modals[id];
    if (modal) {
      modal.close();
      this.activeModals = this.activeModals.filter(modalId => modalId !== id);
      return true;
    }
    console.warn(`Modal com ID '${id}' não encontrado.`);
    return false;
  }

  closeAllModals(): void {
    Object.values(this.modals).forEach(modal => modal.close());
    this.activeModals = [];
  }

  isModalActive(id: string): boolean {
    return this.activeModals.includes(id);
  }

  getActiveModals(): string[] {
    return [...this.activeModals];
  }
}

// Exporta uma instância singleton
export const modalService = new ModalService();
