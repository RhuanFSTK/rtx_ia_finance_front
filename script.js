document.addEventListener("DOMContentLoaded", () => {
	// Elementos DOM
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
	const textoForm = document.getElementById("texto-form");
	const btnEnviarGravacao = document.getElementById("btn-enviar-gravacao");
	const btnCancelarGravacao = document.getElementById("btn-cancelar-gravacao");
	const controlesGravacao = document.getElementById("controles-gravacao");

	let mediaRecorder;
	let audioChunks = [];
	let stream;

	function showLoading() {
		loadingSpinner.classList.remove("d-none");
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
		container.classList.remove(
			"alert-success",
			"alert-danger",
			"alert-warning",
			"alert-info",
			"alert-light"
		);
		container.classList.add("alert", `alert-${tipo}`, "fade", "show");

		if (mensagem.includes("<pre")) {
			container.innerHTML = mensagem;
		} else {
			container.innerHTML = mensagem;
		}
		container.classList.remove("d-none");
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

	function tocarAudioLocal() {
		if (audioChunks.length === 0) return;

		const blob = new Blob(audioChunks, { type: "audio/webm" });
		const audioURL = URL.createObjectURL(blob);

		const audioElement = document.createElement("audio");
		audioElement.controls = true;      // mostra controles de play/pause
		audioElement.src = audioURL;

		// Limpa o container e adiciona o player
		resultadoAudioImagem.innerHTML = "";
		resultadoAudioImagem.appendChild(audioElement);
		resultadoAudioImagem.classList.remove("d-none");
	}

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

				// Aqui chama para mostrar o player e deixar ouvir o áudio antes de enviar
				tocarAudioLocal();
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

	async function tirarFoto() {
		try {
			showLoading();

			const streamVideo = await navigator.mediaDevices.getUserMedia({
				video: true,
			});
			videoElement.srcObject = streamVideo;
			videoElement.play();

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
			} else {
				const errorMsg = formatarErroApi(data);
				mostrarResultado(
					resultadoAudioImagem,
					"danger",
					`<strong>Erro:</strong> <pre style="white-space: pre-wrap;">${errorMsg}</pre>`
				);
			}

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

	async function carregarArquivo() {
		if (!arquivoInput.files.length) {
			mostrarResultado(resultadoAudioImagem, "warning", "Nenhum arquivo selecionado.");
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
		} else {
			const errorMsg = formatarErroApi(data);
			mostrarResultado(
				resultadoAudioImagem,
				"danger",
				`<strong>Erro:</strong> <pre style="white-space: pre-wrap;">${errorMsg}</pre>`
			);
		}
	}

	// ✅ Função corrigida: Exibe corretamente os dados do objeto `data.gpt`
	async function enviarTexto(event) {
		event.preventDefault();

		showLoading();

		const formData = new FormData(textoForm);
		try {
			const response = await fetch("https://rtxapi.up.railway.app/registro/", {
				method: "POST",
				body: formData,
			});
			const data = await response.json();

			hideLoading();

			if (response.ok && data.gpt) {
				const { descricao, classificacao, valor } = data.gpt;

				mostrarResultado(
					resultadoTexto,
					"success",
					`<strong>Registrado com sucesso!</strong><br>
					<strong>Descrição:</strong> ${descricao}<br>
					<strong>Classificação:</strong> ${classificacao}<br>
					<strong>Valor:</strong> R$ ${parseFloat(valor).toFixed(2)}`
				);
			} else {
				const errorMsg = formatarErroApi(data);
				mostrarResultado(
					resultadoTexto,
					"danger",
					`<strong>Erro:</strong> <pre style="white-space: pre-wrap;">${errorMsg}</pre>`
				);
			}
		} catch (err) {
			hideLoading();
			mostrarResultado(
				resultadoTexto,
				"danger",
				`<strong>Erro na requisição:</strong> ${err.message}`
			);
		}
	}

	// Eventos
	gravarBtn.addEventListener("click", toggleGravacao);
	btnEnviarGravacao.addEventListener("click", enviarGravacao);
	btnCancelarGravacao.addEventListener("click", cancelarGravacao);
	capturaFotoBtn.addEventListener("click", tirarFoto);
	carregarBtn.addEventListener("click", carregarArquivo);
	textoForm.addEventListener("submit", enviarTexto);
});
