document.addEventListener("DOMContentLoaded", () => {
	const cardResultado = document.getElementById("cardResultado");
	const resultadoTexto = document.getElementById("resultado-texto");
	const resultadoAudioImagem = document.getElementById(
		"resultado-audio-imagem"
	);
	const loadingSpinner = document.getElementById("loading-spinner");
	const waveformContainer = document.getElementById("waveform-container");
	const videoElement = document.createElement("video"); // criado dinamicamente
	const canvasElement = document.createElement("canvas"); // criado dinamicamente
	const gravarBtn = document.getElementById("gravar-btn");
	const capturaFotoBtn = document.getElementById("captura-foto-btn");
	const carregarBtn = document.getElementById("carregar-btn");
	const arquivoInput = document.getElementById("arquivo-input");
	const consultaForm = document.getElementById("consulta-form");
	const resultadoConsulta = document.getElementById("resultado-consulta");
	const textoForm = document.getElementById("texto-form");

	const btnEnviarGravacao = document.getElementById("btn-enviar-gravacao");
	const btnCancelarGravacao = document.getElementById(
		"btn-cancelar-gravacao"
	);
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

	function mostrarResultado(container, tipo, mensagem) {
		container.classList.remove(
			"alert-success",
			"alert-danger",
			"alert-warning",
			"alert-info",
			"alert-light"
		);
		container.classList.add("alert", `alert-${tipo}`, "fade", "show");
		container.innerHTML = mensagem;
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

	// Função toggle gravação estilo WhatsApp
	async function toggleGravacao() {
		if (mediaRecorder && mediaRecorder.state === "recording") {
			// Parar gravação
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
				stream.getTracks().forEach((track) => track.stop());
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
			mostrarResultado(
				resultadoAudioImagem,
				"danger",
				`<strong>Erro:</strong> ${data.detail}`
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

	gravarBtn.addEventListener("click", () => {
		toggleGravacao();
	});

	btnEnviarGravacao.addEventListener("click", () => {
		enviarGravacao();
	});

	btnCancelarGravacao.addEventListener("click", () => {
		cancelarGravacao();
	});

	// Função tirar foto (mantida do seu código original)
	async function tirarFoto() {
		try {
			showLoading();

			const streamVideo = await navigator.mediaDevices.getUserMedia({
				video: true,
			});
			videoElement.srcObject = streamVideo;
			videoElement.play();

			// Espera 1s para estabilizar
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

			const base64Image = canvasElement
				.toDataURL("image/jpeg")
				.split(",")[1];
			const blob = await (
				await fetch(`data:image/jpeg;base64,${base64Image}`)
			).blob();

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
				mostrarResultado(
					resultadoAudioImagem,
					"danger",
					`<strong>Erro:</strong> ${data.detail}`
				);
				resultadoAudioImagem.classList.remove("d-none");
			}

			streamVideo.getTracks().forEach((track) => track.stop());
			hideLoading();
		} catch (err) {
			hideLoading();
			mostrarResultado(
				resultadoAudioImagem,
				"danger",
				`<strong>Erro ao acessar câmera:</strong> ${err.message}`
			);
		}
	}

	capturaFotoBtn.addEventListener("click", tirarFoto);

	// Carregar arquivo
	carregarBtn.addEventListener("click", () => {
		arquivoInput.click();
	});

	arquivoInput.addEventListener("change", async () => {
		const file = arquivoInput.files[0];
		if (!file) return;

		const formData = new FormData();
		formData.append("file", file);

		showLoading();
		cardResultado.classList.add("show");
		cardResultado.classList.remove("collapse");
		waveformContainer.classList.add("collapse");
		waveformContainer.classList.remove("show");
		resultadoAudioImagem.classList.add("d-none");

		if (file.type.startsWith("audio/")) {
			// Exibir waveform
			const audioUrl = URL.createObjectURL(file);
			if (window.waveSurfer) window.waveSurfer.destroy();
			window.waveSurfer = WaveSurfer.create({
				container: "#waveform",
				waveColor: "#4F46E5",
				progressColor: "#6366F1",
				height: 100,
			});
			waveformContainer.classList.remove("collapse");
			waveformContainer.classList.add("show");
			window.waveSurfer.load(audioUrl);

			const { ok, data } = await enviarArquivoParaAPI(
				"https://rtxapi.up.railway.app/audio/",
				formData
			);

			if (ok) {
				mostrarResultado(
					resultadoAudioImagem,
					"success",
					`<strong>Transcrição:</strong> ${data.transcricao}`
				);
				resultadoAudioImagem.classList.remove("d-none");
			} else {
				mostrarResultado(
					resultadoAudioImagem,
					"danger",
					`<strong>Erro:</strong> ${data.detail}`
				);
				resultadoAudioImagem.classList.remove("d-none");
			}
		} else if (file.type.startsWith("image/")) {
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
				mostrarResultado(
					resultadoAudioImagem,
					"danger",
					`<strong>Erro:</strong> ${data.detail}`
				);
				resultadoAudioImagem.classList.remove("d-none");
			}
			waveformContainer.classList.add("collapse");
			waveformContainer.classList.remove("show");
		} else {
			mostrarResultado(
				resultadoAudioImagem,
				"warning",
				"Tipo de arquivo não suportado."
			);
			resultadoAudioImagem.classList.remove("d-none");
			waveformContainer.classList.add("collapse");
			waveformContainer.classList.remove("show");
		}
		hideLoading();
		arquivoInput.value = "";
	});

	// Formulário descrição (mantido do seu código original)
	textoForm.addEventListener("submit", async (e) => {
		e.preventDefault();
		const descricao = document.getElementById("descricao").value.trim();
		if (!descricao) return;

		resultadoTexto.classList.add("d-none");
		showLoading();

		try {
			const res = await fetch("https://rtxapi.up.railway.app/registro/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ descricao }),
			});

			const data = await res.json();
			console.log(data)
			hideLoading();

			if (res.ok) {
				mostrarResultado(
					resultadoTexto,
					"success",
					`<strong>Classificação:</strong> ${
						data.classificacao
					} <br /> <strong>Valor:</strong> R$ ${parseFloat(
						data.valor
					).toFixed(2)}`
				);
			} else {
				mostrarResultado(
					resultadoTexto,
					"danger",
					`<strong>Erro:</strong> ${
						typeof data.detail === "object"
							? JSON.stringify(data.detail)
							: data.detail
					}`
				);
			}
		} catch (err) {
			hideLoading();
			mostrarResultado(
				resultadoTexto,
				"danger",
				`<strong>Erro:</strong> ${err.message || JSON.stringify(err)}`
			);
		}
	});

	// Consulta gastos (mantido do seu código original)
	consultaForm.addEventListener("submit", async (e) => {
		e.preventDefault();
		const inicio = document.getElementById("data-inicio").value;
		const fim = document.getElementById("data-fim").value;

		resultadoConsulta.innerHTML = "";
		mostrarResultado(resultadoConsulta, "info", "Consultando...");

		try {
			const res = await fetch(
				`https://rtxapi.up.railway.app/registro/consulta/?data_inicio=${inicio}&data_fim=${fim}`
			);
			const data = await res.json();

			if (res.ok) {
				if (data.gastos.length === 0) {
					mostrarResultado(
						resultadoConsulta,
						"warning",
						"Nenhum gasto encontrado no período."
					);
				} else {
					let tabelaHtml = `
          <div class="alert alert-success">Total gasto: R$ ${data.total.toFixed(
				2
			)}</div>
          <table class="table table-striped table-bordered mt-3">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Classificação</th>
                <th>Valor (R$)</th>
                <th>Data e Hora</th>
              </tr>
            </thead>
            <tbody>
          `;

					data.gastos.forEach((gasto) => {
						tabelaHtml += `
              <tr>
                <td>${gasto.descricao}</td>
                <td>${gasto.classificacao}</td>
                <td>${parseFloat(gasto.valor).toFixed(2)}</td>
                <td>${new Date(gasto.data_hora).toLocaleString()}</td>
              </tr>
            `;
					});

					tabelaHtml += "</tbody></table>";
					resultadoConsulta.className = "";
					resultadoConsulta.classList.add("mt-3");
					resultadoConsulta.innerHTML = tabelaHtml;
				}
			} else {
				mostrarResultado(
					resultadoConsulta,
					"danger",
					`Erro: ${data.detail}`
				);
			}
		} catch (err) {
			mostrarResultado(
				resultadoConsulta,
				"danger",
				`Erro ao consultar: ${err.message}`
			);
		}
	});
});
