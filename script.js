document.addEventListener("DOMContentLoaded", () => {
	// ===== VARIÁVEIS DE CONTROLE DA GRAVAÇÃO DE ÁUDIO =====
	let mediaRecorder;
	let audioChunks = [];
	let stream;

	// ===== REFERÊNCIAS AOS ELEMENTOS DOM (HTML) =====
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

	// ===== EVENTOS (LISTENERS) =====
	gravarBtn.addEventListener("click", toggleGravacao);
	btnEnviarGravacao.addEventListener("click", enviarGravacao);
	btnCancelarGravacao.addEventListener("click", cancelarGravacao);
	capturaFotoBtn.addEventListener("click", tirarFoto);
	carregarBtn.addEventListener("click", () => arquivoInput.click());
	arquivoInput.addEventListener("change", carregarArquivo);
	textoForm.addEventListener("submit", enviarTexto);

	// Mostra o spinner de carregamento e exibe o card de resultado
	function showLoading() {
		loadingSpinner.classList.remove("d-none");
		cardResultado.classList.remove("d-none");
		cardResultado.classList.add("show");
		cardResultado.classList.remove("collapse");
	}

	// Oculta o spinner de carregamento
	function hideLoading() {
		loadingSpinner.classList.add("d-none");
	}

	// Formata a mensagem de erro da API para exibição no frontend
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

	// Exibe mensagens estilizadas (alertas de sucesso, erro etc.) no container indicado
	function mostrarResultado(container, tipo, mensagem) {
		container.className = "";
		container.classList.add("alert", `alert-${tipo}`, "fade", "show");
		container.innerHTML = mensagem;
		container.classList.remove("d-none");
		cardResultado.classList.add("show");
		cardResultado.classList.remove("collapse");
	}

	// Função genérica para enviar qualquer FormData para um endpoint da API
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

	// Envia texto digitado pelo usuário para a API e trata o retorno com UI moderna (toast)
	async function enviarTexto(event) {
		event.preventDefault(); // Impede reload da página no envio do formulário
		showLoading(); // Exibe spinner

		btnEnviar = document.getElementById("btnEnviaForm");
		btnEnviar.disabled = true; // 👈 Desativa o botão

		const descricao = document.getElementById("descricao").value;
		const formData = new FormData();
		formData.append("descricao", descricao);

		const { ok, data } = await enviarArquivoParaAPI(
			"https://rtxapi.up.railway.app/registro/",
			formData
		);

		hideLoading();
		cardResultado.classList.add("d-none");
		document.getElementById("descricao").value = "";

		if (ok && data.response) {
			showToast({
				type: "success",
				title: "Gasto Classificado com Sucesso",
				message: `
					<p><strong>Descrição:</strong> ${data.response.descricao}</p>
					<p><strong>Classificação:</strong> ${data.response.classificacao}</p>
					<p><strong>Valor:</strong> R$ ${parseFloat(data.response.valor).toFixed(2)}</p>
				`,
			});

			btnEnviar.disabled = false; // ✅ Reativa o botão
		} else {
			showToast({
				type: "error",
				title: "Erro",
				message: `
					<p>${data.detail || "Erro inesperado. Tente novamente."}</p>
				`,
			});
			btnEnviar.disabled = false; // ✅ Reativa o botão
		}
	}

	// Inicia ou encerra a gravação de áudio com visualização via WaveSurfer
	async function toggleGravacao() {
		console.log("Iniciando gravação");

		if (mediaRecorder && mediaRecorder.state === "recording") {
			mediaRecorder.stop();
			gravarBtn.textContent = "🎙 Gravar Áudio";
			gravarBtn.disabled = false;
			btnEnviarGravacao.disabled = false;
			btnCancelarGravacao.disabled = false;
			return;
		}

		if (typeof MediaRecorder === "undefined") {
			mostrarResultado(
				resultadoAudioImagem,
				"danger",
				"<strong>Erro:</strong> Este navegador não suporta gravação de áudio."
			);
			return;
		}

		try {
			// Permissão do microfone ON
			stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaRecorder = new MediaRecorder(stream);
			audioChunks = [];

			// UI ativada
			resultadoAudioImagem.classList.add("d-none");
			cardResultado.classList.add("show");
			cardResultado.classList.remove("collapse");

			waveformContainer.classList.remove("collapse");
			waveformContainer.classList.add("show");

			// Destrói waveSurfer antigo se existir (limpeza total)
			if (window.waveSurfer) window.waveSurfer.destroy();

			if (!WaveSurfer.microphone || !WaveSurfer.microphone.create) {
				mostrarResultado(
					resultadoAudioImagem,
					"danger",
					"<strong>Erro:</strong> Plugin de microfone do WaveSurfer não está carregado corretamente."
				);
				return;
			}

			// Cria nova instância com plugin Microfone devidamente carregado
			window.waveSurfer = WaveSurfer.create({
				container: "#waveform",
				waveColor: "#4F46E5",
				progressColor: "#6366F1",
				height: 100,
				plugins: [WaveSurfer.microphone.create()],
			});

			// Start microfone (visualização do áudio rolando)
			window.waveSurfer.microphone.start();

			// Captura dados da gravação em tempo real
			mediaRecorder.ondataavailable = (event) => {
				audioChunks.push(event.data);
			};

			mediaRecorder.onstop = () => {
				const blob = new Blob(audioChunks, { type: "audio/webm" });
				const url = URL.createObjectURL(blob);
				window.waveSurfer.load(url);

				btnEnviarGravacao.disabled = false;
				btnCancelarGravacao.disabled = false;
				gravarBtn.disabled = false;

				// Para todos os tracks de áudio
				if (stream) stream.getTracks().forEach((track) => track.stop());

				// Para o microfone do WaveSurfer
				if (window.waveSurfer && window.waveSurfer.microphone) {
					window.waveSurfer.microphone.stop();
				}
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

		console.log({
			cardResultado: cardResultado.classList.toString(),
			waveformContainer: waveformContainer.classList.toString(),
			controlesGravacao: controlesGravacao.classList.toString(),
		});
	}

	// Envia o áudio gravado para transcrição via API
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
			showToast({
				type: "success",
				title: "Gasto Classificado com Sucesso",
				message: `
					<p><strong>Descrição:</strong> ${data.response.descricao}</p>
					<p><strong>Classificação:</strong> ${data.response.classificacao}</p>
					<p><strong>Valor:</strong> R$ ${parseFloat(data.response.valor).toFixed(2)}</p>
				`,
			});
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
		gravarBtn.textContent = "🎙 Gravar Áudio";
	}

	// Cancela a gravação atual e limpa a UI relacionada
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
		resultadoAudioImagem.classList.add("d-none");
		gravarBtn.textContent = "🎙 Gravar Áudio";
		gravarBtn.disabled = false;
	}

	// Captura imagem da webcam e envia para análise da API
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

	// Permite selecionar um arquivo do computador e envia a imagem para análise
	async function carregarArquivo() {
		if (arquivoInput.files.length === 0) return;

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

		arquivoInput.value = ""; // Limpa o input para permitir novo upload
		hideLoading();
	}

	function showToast({
		type = "success",
		title = "",
		message = "",
		delay = 5000,
	}) {
		const toastEl = document.getElementById("liveToast");
		const toastCard = document.getElementById("toastCard");
		const toastHeader = document.getElementById("toastHeader");
		const toastIcon = document.getElementById("toastIcon");
		const toastTitle = document.getElementById("toastTitle");
		const toastBody = document.getElementById("toastBody");

		// Limpa classes antigas
		toastHeader.classList.remove(
			"bg-success",
			"bg-danger",
			"bg-warning",
			"bg-info",
			"bg-primary"
		);
		toastIcon.classList.remove(
			"bi-check-circle-fill",
			"bi-x-circle-fill",
			"bi-exclamation-triangle-fill",
			"bi-info-circle-fill",
			"bi-bell-fill"
		);
		toastBody.className = "card-body bg-light text-dark";

		// Define ícone, cor do header e título conforme o tipo
		switch (type) {
			case "success":
				toastHeader.classList.add("bg-success");
				toastIcon.classList.add("bi-check-circle-fill");
				break;
			case "error":
				toastHeader.classList.add("bg-danger");
				toastIcon.classList.add("bi-x-circle-fill");
				break;
			case "warning":
				toastHeader.classList.add("bg-warning");
				toastIcon.classList.add("bi-exclamation-triangle-fill");
				break;
			case "info":
				toastHeader.classList.add("bg-info");
				toastIcon.classList.add("bi-info-circle-fill");
				break;
			default:
				toastHeader.classList.add("bg-primary");
				toastIcon.classList.add("bi-bell-fill");
		}

		// Define texto do título e corpo da mensagem
		toastTitle.textContent = title;
		toastBody.innerHTML = message;

		// // Sons por tipo de toast
		// const sounds = {
		// 	success: 'success.mp3',
		// 	error: 'error.mp3',
		// 	warning: 'warning.mp3',
		// 	info: 'info.mp3',
		// 	default: 'notification.mp3',
		// };

		// const soundFile = `./sounds/${sounds[type] || sounds.default}`;
		// const audio = new Audio(soundFile);

		// // Garante que o navegador pode tocar o som
		// audio.addEventListener('canplaythrough', () => {
		// 	audio.play().catch((err) => {
		// 		console.warn("Erro ao tocar som:", err.message);
		// 	});
		// });

		// audio.addEventListener('error', (e) => {
		// 	console.warn("Erro ao carregar o áudio:", soundFile, e);
		// });

		// Mostrar toast (Bootstrap 5) com delay customizado
		const toastBootstrap = new bootstrap.Toast(toastEl, { delay: delay });
		toastBootstrap.show();

		// Evento ao fechar
		toastEl.addEventListener("hidden.bs.toast", () => {
			console.log("Toast fechado.");
		});
	}
});
