document.addEventListener("DOMContentLoaded", () => {
  // --- Elementos DOM principais ---
  const cardResultado = document.getElementById("cardResultado");
  const resultadoTexto = document.getElementById("resultado-texto");
  const resultadoAudioImagem = document.getElementById("resultado-audio-imagem");
  const loadingSpinner = document.getElementById("loading-spinner");
  const waveformContainer = document.getElementById("waveform-container");
  const videoElement = document.getElementById("video");
	const canvasElement = document.getElementById("canvas");

  const gravarBtn = document.getElementById("gravar-btn");
  const capturaFotoBtn = document.getElementById("captura-foto-btn");
  const carregarBtn = document.getElementById("carregar-btn");
  const arquivoInput = document.getElementById("arquivo-input");
  const consultaForm = document.getElementById("consulta-form");
  const resultadoConsulta = document.getElementById("resultado-consulta");
  const btnEnviarGravacao = document.getElementById("btn-enviar-gravacao");
  const btnCancelarGravacao = document.getElementById("btn-cancelar-gravacao");
  const controlesGravacao = document.getElementById("controles-gravacao");

  // --- Variáveis para gravação ---
  let mediaRecorder;
  let audioChunks = [];
  let stream;

  // --- Funções utilitárias ---

  /**
   * Exibe o spinner de carregamento.
   */
  function showLoading() {
    loadingSpinner.classList.remove("d-none");
    cardResultado.classList.add("show");
    cardResultado.classList.remove("collapse");
  }

  /**
   * Oculta o spinner de carregamento.
   */
  function hideLoading() {
    loadingSpinner.classList.add("d-none");
  }

  /**
   * Formata objetos de erro retornados pela API para texto legível.
   * @param {any} data Objeto de resposta da API
   * @returns {string} Texto formatado do erro
   */
  function formatarErroApi(data) {
    if (!data) return "Erro desconhecido";

    if (typeof data === "string") return data;

    if (data.detail) {
      if (typeof data.detail === "object") {
        try {
          return JSON.stringify(data.detail, null, 2);
        } catch {
          return "[Erro ao converter objeto]";
        }
      }
      return data.detail;
    }

    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return "Erro desconhecido ao converter objeto";
    }
  }

  /**
   * Mostra uma mensagem de resultado em um container especificado,
   * aplicando a classe Bootstrap correspondente ao tipo.
   * @param {HTMLElement} container Elemento HTML onde mostrar a mensagem
   * @param {string} tipo Tipo do alerta Bootstrap (success, danger, info, warning)
   * @param {string} mensagem HTML da mensagem para exibir
   */
  function mostrarResultado(container, tipo, mensagem) {
    container.classList.remove(
      "alert-success",
      "alert-danger",
      "alert-warning",
      "alert-info",
      "alert-light"
    );
    container.classList.add("alert", `alert-${tipo}`, "fade", "show");

    // Se mensagem contém <pre>, interpreta como HTML para manter formatação JSON
    if (mensagem.includes("<pre")) {
      container.innerHTML = mensagem;
    } else {
      container.textContent = mensagem;
    }
    container.classList.remove("d-none");
  }

  /**
   * Envia arquivo para a API usando fetch POST e retorna objeto {ok, data}.
   * @param {string} endpoint URL da API
   * @param {FormData} formData Dados do formulário com arquivo
   * @returns {Promise<{ok: boolean, data: any}>}
   */
  async function enviarArquivoParaAPI(endpoint, formData) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (error) {
      return { ok: false, data: { detail: error.message } };
    }
  }

  // --- Funções principais ---

  /**
   * Alterna gravação de áudio: inicia ou para, atualizando UI.
   */
  async function toggleGravacao() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      gravarBtn.textContent = "🎙 Áudio";
      gravarBtn.disabled = false;
      btnEnviarGravacao.disabled = false;
      btnCancelarGravacao.disabled = false;
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      resultadoAudioImagem.classList.add("d-none");
      cardResultado.classList.add("show");
      cardResultado.classList.remove("collapse");

      waveformContainer.classList.remove("collapse");
      waveformContainer.classList.add("show");

      if (window.waveSurfer) window.waveSurfer.destroy();
      window.waveSurfer = WaveSurfer.create({
        container: "#waveform",
        waveColor: "#4F46E5",
        progressColor: "#6366F1",
        height: 100,
      });

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
        const blob = new Blob(audioChunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        window.waveSurfer.load(url);
      };

      mediaRecorder.onstop = () => {
        btnEnviarGravacao.disabled = false;
        btnCancelarGravacao.disabled = false;
        gravarBtn.disabled = false;
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start();
      gravarBtn.textContent = "⏹ Parar";
      gravarBtn.disabled = false;

      controlesGravacao.classList.remove("d-none");
      btnEnviarGravacao.disabled = true;
      btnCancelarGravacao.disabled = true;
    } catch (err) {
      mostrarResultado(
        resultadoAudioImagem,
        "danger",
        `<strong>Erro ao acessar microfone:</strong> ${err.message}`
      );
    }
  }

  /**
   * Envia áudio gravado para a API de transcrição.
   */
  async function enviarGravacao() {
    showLoading();

    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("file", audioBlob);

    const { ok, data } = await enviarArquivoParaAPI(
      "https://rtxapi.up.railway.app/audio/",
      formData
    );

    hideLoading();

    if (ok) {
      mostrarResultado(
        resultadoAudioImagem,
        "success",
        `<strong>Transcrição:</strong> ${data.transcricao}`
      );
    } else {
      const errorMsg = formatarErroApi(data);
      mostrarResultado(
        resultadoAudioImagem,
        "danger",
        `<strong>Erro:</strong> <pre style="white-space: pre-wrap;">${errorMsg}</pre>`
      );
    }

    audioChunks = [];
    controlesGravacao.classList.add("d-none");
    waveformContainer.classList.add("collapse");
    waveformContainer.classList.remove("show");
  }

  /**
   * Cancela gravação atual, limpando estado e UI.
   */
  function cancelarGravacao() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    audioChunks = [];
    controlesGravacao.classList.add("d-none");
    waveformContainer.classList.add("collapse");
    waveformContainer.classList.remove("show");
    resultadoAudioImagem.classList.add("d-none");
    gravarBtn.textContent = "🎙 Áudio";
    gravarBtn.disabled = false;
  }

  /**
   * Captura uma foto usando câmera, envia para API e exibe resultado.
   */
  async function tirarFoto() {
    try {
      showLoading();

      const streamVideo = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      videoElement.srcObject = streamVideo;
      videoElement.play();

      // Espera 1s para estabilizar imagem
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const context = canvasElement.getContext("2d");
      canvasElement.width = videoElement.videoWidth || 320;
      canvasElement.height = videoElement.videoHeight || 240;

      context.drawImage(
        videoElement,
        0,
        0,
        canvasElement.width,
        canvasElement.height
      );

      const base64Image = canvasElement.toDataURL("image/jpeg").split(",")[1];
      const blob = await (await fetch(`data:image/jpeg;base64,${base64Image}`)).blob();

      const formData = new FormData();
      formData.append("file", blob);

      const { ok, data } = await enviarArquivoParaAPI(
        "https://rtxapi.up.railway.app/imagem/",
        formData
      );

      if (ok) {
        mostrarResultado(
          resultadoAudioImagem,
          "success",
          `<strong>Resultado da Análise:</strong> ${data.resultado}`
        );
        resultadoAudioImagem.classList.remove("d-none");
      } else {
        const errorMsg = formatarErroApi(data);
        mostrarResultado(
          resultadoAudioImagem,
          "danger",
          `<strong>Erro:</strong> <pre style="white-space: pre-wrap;">${errorMsg}</pre>`
        );
      }

      // Para vídeo após captura
      streamVideo.getTracks().forEach((track) => track.stop());
      hideLoading();
    } catch (err) {
      hideLoading();
      mostrarResultado(
        resultadoAudioImagem,
        "danger",
        `<strong>Erro ao capturar foto:</strong> ${err.message}`
      );
    }
  }

  /**
   * Envia arquivo selecionado pelo input para API e exibe resultado.
   */
  async function carregarArquivo() {
    if (!arquivoInput.files.length) {
      mostrarResultado(
        resultadoAudioImagem,
        "warning",
        "Nenhum arquivo selecionado."
      );
      return;
    }

    showLoading();

    const file = arquivoInput.files[0];
    const formData = new FormData();
    formData.append("file", file);

    const { ok, data } = await enviarArquivoParaAPI(
      "https://rtxapi.up.railway.app/imagem/",
      formData
    );

    hideLoading();

    if (ok) {
      mostrarResultado(
        resultadoAudioImagem,
        "success",
        `<strong>Resultado da Análise:</strong> ${data.resultado}`
      );
      resultadoAudioImagem.classList.remove("d-none");
    } else {
      const errorMsg = formatarErroApi(data);
      mostrarResultado(
        resultadoAudioImagem,
        "danger",
        `<strong>Erro:</strong> <pre style="white-space: pre-wrap;">${errorMsg}</pre>`
      );
    }
  }

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

  // --- Eventos ---

  gravarBtn.addEventListener("click", toggleGravacao);
  btnEnviarGravacao.addEventListener("click", enviarGravacao);
  btnCancelarGravacao.addEventListener("click", cancelarGravacao);
  capturaFotoBtn.addEventListener("click", tirarFoto);
  carregarBtn.addEventListener("click", carregarArquivo);
  textoForm.addEventListener("submit", enviarTexto);
});
