import { useState } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";

export default function App() {
  const [file, setFile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formId, setFormId] = useState("");

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpeg", ".jpg"]
    },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length === 0) {
        alert("Invalid file type. Please upload a PNG or JPG image.");
        return;
      }
      setFile(acceptedFiles[0]);
    },
  });
  
  

  const handleUpload = async () => {
    if (!file || !formId) return alert("Please select an image and enter a Form ID");
    
    setLoading(true);
    const formData = new FormData();
    formData.append("image", file);
    formData.append("formId", formId);
    
    try {
      const response = await axios.post("https://autoquizz.onrender.com/upload", formData);
      setQuestions(response.data.questions);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Error uploading file");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg text-center">
        <h1 className="text-3xl font-bold text-blue-600 mb-6">AutoQuiz : Quizzes in seconds</h1>
        
        <input 
          type="text" 
          value={formId} 
          onChange={(e) => setFormId(e.target.value)} 
          placeholder="Enter Google Form ID" 
          className="w-full p-2 mb-4 border border-gray-300 rounded"
        />

        <div {...getRootProps()} className="w-full h-40 flex items-center justify-center border-2 border-dashed border-gray-400 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
          <input {...getInputProps()} />
          {isDragActive ? <p className="text-gray-500">Drop the file here...</p> : <p className="text-gray-700">Drag & drop an image here, or click to select one</p>}
        </div>

        {file && <p className="mt-2 text-gray-600">Selected: {file.name}</p>}
        
        <button onClick={handleUpload} className="mt-4 bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 w-full">
          {loading ? "Processing..." : "Upload & Update Form"}
        </button>

        {questions.length > 0 && (
          <div className="mt-6 bg-gray-100 p-4 rounded-lg text-left">
            <h2 className="text-lg font-semibold">Extracted Questions:</h2>
            {questions.map((q, index) => (
              <div key={index} className="mt-4">
                <p className="font-bold">{q.text}</p>
                <ul className="list-disc ml-6">
                  {q.options.map((option, i) => (
                    <li key={i} className="text-gray-700">{option}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}