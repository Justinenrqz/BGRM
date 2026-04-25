# 🖼️ BGRM - Background Removal & Studio Automator

¡Bienvenido a **BGRM**! Una potente herramienta de automatización para estudios fotográficos que combina la potencia de la **Inteligencia Artificial (ComfyUI)** con un flujo de trabajo simplificado para entregar resultados mágicos directamente al correo de tus clientes. ✨

---

## 🚀 Características Principales

*   **🤖 Procesamiento con IA**: Integración directa con **ComfyUI** utilizando el modelo **BRIA RMBG** para una eliminación de fondo ultra precisa.
*   **🎨 Composición Dinámica**: Superposición automática de sujetos sobre fondos personalizados.
*   **🏷️ Gestión de Logos Inteligente**: Inserción de logos con eliminación automática de fondos negros mediante detección de luminancia (¡colores intactos!).
*   **📧 Automatización de Email**: Envío automático del resultado final al cliente a través de Gmail.
*   **⭐ Sistema de Reseñas**: Tracker integrado para fomentar y rastrear reseñas en Google My Business.
*   **🖥️ Interfaz Intuitiva**: Panel de administración sencillo para cargar fotos y gestionar el flujo.

---

## 🛠️ Requisitos Previos

Antes de empezar, asegúrate de tener instalado:
*   [Node.js](https://nodejs.org/) (v16 o superior)
*   [ComfyUI](https://github.com/comfyanonymous/ComfyUI) ejecutándose localmente (puerto 8188 por defecto)
*   Nodos personalizados de ComfyUI: `ComfyUI-Essentials`, `ComfyUI-BRIA-RMBG`.

---

## 📥 Instalación

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/Justinenrqz/BGRM.git
    cd BGRM
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```

3.  **Configura las variables de entorno:**
    Crea un archivo `.env` en la raíz del proyecto (opcional pero recomendado) para proteger tus credenciales de Gmail.

---

## ⚙️ Configuración del Servidor

En el archivo `server.js`, asegúrate de configurar tu dirección de ComfyUI y tus credenciales de correo:

```javascript
// Configuración de ComfyUI
const COMFYUI_URL = '127.0.0.1:8188';

// Configuración de Gmail (Usa contraseñas de aplicación)
const MI_CORREO = 'tu-email@gmail.com';
const MI_PASS = 'tu-contraseña-de-aplicación';
```

> [!WARNING]
> **SEGURIDAD**: Nunca subas tus contraseñas reales a GitHub. Asegúrate de usar un archivo `.env` o mantener el archivo `server.js` fuera del control de versiones si contiene datos sensibles.

---

## 🚀 Uso del Sistema

1.  **Inicia el servidor:**
    ```bash
    npm start
    ```
2.  Accede a `http://localhost:3000` en tu navegador.
3.  Sube la **imagen original**, el **fondo deseado** y, opcionalmente, tu **logo**.
4.  Introduce el **email del cliente** y pulsa "Procesar".
5.  ¡Listo! El cliente recibirá su foto editada y un enlace para dejar una reseña.

---

## 📊 Seguimiento de Reseñas

El sistema incluye un endpoint para ver cuántos usuarios han hecho clic en el enlace de reseña enviado por correo:
👉 `http://localhost:3000/review-status`

---

## 🤝 Contribuciones

¿Quieres mejorar BGRM? ¡Las contribuciones son bienvenidas!
1. Haz un Fork del proyecto.
2. Crea una rama para tu mejora (`git checkout -b feature/MejoraIncreible`).
3. Haz un commit con tus cambios (`git commit -m 'Añadir nueva funcionalidad'`).
4. Haz un Push a la rama (`git push origin feature/MejoraIncreible`).
5. Abre un Pull Request.

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT.

---
Desarrollado con ❤️ para fotógrafos y creativos. 📸
