document.addEventListener('DOMContentLoaded', () => {
    const sourceInput = document.getElementById('source');
    const bgInput = document.getElementById('background');
    const logoInput = document.getElementById('logo');
    const form = document.getElementById('uploadForm');
    const submitBtn = document.getElementById('submitBtn');
    const statusBox = document.getElementById('status-message');

    // Manejo de previsualización de imágenes
    function setupFilePreview(inputId, dropZoneId, previewId) {
        const input = document.getElementById(inputId);
        const dropZone = document.getElementById(dropZoneId);
        const preview = document.getElementById(previewId);

        input.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();

                reader.onload = function(e) {
                    preview.style.backgroundImage = `url('${e.target.result}')`;
                    dropZone.classList.add('has-file');
                }

                reader.readAsDataURL(this.files[0]);
            } else {
                dropZone.classList.remove('has-file');
                preview.style.backgroundImage = '';
            }
        });

        // Soporte básico para drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--accent)';
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '';
            
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                input.files = e.dataTransfer.files;
                // Disparar evento change manualmente
                const event = new Event('change');
                input.dispatchEvent(event);
            }
        });
    }

    setupFilePreview('source', 'drop-zone-source', 'preview-source');
    setupFilePreview('background', 'drop-zone-bg', 'preview-bg');
    setupFilePreview('logo', 'drop-zone-logo', 'preview-logo');

    function showStatus(message, type) {
        statusBox.textContent = message;
        statusBox.className = `status-box ${type}`;
        statusBox.classList.remove('hidden');
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // UI Loading state
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        showStatus('Procesando la magia con inteligencia artificial... Esto puede tardar unos segundos.', 'processing');

        const formData = new FormData();
        formData.append('source', sourceInput.files[0]);
        formData.append('background', bgInput.files[0]);
        
        if (logoInput.files[0]) {
            formData.append('logo', logoInput.files[0]);
        }
        
        formData.append('email', document.getElementById('email').value);

        try {
            const response = await fetch('/process-and-mail', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                showStatus(result.message, 'success');
                
                // Mostrar el resultado en pantalla
                if (result.image) {
                    const resultContainer = document.getElementById('result-container');
                    const finalImage = document.getElementById('final-image');
                    finalImage.src = result.image;
                    resultContainer.classList.remove('hidden');
                }

                form.reset();
                document.querySelectorAll('.file-drop-zone').forEach(zone => zone.classList.remove('has-file'));
                document.querySelectorAll('.preview-layer').forEach(layer => layer.style.backgroundImage = '');
            } else {
                throw new Error(result.error || 'Ocurrió un error inesperado');
            }
        } catch (error) {
            showStatus(error.message, 'error');
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });
});
