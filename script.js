document.addEventListener("DOMContentLoaded", () => {
	const resultadoTexto = document.getElementById("resultado-texto");
	const resultadoAudioImagem = document.getElementById("resultado-audio-imagem");
	const gravarBtn = document.getElementById("gravar-btn");
	const carregarBtn = document.getElementById("carregar-btn");
	const capturaFotoBtn = document.getElementById("captura-foto-btn");
	const arquivoInput = document.getElementById("arquivo-input");
	const videoElement = document.getElementById("video");
	const canvasElement = document.getElementById("canvas");

	let mediaRecorder;
	let audioChunks = [];

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

	// Grava e envia áudio
	async function gravarAudio() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaRecorder = new MediaRecorder(stream);
			audioChunks = [];

			mediaRecorder.ondataavailable = (event) => {
				audioChunks.push(event.data);
			};

			mediaRecorder.onstop = async () => {
				const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
				const formData = new FormData();
				formData.append("file", audioBlob);

				// Waveform
				const audioUrl = URL.createObjectURL(audioBlob);
				if (window.waveSurfer) window.waveSurfer.destroy();
				window.waveSurfer = WaveSurfer.create({
					container: "#waveform",
					waveColor: "#4F46E5",
					progressColor: "#6366F1",
					height: 100,
				});
				window.waveSurfer.load(audioUrl);

				// Envio para API
				const { ok, data } = await enviarArquivoParaAPI(
					"https://rtxapi.up.railway.app/audio/",
					formData
				);

				resultadoAudioImagem.classList.remove("d-none");
				if (ok) {
					resultadoAudioImagem.innerHTML = `<p><strong>Transcrição:</strong> ${data.transcricao}</p>`;
				} else {
					resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro: ${data.detail}</p>`;
				}
			};

			mediaRecorder.start();
			setTimeout(() => mediaRecorder.stop(), 5000);
		} catch (err) {
			resultadoAudioImagem.classList.remove("d-none");
			resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro ao acessar microfone: ${err.message}</p>`;
		}
	}

	// Captura de imagem e envio
	async function tirarFoto() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: true });
			videoElement.srcObject = stream;
			videoElement.classList.remove("d-none");

			setTimeout(async () => {
				const context = canvasElement.getContext("2d");
				canvasElement.classList.remove("d-none");
				context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

				const base64Image = canvasElement.toDataURL("image/jpeg").split(",")[1];
				const blob = await (await fetch(`data:image/jpeg;base64,${base64Image}`)).blob();
				const formData = new FormData();
				formData.append("file", blob);

				const { ok, data } = await enviarArquivoParaAPI(
					"https://rtxapi.up.railway.app/imagem/",
					formData
				);

				resultadoAudioImagem.classList.remove("d-none");
				if (ok) {
					resultadoAudioImagem.innerHTML = `<p><strong>Resultado da Análise:</strong> ${data.resultado}</p>`;
				} else {
					resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro: ${data.detail}</p>`;
				}

				stream.getTracks().forEach((track) => track.stop());
				videoElement.classList.add("d-none");
			}, 1000);
		} catch (err) {
			alert("Erro ao acessar a câmera: " + err.message);
		}
	}

	// Upload de arquivo
	async function carregarArquivo(file) {
		const formData = new FormData();
		formData.append("file", file);

		let endpoint = "";
		if (file.type.startsWith("image/")) {
			endpoint = "https://rtxapi.up.railway.app/imagem/";
		} else if (file.type.startsWith("audio/")) {
			endpoint = "https://rtxapi.up.railway.app/audio/";
		} else {
			resultadoAudioImagem.classList.remove("d-none");
			resultadoAudioImagem.innerHTML = `<p style="color:red;">Tipo de arquivo não suportado.</p>`;
			return;
		}

		const { ok, data } = await enviarArquivoParaAPI(endpoint, formData);
		resultadoAudioImagem.classList.remove("d-none");

		if (ok) {
			if (endpoint.includes("audio")) {
				resultadoAudioImagem.innerHTML = `<p><strong>Transcrição:</strong> ${data.transcricao}</p>`;
			} else {
				resultadoAudioImagem.innerHTML = `<p><strong>Resultado da Análise:</strong> ${data.resultado}</p>`;
			}
		} else {
			resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro: ${data.detail}</p>`;
		}
	}

	// Enviar descrição de gasto
	const textoForm = document.getElementById("texto-form");
	textoForm.addEventListener("submit", async (e) => {
		e.preventDefault();

		const descricao = document.getElementById("descricao").value;
		const formData = new FormData();
		formData.append("descricao", descricao);

		const { ok, data } = await enviarArquivoParaAPI(
			"https://rtxapi.up.railway.app/registro/",
			formData
		);

		resultadoTexto.classList.remove("d-none");
		if (ok && data.salvo) {
			resultadoTexto.innerHTML = `
				<div class="alert alert-success">
					<strong>Registrado com sucesso!</strong><br>
					<strong>Descrição:</strong> ${data.gpt.descricao}<br>
					<strong>Classificação:</strong> ${data.gpt.classificacao}<br>
					<strong>Valor:</strong> R$ ${parseFloat(data.gpt.valor).toFixed(2)}
				</div>`;
			document.getElementById("descricao").value = "";
		} else {
			resultadoTexto.innerHTML = `<div class="alert alert-danger">❌ Erro: ${
				data.detail || "Erro desconhecido"
			}</div>`;
		}
	});

	// Consulta por período
	const consultaForm = document.getElementById("consulta-form");
	const resultadoConsulta = document.getElementById("resultado-consulta");

	consultaForm.addEventListener("submit", async function (e) {
		e.preventDefault();
		const inicio = document.getElementById("data-inicio").value;
		const fim = document.getElementById("data-fim").value;

		try {
			const res = await fetch(
				`https://rtxapi.up.railway.app/registro/consulta/?data_inicio=${inicio}&data_fim=${fim}`
			);
			const data = await res.json();

			resultadoConsulta.classList.remove("d-none");
			if (data.gastos.length === 0) {
				resultadoConsulta.innerHTML = `<div class="alert alert-warning">Nenhum gasto encontrado no período.</div>`;
			} else {
				let html = `<div class="alert alert-success"><strong>Total gasto:</strong> R$ ${data.total.toFixed(
					2
				)}</div><ul class="list-group mt-2">`;
				data.gastos.forEach((gasto) => {
					html += `
					<li class="list-group-item">
						<strong>${gasto.descricao}</strong><br />
						${gasto.classificacao} - R$ ${parseFloat(gasto.valor).toFixed(2)}<br />
						<small>${new Date(gasto.data_hora).toLocaleString()}</small>
					</li>`;
				});
				html += `</ul>`;
				resultadoConsulta.innerHTML = html;
			}
		} catch (err) {
			resultadoConsulta.innerHTML = `<div class="alert alert-danger">Erro ao consultar gastos: ${err.message}</div>`;
		}
	});

	// Eventos de clique
	gravarBtn.addEventListener("click", gravarAudio);
	capturaFotoBtn.addEventListener("click", tirarFoto);
	carregarBtn.addEventListener("click", () => arquivoInput.click());

	arquivoInput.addEventListener("change", async () => {
		const file = arquivoInput.files[0];
		if (file) await carregarArquivo(file);
	});
});
