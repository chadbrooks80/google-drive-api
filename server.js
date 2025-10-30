const express = require("express");
const { google } = require("googleapis");
const path = require("path");

const app = express();

// --- Google Drive setup ---
const KEYFILEPATH = path.join(__dirname, "service-key.json");
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});
const drive = google.drive({ version: "v3", auth });

// --- Helper: build simple HTML ---
function htmlPage(title, body) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.5; }
      a { color: #0077cc; text-decoration: none; }
      a:hover { text-decoration: underline; }
      pre { white-space: pre-wrap; word-wrap: break-word; background: #f7f7f7; padding: 15px; border-radius: 8px; }
    </style>
  </head>
  <body>${body}</body>
  </html>`;
}

// --- Route: list files in Drive ---
app.get("/list", async (req, res) => {
  try {
    const response = await drive.files.list({
      pageSize: 20,
      fields: "files(id, name)",
    });

    const files = response.data.files;
    if (!files.length) {
      return res.send(htmlPage("Drive Files", "<p>No files found.</p>"));
    }

    const listItems = files
      .map(
        (f) =>
          `<li><a href="/request?id=${f.id}">${f.name}</a> — <code>${f.id}</code></li>`
      )
      .join("");

    res.send(
      htmlPage("Drive Files", `<h2>Files</h2><ul>${listItems}</ul>`)
    );
  } catch (err) {
    console.error("❌ Error listing files:", err.message);
    res.status(500).send(htmlPage("Error", `<pre>${err.message}</pre>`));
  }
});

// --- Route: fetch file contents ---
app.get("/request", async (req, res) => {
  const fileId = req.query.id;
  if (!fileId) {
    return res.status(400).send(htmlPage("Error", "<p>Missing file ID</p>"));
  }

  try {
    // Try exporting as plain text first (works for Google Docs)
    const file = await drive.files.export(
      { fileId, mimeType: "text/plain" },
      { responseType: "text" }
    );

    const content =
      typeof file.data === "string" ? file.data : JSON.stringify(file.data);

    res.send(
      htmlPage("File Contents", `<h2>File ID: ${fileId}</h2><pre>${content}</pre>`)
    );
  } catch (err) {
    console.error("❌ Error fetching file:", err.message);
    res
      .status(500)
      .send(
        htmlPage(
          "Error Reading File",
          `<p>Could not fetch that file.</p><pre>${err.message}</pre>`
        )
      );
  }
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server live at http://localhost:${PORT}`));
