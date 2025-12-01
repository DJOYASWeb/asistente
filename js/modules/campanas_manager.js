// ===============================================
// 🟣 GESTOR DE CAMPAÑAS (Firestore)
// ===============================================

import { db, auth } from "./firebase-init.js";
import { 
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

export const CampanasManager = {
  lista: [],

  async cargarCampanas() {
    const snap = await getDocs(collection(db, "campanas"));
    this.lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return this.lista;
  },

  async crearCampana(data) {
    data.creado_en = Date.now();
    data.creado_por = auth.currentUser?.email || "desconocido";
    return await addDoc(collection(db, "campanas"), data);
  },

  async eliminarCampana(id) {
    return await deleteDoc(doc(db, "campanas", id));
  },

  async actualizarCampana(id, data) {
    return await updateDoc(doc(db, "campanas", id), data);
  }
};
