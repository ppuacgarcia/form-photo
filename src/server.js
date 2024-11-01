import express from "express";
import path from "path";
import fs from "fs";
import https from "https";
import { fileURLToPath } from "url";

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
    /* Ocultar el video y el canvas */
    #video, #canvas {
      display: none;
    }
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

    // Iniciar la transmisión de video desde la cámara
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        video.srcObject = stream;
      })
      .catch((err) => console.error("Error accessing the camera:", err));

    // Capturar la foto y enviar junto con los datos del formulario
    document.getElementById('snap').addEventListener('click', async () => {
      // Capturar imagen del video
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataURL = canvas.toDataURL('image/png').split(',')[1]; // Obtener base64

      // Recoger los datos del formulario
      const formData = new FormData(userForm);
      const userData = Object.fromEntries(formData.entries());

      // Enviar la imagen y los datos al servidor mediante fetch
      try {
        const response = await fetch('/images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...userData, image: dataURL }),
        });

        if (response.ok) {
          alert('Form and photo submitted successfully!');
          userForm.reset(); // Limpiar el formulario
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

// Middleware para analizar el cuerpo de la solicitud
app.use(express.json({ limit: '10mb' })); // Para manejar base64 grandes
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Servir HTML con la cámara
app.get("/", (req, res) => {
  res.send(HTML_FORM_TEMPLATE);
});

// Guardar la imagen enviada en base64
app.post("/images", async (req, res) => {
  const { image: base64Data } = req.body;
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
  } catch (error) {
    console.error("Error saving image:", error);
    res.status(500).send("Error saving image.");
  }
});

// Listar las imágenes almacenadas
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

// Crear un servidor HTTPS
const server = https.createServer(
  {
    key: fs.readFileSync(path.resolve(__dirname, "server.key")),
    cert: fs.readFileSync(path.resolve(__dirname, "server.cert")),
  },
  app
);

// Escuchar en el puerto definido
server.listen(PORT, HOST, () => {
  console.log(`Server is listening at https://${HOST}:${PORT}`);
});
