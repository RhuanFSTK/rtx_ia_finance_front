document.addEventListener("DOMContentLoaded", () => {
	const cardResultado = document.getElementById("cardResultado");
	const resultadoTexto = document.getElementById("resultado-texto");
	const resultadoAudioImagem = document.getElementById(
		"resultado-audio-imagem"
	);
	const loadingSpinner = document.getElementById("loading-spinner");
	const waveformContainer = document.getElementById("waveform-container");
	const videoElement = document.getElementById("video");
	const canvasElement = document.getElementById("canvas");
	const gravarBtn = document.getElementById("gravar-btn");
	const capturaFotoBtn = document.getElementById("captura-foto-btn");
	const carregarBtn = document.getElementById("carregar-btn");
	const arquivoInput = document.getElementById("arquivo-input");
	const textoForm = document.getElementById("texto-form");
	const btnEnviarGravacao = document.getElementById("btn-enviar-gravacao");
	const btnCancelarGravacao = document.getElementById(
		"btn-cancelar-gravacao"
	);
	const controlesGravacao = document.getElementById("controles-gravacao");

	// Eventos dos botões e formulário
	gravarBtn.addEventListener("click", toggleGravacao);
	btnEnviarGravacao.addEventListener("click", enviarGravacao);
	btnCancelarGravacao.addEventListener("click", cancelarGravacao);
	capturaFotoBtn.addEventListener("click", tirarFoto);
	carregarBtn.addEventListener("click", () => arquivoInput.click());
	arquivoInput.addEventListener("change", carregarArquivo);
	textoForm.addEventListener("submit", enviarTexto);

	let mediaRecorder;
	let audioChunks = [];
	let stream;

	function showLoading() {
		loadingSpinner.classList.remove("d-none");
		cardResultado.classList.remove("d-none");
		cardResultado.classList.add("show");
		cardResultado.classList.remove("collapse");
	}

	function hideLoading() {
		loadingSpinner.classList.add("d-none");
	}

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

	function mostrarResultado(container, tipo, mensagem) {
		container.className = "";
		container.classList.add("alert", `alert-${tipo}`, "fade", "show");
		container.innerHTML = mensagem;
		container.classList.remove("d-none");
		cardResultado.classList.add("show");
		cardResultado.classList.remove("collapse");
	}

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

	// Função corrigida e ajustada para envio de texto para API
	async function enviarTexto(event) {
		event.preventDefault();

		showLoading();

		const descricao = document.getElementById("descricao").value;
		const formData = new FormData();
		formData.append("descricao", descricao);
		console.log("FormData:", Object.fromEntries(formData.entries()));

		const { ok, data } = await enviarArquivoParaAPI(
			"https://rtxapi.up.railway.app/registro/",
			formData
		);
		console.log("RESPONSE:", data);


		if (ok && data.Agente) {
			hideLoading();		
			// // Mostrar Toast de sucesso
			// Preenche o corpo do toast com o seu conteúdo bonito
			document.getElementById('toastBody').innerHTML = `
				<div class="card border-success shadow-sm">
					<div class="card-header bg-success text-white">
					<i class="bi bi-clipboard-check-fill me-2"></i>Gasto Classificado com Sucesso
					</div>
					<div class="card-body">
					<p class="mb-2"><strong><i class="bi bi-pencil me-1"></i>Descrição:</strong> ${data.Agente.descricao}</p>
					<p class="mb-2"><strong><i class="bi bi-tags me-1"></i>Classificação:</strong> ${data.Agente.classificacao}</p>
					<p class="mb-0"><strong><i class="bi bi-cash-coin me-1"></i>Valor:</strong> R$ ${parseFloat(data.Agente.valor).toFixed(2)}</p>
					</div>
				</div>
				`;

			// Mostra o toast
			const toastEl = document.getElementById("toastBody");
			const toast = new bootstrap.Toast(toastEl);
			toast.show();

		} else {
			hideLoading();
			// Preenche o corpo do toast com o seu conteúdo bonito
			document.getElementById('toastBody').innerHTML = `
				<div class="card border-danger shadow-sm">
					<div class="card-header bg-danger text-white">
					<i class="bi bi-exclamation-triangle-fill me-2"></i>Erro ao Processar
					</div>
					<div class="card-body">
					<p class="mb-0">${data.detail || 'Ocorreu um erro inesperado. Tente novamente mais tarde.'}</p>
					</div>
				</div>
				`;

			// Mostra o toast
			const toastEl = document.getElementById("toastBody");
			const toast = new bootstrap.Toast(toastEl);
			toast.show();

		}
	}

	// Inicia ou para gravação de áudio
	async function toggleGravacao() {
		if (mediaRecorder && mediaRecorder.state === "recording") {
			mediaRecorder.stop();
			gravarBtn.textContent = "🎙 Gravar Áudio";
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
				if (stream) stream.getTracks().forEach((track) => track.stop());
			};

			mediaRecorder.start();
			gravarBtn.textContent = "⏹ Parar Gravação";
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

	// Envia gravação de áudio para API
	async function enviarGravacao() {
		if (audioChunks.length === 0) {
			mostrarResultado(
				resultadoAudioImagem,
				"warning",
				"Nenhuma gravação para enviar."
			);
			return;
		}
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
		gravarBtn.textContent = "🎙 Gravar Áudio";
	}

	// Cancela gravação e limpa estados
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
		gravarBtn.textContent = "🎙 Gravar Áudio";
		gravarBtn.disabled = false;
	}

	// Captura foto da webcam, envia para API e mostra resultado
	async function tirarFoto() {
		try {
			showLoading();

			const streamVideo = await navigator.mediaDevices.getUserMedia({
				video: true,
			});
			videoElement.srcObject = null;
			videoElement.srcObject = streamVideo;
			videoElement.play();

			await new Promise((resolve) => setTimeout(resolve, 1000));

			const context = canvasElement.getContext("2d");
			canvasElement.width = videoElement.videoWidth || 320;
			canvasElement.height = videoElement.videoHeight || 240;

			videoElement.classList.remove("d-none");
			canvasElement.classList.remove("d-none");

			context.drawImage(
				videoElement,
				0,
				0,
				canvasElement.width,
				canvasElement.height
			);

			const blob = await new Promise((resolve) =>
				canvasElement.toBlob(resolve, "image/jpeg")
			);

			const formData = new FormData();
			formData.append("file", blob, "foto.jpg");

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
			} else {
				const errorMsg = formatarErroApi(data);
				mostrarResultado(
					resultadoAudioImagem,
					"danger",
					`<strong>Erro:</strong> <pre style="white-space: pre-wrap;">${errorMsg}</pre>`
				);
			}

			streamVideo.getTracks().forEach((track) => track.stop());
			videoElement.classList.add("d-none");
			canvasElement.classList.add("d-none");
		} catch (err) {
			mostrarResultado(
				resultadoAudioImagem,
				"danger",
				`<strong>Erro ao capturar foto:</strong> ${err.message}`
			);
		} finally {
			hideLoading();
		}
	}

	// Carrega arquivo local, envia para API e mostra resultado
	async function carregarArquivo() {
		if (arquivoInput.files.length === 0) {
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

		if (ok) {
			mostrarResultado(
				resultadoAudioImagem,
				"success",
				`<strong>Resultado da Análise:</strong> ${data.resultado}`
			);
		} else {
			const errorMsg = formatarErroApi(data);
			mostrarResultado(
				resultadoAudioImagem,
				"danger",
				`<strong>Erro:</strong> <pre style="white-space: pre-wrap;">${errorMsg}</pre>`
			);
		}

		arquivoInput.value = "";
		hideLoading();
	}
});
