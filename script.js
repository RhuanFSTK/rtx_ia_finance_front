document.addEventListener('DOMContentLoaded', () => {
    // Enviar texto para o backend
    const textoForm = document.getElementById('texto-form');
    const resultadoTexto = document.getElementById('resultado-texto');

    textoForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const descricao = document.getElementById('descricao').value;

      const formData = new FormData();
      formData.append('descricao', descricao);

      try {
        const response = await fetch('https://rtxfinance.up.railway.app/registro/', {
          method: 'POST',
          body: formData,
        });
        console.log(response); // Verifique a resposta do servidor
        const data = await response.json();
        console.log(data); // Verifique os dados que estão sendo retornados
        if (response.ok) {
          resultadoTexto.innerHTML = `
            <p><strong>Descrição:</strong> ${data.descricao}</p>
            <p><strong>Classificação:</strong> ${data.classificacao}</p>
          `;
        } else {
          resultadoTexto.innerHTML = `<p style="color:red;">Erro: ${data.detail || 'Erro desconhecido'}</p>`;
        }
      } catch (error) {
        resultadoTexto.innerHTML = `<p style="color:red;">Erro de conexão: ${error.message}</p>`;
      }
    });

    // Gravar Áudio
    const gravarBtn = document.getElementById('gravar-btn');
    const resultadoAudioImagem = document.getElementById('resultado-audio-imagem');

    gravarBtn.addEventListener('click', () => {
      const mediaRecorder = new MediaRecorder(window.stream);
      let audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', audioBlob);

        try {
          const response = await fetch('https://rtxfinance.up.railway.app/audio/', {
            method: 'POST',
            body: formData,
          });
          console.log(response); // Verifique a resposta do servidor
          const data = await response.json();
          console.log(data); // Verifique os dados que estão sendo retornados
          if (response.ok) {
            resultadoAudioImagem.innerHTML = `<p><strong>Transcrição:</strong> ${data.transcricao}</p>`;
          } else {
            resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro: ${data.detail || 'Erro desconhecido'}</p>`;
          }
        } catch (error) {
          resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro de conexão: ${error.message}</p>`;
        }
      };

      mediaRecorder.start();

      setTimeout(() => {
        mediaRecorder.stop();
      }, 5000); // Grava por 5 segundos
    });

    // Carregar Arquivo (Imagem ou Áudio)
    const carregarBtn = document.getElementById('carregar-btn');
    const audioInput = document.getElementById('audio');
    const imagemInput = document.getElementById('imagem');

    carregarBtn.addEventListener('click', () => {
      // Alternar entre exibir o input de áudio e imagem
      if (audioInput.style.display === "none") {
        audioInput.style.display = "block";
        imagemInput.style.display = "none";
      } else if (imagemInput.style.display === "none") {
        imagemInput.style.display = "block";
        audioInput.style.display = "none";
      }
    });

    // Enviar Arquivo (Imagem ou Áudio)
    audioInput.addEventListener('change', async () => {
      const file = audioInput.files[0];
      if (file) {
        const formData = new FormData();
        formData.append('audio', file);

        try {
          const response = await fetch('https://rtxfinance.up.railway.app/audio/', {
            method: 'POST',
            body: formData,
          }); 
          console.log(response); // Verifique a resposta do servidor
          const data = await response.json();
          console.log(data); // Verifique os dados que estão sendo retornados
          if (response.ok) {
            resultadoAudioImagem.innerHTML = `<p><strong>Transcrição:</strong> ${data.transcricao}</p>`;
          } else {
            resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro: ${data.detail || 'Erro desconhecido'}</p>`;
          }
        } catch (error) {
          resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro de conexão: ${error.message}</p>`;
        }
      } 
    });

    imagemInput.addEventListener('change', async () => {
      const file = imagemInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Image = reader.result.split(',')[1];

          const formData = new FormData();
          formData.append('imagem', base64Image);

          try {
            const response = await fetch('https://rtxfinance.up.railway.app/imagem/', {
              method: 'POST',
              body: formData,
            });
            console.log(response); // Verifique a resposta do servidor
            const data = await response.json();
            console.log(data); // Verifique os dados que estão sendo retornados
            if (response.ok) {
              resultadoAudioImagem.innerHTML = `<p><strong>Resultado da Análise:</strong> ${data.analise}</p>`;
            } else {
              resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro: ${data.detail || 'Erro desconhecido'}</p>`;
            }
          } catch (error) {
            resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro de conexão: ${error.message}</p>`;
          }
        };

        reader.readAsDataURL(file);
      }
    });

    // Capturar Foto com a Câmera
    const capturaFotoBtn = document.getElementById('captura-foto-btn');
    const videoElement = document.getElementById('video');
    const canvasElement = document.getElementById('canvas');

    capturaFotoBtn.addEventListener('click', async () => {
      // Ativar a câmera
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoElement.srcObject = stream;
        videoElement.style.display = 'block';

        // Captura quando a câmera está ativa
        setTimeout(() => {
          const context = canvasElement.getContext('2d');
          context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
          const base64Image = canvasElement.toDataURL('image/jpeg').split(',')[1];

          // Enviar a imagem capturada
          const formData = new FormData();
          formData.append('imagem', base64Image);

          fetch('https://rtxfinance.up.railway.app/imagem/', {
            method: 'POST',
            body: formData,
          })
          .then(response => response.json())
          .then(data => {
            if (data.analise) {
              resultadoAudioImagem.innerHTML = `<p><strong>Resultado da Análise:</strong> ${data.analise}</p>`;
            } else {
              resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro: ${data.detail || 'Erro desconhecido'}</p>`;
            }
          })
          .catch(error => {
            resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro: ${error.message}</p>`;
          });

          // Desligar a câmera
          stream.getTracks().forEach(track => track.stop());
        }, 1000); // Aguardar um tempo para a câmera estabilizar
      } else {
        alert('A câmera não é suportada neste dispositivo.');
      }
    });
  });