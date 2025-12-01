// ================================================================
// 🟣 GESTOR DE CAMPAÑAS (COMPATIBLE CON FIREBASE v8)
// ================================================================

// Este módulo NO usa imports de Firebase.
// Usa window.db y window.auth proporcionados por firebase-init.js.

export const CampanasManager = {
  lista: [],

  // --------------------------------------------------------------
  // 🔵 Cargar campañas desde Firestore
  // --------------------------------------------------------------
  async cargarCampanas() {
    try {
      const snap = await window.db.collection("campanas").get();
      this.lista = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return this.lista;
    } catch (err) {
      console.error("❌ Error al cargar campañas:", err);
      return [];
    }
  },

  // --------------------------------------------------------------
  // 🟢 Crear campaña
  // --------------------------------------------------------------
  async crearCampana(data) {
    try {
      data.creado_en = Date.now();
      data.creado_por = window.auth.currentUser?.email || "desconocido";

      const ref = await window.db.collection("campanas").add(data);
      return { id: ref.id, ...data };
    } catch (err) {
      console.error("❌ Error al crear campaña:", err);
      throw err;
    }
  },

  // --------------------------------------------------------------
  // 🔴 Eliminar campaña
  // --------------------------------------------------------------
  async eliminarCampana(id) {
    try {
      await window.db.collection("campanas").doc(id).delete();
      return true;
    } catch (err) {
      console.error("❌ Error al eliminar campaña:", err);
      throw err;
    }
  },

  // --------------------------------------------------------------
  // 🟡 Actualizar campaña
  // --------------------------------------------------------------
  async actualizarCampana(id, data) {
    try {
      await window.db.collection("campanas").doc(id).update(data);
      return true;
    } catch (err) {
      console.error("❌ Error al actualizar campaña:", err);
      throw err;
    }
  }
};
