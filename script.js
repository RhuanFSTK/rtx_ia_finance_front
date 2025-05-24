// script.js

// Seleção de elementos do DOM
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const resultadoAudioImagem = document.getElementById('resultado-audio-imagem');
const cardResultado = document.getElementById('cardResultado');

let stream = null; // Guarda o stream da câmera

/**
 * Inicia a câmera e exibe o stream no elemento video
 */
async function iniciarCamera() {
  try {
    const constraints = {
      audio: false,
      video: {
        facingMode: 'environment', // 'user' para câmera frontal
        width: { ideal: 640 },
        height: { ideal: 480 },
      }
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    video.classList.remove('d-none');
    canvas.classList.add('d-none');
    resultadoAudioImagem.innerHTML = '';
    cardResultado.classList.remove('collapse');
    await video.play();
  } catch (err) {
    console.error('Erro ao acessar a câmera:', err);
    resultadoAudioImagem.innerHTML = `<div class="alert alert-danger">❌ Erro ao acessar a câmera: ${err.message || err}</div>`;
  }
}

/**
 * Para a câmera e limpa o stream
 */
function pararCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
}

/**
 * Captura a foto do vídeo para o canvas e mostra a imagem capturada
 */
function capturarFoto() {
  if (!stream) {
    resultadoAudioImagem.innerHTML = '<div class="alert alert-warning">❌ Câmera não iniciada</div>';
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Esconde o vídeo e mostra o canvas com a foto
  video.classList.add('d-none');
  canvas.classList.remove('d-none');

  pararCamera();
}

/**
 * Reseta o estado da captura, ocultando vídeo/canvas e parando câmera
 */
function resetarCaptura() {
  canvas.classList.add('d-none');
  video.classList.add('d-none');
  resultadoAudioImagem.innerHTML = '';
  cardResultado.classList.add('collapse');
  pararCamera();
  removerControlesCaptura();
}

/**
 * Exibe controles para tirar foto e cancelar a captura
 */
function mostrarControlesCaptura() {
  // Remove controles antigos se existirem
  const controlesAntigos = document.getElementById('controles-captura');
  if (controlesAntigos) controlesAntigos.remove();

  const divControles = document.createElement('div');
  divControles.id = 'controles-captura';
  divControles.className = 'mt-3 text-center';

  // Botão para tirar foto
  const btnTirarFoto = document.createElement('button');
  btnTirarFoto.className = 'btn btn-primary me-2';
  btnTirarFoto.textContent = '📸 Tirar Foto';
  btnTirarFoto.onclick = capturarFoto;

  // Botão para cancelar
  const btnCancelar = document.createElement('button');
  btnCancelar.className = 'btn btn-danger';
  btnCancelar.textContent = '❌ Cancelar';
  btnCancelar.onclick = resetarCaptura;

  divControles.appendChild(btnTirarFoto);
  divControles.appendChild(btnCancelar);

  cardResultado.querySelector('.card-body').appendChild(divControles);
}

/**
 * Remove controles de captura da interface
 */
function removerControlesCaptura() {
  const controles = document.getElementById('controles-captura');
  if (controles) controles.remove();
}

// Evento para abrir a câmera quando clicar no botão "Capturar Foto"
document.getElementById('captura-foto-btn').addEventListener('click', async () => {
  await iniciarCamera();
  mostrarControlesCaptura();
});


// ==================
// Formulário de descrição de gasto
// ==================

document.getElementById('texto-form').addEventListener('submit', e => {
  e.preventDefault();
  const descricao = document.getElementById('descricao').value.trim();
  if (!descricao) return;
  const resultadoTexto = document.getElementById('resultado-texto');
  resultadoTexto.textContent = `Despesa adicionada: ${descricao}`;
  resultadoTexto.classList.remove('d-none');
  e.target.reset();
});

// Formulário de consulta de gastos por período
document.getElementById('consulta-form').addEventListener('submit', e => {
  e.preventDefault();
  const inicio = document.getElementById('data-inicio').value;
  const fim = document.getElementById('data-fim').value;
  const resultadoConsulta = document.getElementById('resultado-consulta');

  if (inicio > fim) {
    resultadoConsulta.innerHTML = `<div class="alert alert-warning">Data início deve ser antes da data fim.</div>`;
    return;
  }

  // Simulação de consulta
  resultadoConsulta.innerHTML = `<div class="alert alert-info">Consulta de gastos de <strong>${inicio}</strong> até <strong>${fim}</strong> realizada (simulado).</div>`;
});
