document.addEventListener('DOMContentLoaded', () => {
  const textoForm = document.getElementById('texto-form');
  const resultadoTexto = document.getElementById('resultado-texto');
  const resultadoAudioImagem = document.getElementById('resultado-audio-imagem');

  const gravarBtn = document.getElementById('gravar-btn');
  const carregarBtn = document.getElementById('carregar-btn');
  const audioInput = document.getElementById('audio');
  const imagemInput = document.getElementById('imagem');

  const capturaFotoBtn = document.getElementById('captura-foto-btn');
  const videoElement = document.getElementById('video');
  const canvasElement = document.getElementById('canvas');

  let mediaRecorder;
  let audioChunks = [];

  async function enviarArquivoParaAPI(endpoint, formData) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (error) {
      return { ok: false, data: { detail: error.message } };
    }
  }

  textoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const descricao = document.getElementById('descricao').value;
    const formData = new FormData();
    formData.append('descricao', descricao);

    const { ok, data } = await enviarArquivoParaAPI('https://rtxfinance.up.railway.app/registro/', formData);

    if (ok) {
      resultadoTexto.innerHTML = `
        <p><strong>Descrição:</strong> ${data.descricao}</p>
        <p><strong>Classificação:</strong> ${data.classificacao}</p>
      `;
    } else {
      resultadoTexto.innerHTML = `<p style="color:red;">Erro: ${data.detail || 'Erro desconhecido'}</p>`;
    }
  });

  gravarBtn.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);

      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('file', audioBlob); // Corrigido para 'file'

        const { ok, data } = await enviarArquivoParaAPI('https://rtxfinance.up.railway.app/audio/', formData);

        if (ok) {
          resultadoAudioImagem.innerHTML = `<p><strong>Transcrição:</strong> ${data.texto}</p>`;
        } else {
          resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro: ${data.detail}</p>`;
        }
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 5000);
    } catch (err) {
      resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro ao acessar microfone: ${err.message}</p>`;
    }
  });

  carregarBtn.addEventListener('click', () => {
    const audioVisible = audioInput.style.display !== "none";
    audioInput.style.display = audioVisible ? "none" : "block";
    imagemInput.style.display = audioVisible ? "block" : "none";
  });

  audioInput.addEventListener('change', async () => {
    const file = audioInput.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file); // Corrigido para 'file'

      const { ok, data } = await enviarArquivoParaAPI('https://rtxfinance.up.railway.app/audio/', formData);
      if (ok) {
        resultadoAudioImagem.innerHTML = `<p><strong>Transcrição:</strong> ${data.texto}</p>`;
      } else {
        resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro: ${data.detail}</p>`;
      }
    }
  });

  imagemInput.addEventListener('change', async () => {
    const file = imagemInput.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file); // Corrigido para 'file'

      const { ok, data } = await enviarArquivoParaAPI('https://rtxfinance.up.railway.app/imagem/', formData);
      if (ok) {
        resultadoAudioImagem.innerHTML = `<p><strong>Resultado da Análise:</strong> ${data.resultado}</p>`;
      } else {
        resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro: ${data.detail}</p>`;
      }
    }
  });

  capturaFotoBtn.addEventListener('click', async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoElement.srcObject = stream;
      videoElement.style.display = 'block';

      setTimeout(async () => {
        const context = canvasElement.getContext('2d');
        context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        const base64Image = canvasElement.toDataURL('image/jpeg').split(',')[1];

        const blob = await (await fetch(`data:image/jpeg;base64,${base64Image}`)).blob();
        const formData = new FormData();
        formData.append('file', blob); // Corrigido para 'file'

        const { ok, data } = await enviarArquivoParaAPI('https://rtxfinance.up.railway.app/imagem/', formData);

        if (ok) {
          resultadoAudioImagem.innerHTML = `<p><strong>Resultado da Análise:</strong> ${data.resultado}</p>`;
        } else {
          resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro: ${data.detail}</p>`;
        }

        stream.getTracks().forEach(track => track.stop());
        videoElement.style.display = 'none';
      }, 1000);
    } else {
      alert('A câmera não é suportada neste dispositivo.');
    }
  });
});
