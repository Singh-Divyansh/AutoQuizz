const express = require("express");
const multer = require("multer");
const cors = require("cors");
const Tesseract = require("tesseract.js");

const app = express();
const port = 5000;

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173","https://autoquizz-frontend.onrender.com"], // Allow both local frontends
  methods: ["POST", "GET"],
  allowedHeaders: ["Content-Type"],
  credentials: true,
}));


app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Function to extract text from an image using Tesseract.js
async function extractTextFromImage(imageBuffer) {
  const { data: { text } } = await Tesseract.recognize(imageBuffer, "eng");
  return text;
}

// Function to process extracted text into structured questions
function processQuestions(text) {
  const questions = [];
  const lines = text.split("\n").map(line => line.trim()).filter(line => line);

  let currentQuestion = { text: "", options: [] };
  const optionPattern = /^[A-Za-z][\.\)]/; // Matches options like "A)", "B.", "C)", "D)"

  lines.forEach(line => {
    if (optionPattern.test(line)) {
      // If the line starts with an option marker, check if multiple options exist in the same line.
      let splitOptions = line.split(/(?=[A-Za-z][\.\)])/);
      splitOptions = splitOptions.map(opt => opt.trim()).filter(opt => opt.length > 0);

      splitOptions.forEach(opt => {
        currentQuestion.options.push(opt);
      });
    } else {
      // If we already have options and now encounter non-option text,
      // assume the previous question is complete and start a new one.
      if (currentQuestion.options.length > 0 && currentQuestion.text) {
        questions.push(currentQuestion);
        currentQuestion = { text: "", options: [] };
      }
      // Append the line to the current question text.
      currentQuestion.text = currentQuestion.text
        ? currentQuestion.text + " " + line
        : line;
    }
  });

  // Push the last question if it has content
  if (currentQuestion.text && currentQuestion.options.length > 0) {
    questions.push(currentQuestion);
  }

  return questions;
}

// Function to send questions to Google Form script
const updateGoogleForm = async (formId, questions) => {
  try {
    const response = await fetch(
      "https://script.google.com/macros/s/AKfycbwbd9nP94cg7DzHOq8Ld0O8Wia20icRiTRK1eVDmzpm0pca-MVTc8H9gADLTRMpJSYB/exec",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ formId, questions }),
      }
    );

    const textResponse = await response.text(); // ✅ Read response as text first
    console.log("Google Form Raw Response:", textResponse);

    try {
      const jsonResponse = JSON.parse(textResponse); // ✅ Try parsing as JSON
      return jsonResponse;
    } catch (jsonError) {
      console.error("Failed to parse JSON response from Google Form:", textResponse);
      return { error: "Invalid JSON response from Google Form" };
    }
  } catch (error) {
    console.error("Error updating Google Form:", error);
    return { error: "Failed to update form" };
  }
};

app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { formId } = req.body;
    if (!formId) {
      return res.status(400).json({ error: "Form ID is required" });
    }

    console.log("Received Form ID:", formId);  // ✅ Debugging Log

    const extractedText = await extractTextFromImage(req.file.buffer);
    const questions = processQuestions(extractedText);

    const updateResult = await updateGoogleForm(formId, questions);
    
    console.log("Google Form Update Result:", updateResult);  // ✅ Debugging Log

    res.json({ message: "Questions added successfully", questions, updateResult });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
