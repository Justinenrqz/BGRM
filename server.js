import express from 'express';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import WebSocket from 'ws';
import FormData from 'form-data';
import fetch from 'node-fetch';

const COMFYUI_URL = '127.0.0.1:8188';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());

// Gestión de persistencia para el tracker de reseñas
const REVIEWS_FILE = 'reviews.json';

function loadTracker() {
    try {
        if (fs.existsSync(REVIEWS_FILE)) {
            return JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf8'));
        }
    } catch (err) {
        console.error("Error cargando reviews.json:", err);
    }
    return [];
}

function saveTracker(data) {
    try {
        fs.writeFileSync(REVIEWS_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error guardando reviews.json:", err);
    }
}

// Función auxiliar para obtener dimensiones de imagen (PNG/JPG)
function getImageDimensions(filePath) {
    try {
        const buffer = fs.readFileSync(filePath);
        // PNG Check
        if (buffer[0] === 0x89 && buffer[1] === 0x50) {
            return {
                width: buffer.readUInt32BE(16),
                height: buffer.readUInt32BE(20)
            };
        }
        // JPG Check
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
            let offset = 2;
            while (offset < buffer.length) {
                const marker = buffer.readUInt16BE(offset);
                offset += 2;
                if (marker === 0xFFC0 || marker === 0xFFC2) {
                    offset += 3;
                    return {
                        height: buffer.readUInt16BE(offset),
                        width: buffer.readUInt16BE(offset + 2)
                    };
                }
                if (offset + 2 > buffer.length) break;
                const length = buffer.readUInt16BE(offset);
                offset += length;
            }
        }
    } catch (e) {
        console.error("Error leyendo dimensiones:", e.message);
    }
    return null;
}

// 1. Función para subir imágenes a ComfyUI
async function uploadImageToComfyUI(filePath) {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(filePath));

    const response = await fetch(`http://${COMFYUI_URL}/upload/image`, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
    });

    if (!response.ok) {
        throw new Error(`Failed to upload image: ${response.statusText}`);
    }
    return await response.json();
}

// 2. Función para descargar imagen resultante
async function downloadResult(filename) {
    const response = await fetch(`http://${COMFYUI_URL}/view?filename=${filename}&type=output`);
    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
    }
    return await response.buffer();
}

// 3. Orquestador de ComfyUI
async function logicComfyUI(sourcePath, backgroundPath, logoPath = null) {
    console.log("Subiendo imágenes a ComfyUI...");
    const sourceData = await uploadImageToComfyUI(sourcePath);
    const bgData = await uploadImageToComfyUI(backgroundPath);

    let logoData = null;
    if (logoPath) {
        logoData = await uploadImageToComfyUI(logoPath);
        console.log("Imágenes subidas:", sourceData.name, bgData.name, logoData.name);
    } else {
        console.log("Imágenes subidas:", sourceData.name, bgData.name);
    }

    // Cargar workflow
    let workflow = JSON.parse(fs.readFileSync('workflow_api.json', 'utf8'));

    // Configurar entradas base
    if (workflow["1"]) workflow["1"].inputs.image = sourceData.name;
    if (workflow["2"]) workflow["2"].inputs.image = bgData.name;

    // --- AJUSTE DE LA GENTE (DEPENDE DE SI HAY LOGO O NO) ---
    let logoBottom = 0;
    if (logoPath) {
        const dimsLogo = getImageDimensions(logoPath);
        if (dimsLogo) {
            logoBottom = 40 + (dimsLogo.height * 0.7); // 40 es LOGO_Y, 0.7 es LOGO_SCALE
        } else {
            logoBottom = 200; // Fallback
        }
    }

    const GAP = 30; // Margen de seguridad entre logo y gente
    const availableHeight = 1024 - logoBottom - (logoBottom > 0 ? GAP : 0) - 40; // 40px de margen inferior
    const TARGET_SIZE = Math.min(800, Math.round(availableHeight)); 
    
    const pX = Math.round((1024 - TARGET_SIZE) / 2);
    // Centramos a la gente en el espacio que queda debajo del logo (o en todo el cuadro si no hay logo)
    const centerY = logoBottom + (logoBottom > 0 ? GAP : 0) + (availableHeight / 2);
    const pY = Math.round(centerY - (TARGET_SIZE / 2));

    if (workflow["10"]) {
        workflow["10"].inputs.width = TARGET_SIZE;
        workflow["10"].inputs.height = TARGET_SIZE;
        workflow["10"].inputs.crop = "center";
    }

    if (workflow["5"]) {
        workflow["5"].inputs.x = pX;
        workflow["5"].inputs.y = pY;
    }
    // -------------------------------------------------------

    // INYECTAR LOGO DINÁMICAMENTE SOLO SI EXISTE
    if (logoData) {
        // Nodo 20: Cargar el Logo
        workflow["20"] = {
            "inputs": {
                "image": logoData.name,
                "upload": "image"
            },
            "class_type": "LoadImage"
        };

        // --- CÁLCULO DE CENTRADO DINÁMICO DEL LOGO ---
        const LOGO_SCALE = 0.7; // Un poco más grande como se pidió
        const dims = getImageDimensions(logoPath);
        let logoX = 0;
        
        if (dims) {
            const scaledWidth = dims.width * LOGO_SCALE;
            logoX = Math.max(0, Math.round((1024 - scaledWidth) / 2));
        } else {
            logoX = 150; // Fallback
        }

        // Nodo 22: Redimensionar proporcionalmente
        workflow["22"] = {
            "inputs": {
                "upscale_method": "area",
                "scale_by": LOGO_SCALE,
                "image": ["20", 0]
            },
            "class_type": "ImageScaleBy"
        };

        // Nodo 25: Luego aplicamos la IA sobre el logo ya escalado
        // Esto garantiza que la imagen y la máscara tengan el mismo tamaño
        workflow["25"] = {
            "inputs": {
                "rmbgmodel": ["3", 0],
                "image": ["22", 0]
            },
            "class_type": "BRIA_RMBG_Zho"
        };

        // Nodo 21: Componer el logo con el centrado calculado
        workflow["21"] = {
            "inputs": {
                "destination": ["5", 0],
                "source": ["25", 0], // Imagen con transparencia de la IA
                "mask": ["25", 1],   // Máscara de la IA (mismo tamaño)
                "x": logoX,          // Centro exacto calculado en JS
                "y": 40,
                "resize_source": false
            },
            "class_type": "ImageCompositeMasked"
        };

        // Apuntar el guardado (Nodo 6) al nuevo nodo de logo
        if (workflow["6"]) {
            workflow["6"].inputs.images = ["21", 0];
        }
    } else {
        // Si no hay logo, asegurar que Node 6 apunte a Node 5 (original)
        if (workflow["6"]) {
            workflow["6"].inputs.images = ["5", 0];
        }
    }

    const CLIENT_ID = uuidv4();
    const ws = new WebSocket(`ws://${COMFYUI_URL}/ws?clientId=${CLIENT_ID}`);

    return new Promise((resolve, reject) => {
        ws.on('open', async () => {
            console.log('Conectado a ComfyUI WS, enviando prompt...');
            try {
                const response = await fetch(`http://${COMFYUI_URL}/prompt`, {
                    method: 'POST',
                    body: JSON.stringify({
                        prompt: workflow,
                        client_id: CLIENT_ID
                    }),
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.ok) {
                    throw new Error(`Prompt API failed: ${response.statusText}`);
                }
            } catch (err) {
                reject(err);
            }
        });

        let lastNode = null;
        let executionSuccess = false;

        ws.on('message', async (data) => {
            const message = JSON.parse(data);

            if (message.type === 'executing') {
                lastNode = message.data.node;
                if (message.data.node === null) {
                    executionSuccess = true;
                }
            }

            if (message.type === 'execution_error') {
                ws.close();
                return reject(new Error("Error ejecutando nodo interno en ComfyUI: " + (message.data.exception_message || message.type)));
            }

            if (message.type === 'executed') {
                if (message.data.output && message.data.output.images) {
                    console.log("¡Proceso completado! Descargando output...");
                    const filename = message.data.output.images[0].filename;
                    try {
                        const buffer = await downloadResult(filename);
                        ws.close();
                        resolve(buffer);
                    } catch (err) {
                        reject(err);
                    }
                }
            }
        });

        ws.on('error', (err) => {
            reject(err);
        });

        ws.on('close', () => {
            if (!executionSuccess) {
                // reject(new Error("WebSocket cerrado prematuramente sin éxito."));
            }
        });
    });
}

// 4. Envío de Correo
async function sendEmail(targetEmail, imageBuffer, trackingUrl) {
    // === CONFIGURACIÓN SIMPLE GMAIL ===
    const MI_CORREO = 'justinzene@gmail.com';
    const MI_PASS = 'hbbhnkhzeclgimxi';
    const LINK_FINAL = trackingUrl || 'https://search.google.com/local/writereview?placeid=ChIJkYJhhy8nQg0Rg7PsosNKWWo';

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: MI_CORREO,
            pass: MI_PASS
        }
    });

    console.log("Enviando correo vía Gmail...");
    await transporter.sendMail({
        from: `"Foto Mágica Studio" <${MI_CORREO}>`,
        to: targetEmail,
        subject: "¡Aquí tienes tu foto terminada! ✨",
        html: `
            <div style="font-family: sans-serif; text-align: center; padding: 20px;">
                <h1>¡Tu foto está lista!</h1>
                <p>Hola, te adjuntamos la imagen que os realizamos.</p>
                <br>
                <p><b>¿Te ha gustado? Danos 5 estrellas en Google:</b></p>
                <a href="${LINK_FINAL}" style="display:inline-block; background:#4285F4; color:white; padding:15px 25px; text-decoration:none; border-radius:5px; font-weight:bold;">
                    DEJAR RESEÑA EN GOOGLE
                </a>
            </div>
        `,
        attachments: [{
            filename: 'resultado_foto.png',
            content: imageBuffer
        }]
    });
    console.log("Correo enviado a:", targetEmail);
}

// Endpoint Principal
app.post('/process-and-mail', upload.fields([
    { name: 'source' },
    { name: 'background' },
    { name: 'logo' }
]), async (req, res) => {
    const { email } = req.body;

    if (!req.files['source'] || !req.files['background']) {
        return res.status(400).json({ error: "Faltan imágenes principales." });
    }

    const sourcePath = req.files['source'][0].path;
    const bgPath = req.files['background'][0].path;

    // El logo ahora es un archivo subido, no un ID
    const logoFile = req.files['logo'] ? req.files['logo'][0] : null;
    const logoPath = logoFile ? logoFile.path : null;

    try {
        console.log(`Petición recibida para ${email}. Logo: ${logoPath ? 'Sí' : 'No'}. Iniciando procesamiento...`);
        // 1. Procesamiento AI
        const resultBuffer = await logicComfyUI(sourcePath, bgPath, logoPath);

        // 3. Crear registro de rastreo
        const trackingId = uuidv4();
        const tracker = loadTracker();
        tracker.push({
            id: trackingId,
            email: email,
            timestamp: new Date().toISOString(),
            clicked: false
        });
        saveTracker(tracker);

        // Cambia 'localhost:3000' por tu dominio real si tienes uno
        const BASE_URL = 'http://localhost:3000';
        const trackingUrl = `${BASE_URL}/go-to-review/${trackingId}`;

        // 4. Enviar email (no bloqueamos la respuesta si falla el email)
        try {
            await sendEmail(email, resultBuffer, trackingUrl);
        } catch (e) {
            console.error("Error enviando email, pero el proceso terminó:", e.message);
        }

        // Limpiar archivos locales subidos
        fs.unlinkSync(sourcePath);
        fs.unlinkSync(bgPath);
        if (logoPath) fs.unlinkSync(logoPath);

        const base64Image = resultBuffer.toString('base64');
        res.status(200).json({
            success: true,
            message: "¡Imagen procesada con éxito!",
            image: `data:image/png;base64,${base64Image}`
        });
    } catch (error) {
        console.error("Error en flujo de procesamiento:", error);
        res.status(500).json({ error: "Ocurrió un error: " + error.message });
    }
});

// Endpoint de Rastreo
app.get('/go-to-review/:id', (req, res) => {
    const { id } = req.params;
    const tracker = loadTracker();
    const record = tracker.find(r => r.id === id);

    if (record) {
        record.clicked = true;
        record.clickTimestamp = new Date().toISOString();
        saveTracker(tracker);
        console.log(`[TRACKER] El usuario ${record.email} ha pulsado en la reseña.`);
    }

    // URL original de Google Reviews
    const LINK_RESEÑA_ORIGINAL = 'https://search.google.com/local/writereview?placeid=ChIJkYJhhy8nQg0Rg7PsosNKWWo';
    res.redirect(LINK_RESEÑA_ORIGINAL);
});

// Endpoint para ver el estado de las reseñas
app.get('/review-status', (req, res) => {
    const tracker = loadTracker();
    res.json(tracker);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
