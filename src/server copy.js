import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const HOST = process.env.HOST;
const PORT = process.env.PORT;
const FILE_NAME = "FILE_UPLOADED";
const HTML_FORM_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>File Upload</title>
</head>
<body>
  <a href="/images">View Images</a>
    <form action="/images" method="post" enctype="multipart/form-data">
        <input type="file" name="${FILE_NAME}">
        <input type="submit">
    </form>
</body>
</html>
`;

const app = express();
app.use(express.static(path.resolve(import.meta.dirname, "public")));

const upload = multer({ dest: path.resolve(import.meta.dirname, "public") });

//loggin middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// serve up HTML FORM
app.get("/", (req, res) => {
  res.send(HTML_FORM_TEMPLATE);
});



app.post("/images", upload.single(FILE_NAME), (req, res) => {
    console.log(req.file);
    res.redirect("/images");
});   

app.get("/images", async (req, res) => {
    const images = await fs.promises.readdir(path.resolve(import.meta.dirname, "public"));
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
        
        ${images.map((image) => `<li><img src="/${image}" width="200"></li>`).join("")}
        
    </body>
    </html>
    `
    res.send(html);

});

app.listen(PORT, HOST, () => {
  console.log(`Server is listening at http://${HOST}:${PORT}`);
});