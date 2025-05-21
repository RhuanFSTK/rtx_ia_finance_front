document.addEventListener("DOMContentLoaded", () => {
	const textoForm = document.getElementById("texto-form");
	const resultadoTexto = document.getElementById("resultado-texto");
	const resultadoAudioImagem = document.getElementById(
		"resultado-audio-imagem"
	);

	const gravarBtn = document.getElementById("gravar-btn");
	const carregarBtn = document.getElementById("carregar-btn");
	const audioInput = document.getElementById("audio");
	const imagemInput = document.getElementById("imagem");

	const capturaFotoBtn = document.getElementById("captura-foto-btn");
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

	textoForm.addEventListener("submit", async (e) => {
		e.preventDefault();

		const descricao = document.getElementById("descricao").value;
		const formData = new FormData();
		formData.append("descricao", descricao);

		const { ok, data } = await enviarArquivoParaAPI(
			"https://rtxfinance.up.railway.app/registro/",
			formData
		);

		if (ok) {
			resultadoTexto.innerHTML = `
        <div class="alert alert-success">
          <strong>✅ Gasto registrado com sucesso!</strong><br>
          <strong>Descrição:</strong> ${data.descricao}<br>
          <strong>Classificação:</strong> ${data.classificacao}<br>
          <strong>Valor:</strong> R$ ${parseFloat(data.valor).toFixed(2)}
        </div>
      `;
		} else {
			resultadoTexto.innerHTML = `
        <div class="alert alert-danger">
          ❌ Erro: ${data.detail || "Erro desconhecido"}
        </div>
      `;
		}
	});

	gravarBtn.addEventListener("click", async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
			mediaRecorder = new MediaRecorder(stream);

			audioChunks = [];

			mediaRecorder.ondataavailable = (event) => {
				audioChunks.push(event.data);
			};

			mediaRecorder.onstop = async () => {
				const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
				const formData = new FormData();
				formData.append("file", audioBlob); // Corrigido para 'file'

				const { ok, data } = await enviarArquivoParaAPI(
					"https://rtxfinance.up.railway.app/audio/",
					formData
				);

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

	carregarBtn.addEventListener("click", () => {
		const audioVisible = audioInput.style.display !== "none";
		audioInput.style.display = audioVisible ? "none" : "block";
		imagemInput.style.display = audioVisible ? "block" : "none";
	});

	audioInput.addEventListener("change", async () => {
		const file = audioInput.files[0];
		if (file) {
			const formData = new FormData();
			formData.append("file", file); // Corrigido para 'file'

			const { ok, data } = await enviarArquivoParaAPI(
				"https://rtxfinance.up.railway.app/audio/",
				formData
			);
			if (ok) {
				resultadoAudioImagem.innerHTML = `<p><strong>Transcrição:</strong> ${data.texto}</p>`;
			} else {
				resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro: ${data.detail}</p>`;
			}
		}
	});

	imagemInput.addEventListener("change", async () => {
		const file = imagemInput.files[0];
		if (file) {
			const formData = new FormData();
			formData.append("file", file); // Corrigido para 'file'

			const { ok, data } = await enviarArquivoParaAPI(
				"https://rtxfinance.up.railway.app/imagem/",
				formData
			);
			if (ok) {
				resultadoAudioImagem.innerHTML = `<p><strong>Resultado da Análise:</strong> ${data.resultado}</p>`;
			} else {
				resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro: ${data.detail}</p>`;
			}
		}
	});

	capturaFotoBtn.addEventListener("click", async () => {
		if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: true,
			});
			videoElement.srcObject = stream;
			videoElement.style.display = "block";

			setTimeout(async () => {
				const context = canvasElement.getContext("2d");
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
				formData.append("file", blob); // Corrigido para 'file'

				const { ok, data } = await enviarArquivoParaAPI(
					"https://rtxfinance.up.railway.app/imagem/",
					formData
				);

				if (ok) {
					resultadoAudioImagem.innerHTML = `<p><strong>Resultado da Análise:</strong> ${data.resultado}</p>`;
				} else {
					resultadoAudioImagem.innerHTML = `<p style="color:red;">Erro: ${data.detail}</p>`;
				}

				stream.getTracks().forEach((track) => track.stop());
				videoElement.style.display = "none";
			}, 1000);
		} else {
			alert("A câmera não é suportada neste dispositivo.");
		}
	});

	const consultaForm = document.getElementById("consulta-form");
	const resultadoConsulta = document.getElementById("resultado-consulta");

	consultaForm.addEventListener("submit", async function (e) {
		e.preventDefault();

		const inicio = document.getElementById("data-inicio").value;
		const fim = document.getElementById("data-fim").value;

		try {
			const res = await fetch(
				`https://rtxfinance.up.railway.app/registro/consulta/?data_inicio=${inicio}&data_fim=${fim}`
			);
			const data = await res.json();

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
            ${gasto.classificacao} - R$ ${parseFloat(gasto.valor).toFixed(
						2
					)}<br />
            <small>${new Date(gasto.data_hora).toLocaleString()}</small>
          </li>`;
				});
				html += `</ul>`;
				resultadoConsulta.innerHTML = html;
			}

			resultadoConsulta.classList.remove("d-none");
		} catch (err) {
			resultadoConsulta.innerHTML = `<div class="alert alert-danger">Erro ao consultar gastos: ${err.message}</div>`;
			resultadoConsulta.classList.remove("d-none");
		}
	});
});
