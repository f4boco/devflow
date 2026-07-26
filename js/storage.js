const STORAGE_KEY = 'devflow_diagram_data';

const Storage = {
  save(elements) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(elements));
    } catch (e) {
      console.error('Erro ao salvar no LocalStorage:', e);
    }
  },

  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Erro ao carregar do LocalStorage:', e);
      return [];
    }
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  }
};