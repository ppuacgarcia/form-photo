import express from "express";
import path from "path";
import fs from "fs";
import https from "https";
import { fileURLToPath } from "url";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const WebSocket = require('ws');

const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT || 3000;

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTML_FORM_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>File Upload</title>
  <style>
    #video, #canvas { display: none; }
  </style>
</head>
<body>
  <h1>Capture Photo and Submit Form</h1>
  <form id="user-form">
    <label for="carnet">Carnet:</label>
    <input type="text" id="carnet" name="carnet" required><br><br>
    <label for="nombre">Nombre:</label>
    <input type="text" id="nombre" name="nombre" required><br><br>
    <label for="carrera">Carrera:</label>
    <input type="text" id="carrera" name="carrera" required><br><br>
    <label for="año">Año:</label>
    <input type="number" id="año" name="año" required><br><br>
    <button type="button" id="snap">Take Photo</button>
  </form>
  <video id="video" width="320" height="240" autoplay></video>
  <canvas id="canvas" width="320" height="240"></canvas>
  <script>
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    const userForm = document.getElementById('user-form');
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      video.srcObject = stream;
    }).catch((err) => console.error("Error accessing the camera:", err));

    document.getElementById('snap').addEventListener('click', async () => {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataURL = canvas.toDataURL('image/png').split(',')[1];
      const formData = new FormData(userForm);
      const userData = Object.fromEntries(formData.entries());
      try {
        const response = await fetch('/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...userData, image: dataURL }),
        });
        if (response.ok) {
          alert('Form and photo submitted successfully!');
          userForm.reset();
          window.location.href = '/images';
        } else {
          console.error('Error uploading image:', await response.text());
        }
      } catch (error) {
        console.error('Error:', error);
      }
    });
  </script>
</body>
</html>
`;

const app = express();
app.use(express.static(path.resolve(__dirname, "public")));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get("/", (req, res) => {
  res.send(HTML_FORM_TEMPLATE);
});

// Configuración de WebSocket
const server = https.createServer(
  {
    key: fs.readFileSync(path.resolve(__dirname, "server.key")),
    cert: fs.readFileSync(path.resolve(__dirname, "server.cert")),
  },
  app
);

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("ESP32 conectado a WebSocket");
  ws.on("close", () => console.log("ESP32 desconectado"));
});

app.post("/images", async (req, res) => {
  const { image: base64Data, carnet, nombre, carrera, año } = req.body;
  if (!base64Data) {
    return res.status(400).send("No image data found.");
  }

  const fileName = `image_${Date.now()}.png`;
  const filePath = path.join(__dirname, "public", fileName);

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.promises.writeFile(filePath, buffer);
    console.log(`Image saved to ${filePath}`);
    res.status(201).send("Image uploaded.");

    // Notificar a todos los clientes WebSocket (ESP32)
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send("true");
      }
    });
  } catch (error) {
    console.error("Error saving image:", error);
    res.status(500).send("Error saving image.");
  }
});

app.get("/images", async (req, res) => {
  try {
    const images = await fs.promises.readdir(path.resolve(__dirname, "public"));
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Images</title>
    </head>
    <body>
      <a href="/">Upload Image</a>
      <ul>
        ${images.map((img) => `<li><img src="/${img}" width="200"></li>`).join('')}
      </ul>
    </body>
    </html>`;
    res.send(html);
  } catch (error) {
    console.error("Error reading images:", error);
    res.status(500).send("Error reading images.");
  }
});

// Inicia el servidor en el puerto definido
server.listen(PORT, HOST, () => {
  console.log(`Server is listening at https://${HOST}:${PORT}`);
});
