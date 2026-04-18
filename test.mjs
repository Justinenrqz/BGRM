import fetch from 'node-fetch';

const COMFYUI_URL = '127.0.0.1:8188';

async function test() {
    try {
        console.log("Testing ComfyUI API...");
        const res = await fetch(`http://${COMFYUI_URL}/system_stats`);
        const data = await res.json();
        console.log("Stats:", Object.keys(data));
        console.log("Success! ComfyUI is reachable.");
    } catch(e) {
        console.error("Connection failed:", e.message);
    }
}
test();
