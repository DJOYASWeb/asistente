// tareas.js

let noteGrid = document.getElementById('noteGrid');
let historial = [];
let rehacerHistorial = [];

if (noteGrid) {
  window.addEventListener('DOMContentLoaded', loadNotes);
}

function guardarEstado() {
  const estadoActual = localStorage.getItem('tareasNotas');
  if (estadoActual) historial.push(estadoActual);
  if (historial.length > 50) historial.shift();
  rehacerHistorial = [];
}

function deshacer() {
  if (historial.length === 0) return;
  const estadoAnterior = historial.pop();
  rehacerHistorial.push(localStorage.getItem('tareasNotas'));
  localStorage.setItem('tareasNotas', estadoAnterior);
  loadNotes();
}

function rehacer() {
  if (rehacerHistorial.length === 0) return;
  const siguiente = rehacerHistorial.pop();
  localStorage.setItem('tareasNotas', siguiente);
  loadNotes();
}

function saveNotes() {
  guardarEstado();
  const notes = [...document.querySelectorAll('.note')].map(note => ({
    title: note.querySelector('.note-title').value,
    date: note.querySelector('.note-date').value,
    tasks: [...note.querySelectorAll('.task')].map(task => ({
      text: task.querySelector('span').textContent,
      checked: task.querySelector('input[type="checkbox"]').checked
    }))
  }));
  localStorage.setItem('tareasNotas', JSON.stringify(notes));
}

function loadNotes() {
  if (!noteGrid) return;
  const data = JSON.parse(localStorage.getItem('tareasNotas') || '[]');
  noteGrid.innerHTML = '';
  data.forEach(note => createNote(note));
}

function addNote() {
  createNote();
}

function createNote(data = {}) {
  const col = document.createElement('div');
  col.className = 'col-12 col-sm-6 col-lg-3 mb-3';
  const noteId = 'note_' + Date.now();
  const note = document.createElement('div');
  note.className = 'card note p-3';
  note.setAttribute('id', noteId);

  note.innerHTML = `
    <div class="d-flex align-items-center justify-content-between mb-1">
      <input type="text" class="form-control note-title border-0 fw-bold fs-6 me-2" placeholder="Título..." value="${data.title || ''}" oninput="saveNotes()" />
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-sm btn-outline-secondary position-relative overflow-hidden">
          <i class="fas fa-calendar-alt"></i>
          <input type="date" class="note-date position-absolute top-0 start-0 opacity-0"
                 style="width: 100%; height: 100%; cursor: pointer;" value="${data.date || ''}" onchange="actualizarFecha(this)">
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteNote(this)">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
    <small class="text-muted fecha-visual ms-1 mb-2">${data.date ? `📅 ${data.date}` : ''}</small>
    <hr>
    <div class="tasks mb-2">
      ${(data.tasks || []).map(t => `
        <div class="task d-flex align-items-center mb-1">
          <input type="checkbox" class="form-check-input me-2" ${t.checked ? 'checked' : ''} onchange="toggleComplete(this)">
          <span class="flex-grow-1 ${t.checked ? 'text-decoration-line-through text-muted' : ''}" ondblclick="editarTarea(this)">${t.text}</span>
          <button class="btn btn-sm btn-outline-secondary ms-2" onclick="removeTask(this)">
            <i class="fas fa-times"></i>
          </button>
        </div>`).join('')}
    </div>
    <div class="input-group input-group-sm mb-2">
      <input type="text" class="form-control" placeholder="Nueva tarea..." />
      <button class="btn btn-outline-primary" onclick="addTask(this)">+</button>
    </div>
  `;

  col.appendChild(note);
  noteGrid.appendChild(col);
  saveNotes();
}

function addTask(button) {
  const note = button.closest('.note');
  const input = note.querySelector('.input-group input');
  const tasks = note.querySelector('.tasks');
  const taskText = input.value.trim();
  if (!taskText) return;

  const taskEl = document.createElement('div');
  taskEl.className = 'task d-flex align-items-center mb-1';
  taskEl.innerHTML = `
    <input type="checkbox" class="form-check-input me-2" onchange="toggleComplete(this)">
    <span class="flex-grow-1" ondblclick="editarTarea(this)">${taskText}</span>
    <button class="btn btn-sm btn-outline-secondary ms-2" onclick="removeTask(this)">
      <i class="fas fa-times"></i>
    </button>
  `;
  tasks.appendChild(taskEl);
  input.value = "";
  saveNotes();
}

function toggleComplete(checkbox) {
  const span = checkbox.nextElementSibling;
  span.classList.toggle('text-decoration-line-through', checkbox.checked);
  span.classList.toggle('text-muted', checkbox.checked);
  saveNotes();
}

function removeTask(button) {
  button.closest('.task').remove();
  saveNotes();
}

function deleteNote(button) {
  button.closest('.col-12').remove();
  saveNotes();
}

function actualizarFecha(input) {
  const small = input.closest('.note').querySelector('.fecha-visual');
  small.textContent = input.value ? `📅 ${input.value}` : '';
  saveNotes();
}

function editarTarea(span) {
  const original = span.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-control form-control-sm';
  input.value = original;
  span.replaceWith(input);
  input.focus();

  input.addEventListener('blur', () => guardarTextoEditado(input, original));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') input.blur();
  });
}

function guardarTextoEditado(input, original) {
  const nuevo = input.value.trim() || original;
  const span = document.createElement('span');
  span.textContent = nuevo;
  span.className = 'flex-grow-1';
  span.ondblclick = () => editarTarea(span);
  if (input.previousElementSibling?.checked) {
    span.classList.add('text-decoration-line-through', 'text-muted');
  }
  input.replaceWith(span);
  saveNotes();
}

function filtrarPorFecha() {
  const filtro = document.getElementById('filtroFecha').value;
  const cards = document.querySelectorAll('.note');
  cards.forEach(note => {
    const fecha = note.querySelector('.note-date').value;
    note.closest('.col-12').style.display = (!filtro || filtro === fecha) ? '' : 'none';
  });
}

function filtrarPorTexto() {
  const texto = document.getElementById('busquedaTexto').value.toLowerCase();
  const notas = document.querySelectorAll('.note');
  notas.forEach(nota => {
    const titulo = nota.querySelector('.note-title')?.value.toLowerCase() || '';
    nota.closest('.col-12').style.display = titulo.includes(texto) ? '' : 'none';
  });
}
