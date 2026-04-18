import fetch from 'node-fetch';
import fs from 'fs';

const COMFYUI_URL = '127.0.0.1:8188';

async function testPrompt() {
    try {
        let workflow = JSON.parse(fs.readFileSync('workflow_api.json', 'utf8'));

        console.log("Sending Prompt payload...");
        const res = await fetch(`http://${COMFYUI_URL}/prompt`, {
            method: 'POST',
            body: JSON.stringify({
                prompt: workflow,
                client_id: 'test'
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log("Status:", res.status, res.statusText);
        if (!res.ok) {
            const errBody = await res.text();
            console.log("Error body:", errBody);
        } else {
            const data = await res.json();
            console.log("Success ID:", data.prompt_id);
        }
    } catch(e) {
        console.error("Test failed:", e.message);
    }
}
testPrompt();
