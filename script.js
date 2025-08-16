console.log("JavaScript Loaded!");

// Declare the session variable globally
let session = null;

// Load ONNX model
async function loadModel() {
    console.log("Loading ONNX Model...");

    try {
        session = await ort.InferenceSession.create("model.onnx");
        console.log("ONNX Model Loaded Successfully!");
    } catch (error) {
        console.error("Model Load Error:", error);
    }
}

// Ensure the model is fully loaded before making predictions
async function ensureModelLoaded(retries = 10) {
    for (let i = 0; i < retries; i++) {
        if (session) return true;
        console.log("Waiting for ONNX Model to load...");
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.error("ONNX Model failed to load after multiple retries.");
    return false;
}

// Image Preview Function
function previewImage(event) {
    let reader = new FileReader();
    reader.onload = function () {
        let img = document.getElementById("inputImage");
        img.src = reader.result;
        img.style.display = "block"; // Show image preview
    };
    reader.readAsDataURL(event.target.files[0]);
}

// Preprocess Image for ONNX
async function preprocessImage(imageElement) {
    return new Promise((resolve, reject) => {
        if (!imageElement || !(imageElement instanceof HTMLImageElement)) {
            return reject("Provided value is not a valid HTMLImageElement.");
        }

        try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const targetSize = 128;

            canvas.width = targetSize;
            canvas.height = targetSize;
            ctx.drawImage(imageElement, 0, 0, targetSize, targetSize);

            const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
            const data = imageData.data;

            const floatArray = new Float32Array(targetSize * targetSize * 3);
            for (let i = 0, j = 0; i < data.length; i += 4) {
                floatArray[j++] = data[i] / 255.0;     // Red
                floatArray[j++] = data[i + 1] / 255.0; // Green
                floatArray[j++] = data[i + 2] / 255.0; // Blue
            }

            const inputTensor = new ort.Tensor("float32", floatArray, [1, 128, 128, 3]);
            resolve(inputTensor);
        } catch (error) {
            reject("Image Preprocessing Error: " + error);
        }
    });
}

// Predict function
async function predictImage() {
    console.log("Predict Button Clicked!");

    if (!session) {
        console.error("ONNX Model not loaded yet!");
        return;
    }

    const imageElement = document.getElementById("inputImage");
    if (!imageElement || imageElement.src === "") {
        console.error("Image not loaded properly!");
        return;
    }

    try {
        console.log("Preprocessing Image...");
        const inputTensor = await preprocessImage(imageElement);

        console.log("Running Prediction...");
        const feeds = { "conv2d_input": inputTensor };
        const results = await session.run(feeds);

        console.log("Prediction Output:", results);

        if (results.dense_1) {
            const outputData = results.dense_1.data;
            console.log("Final Prediction:", outputData);

            // Waste categories
            const classLabels = [
                "Chemical Waste",
                "Organic Waste",
                "Plastic Waste"
                
            ];

            // Detailed Waste Disposal Guidelines
            const disposalInstructions = {
                "Organic Waste": `
                    <strong>Common Types:</strong> Crop residues, sugarcane leaves, fruit peels, manure. <br>
                    <strong>Best Disposal Methods:</strong> 
                    - ✅ **Composting:** Converts waste into fertilizer, enriching soil.  
                    - ✅ **Mulching:** Leaves and stalks can be spread on the farm to retain moisture.  
                    - ✅ **Bioenergy:** Large-scale farms can use biogas plants to generate energy.  
                    - ❌ **Avoid Burning:** Burning releases harmful gases, worsening air pollution.  
                `,
                "Plastic Waste": `
                    <strong>Common Types:</strong> Pesticide bottles, plastic mulch, packaging. <br>
                    <strong>Best Disposal Methods:</strong> 
                    - ✅ **Recycling:** Sort plastics by type and send to a recycling center.  
                    - ✅ **Reusing:** Consider repurposing plastic containers for storage.  
                    - ❌ **Avoid Burning:** Releases toxic chemicals harmful to health and crops.  
                    - ✅ **Disposal Centers:** Drop off non-recyclable plastic at authorized waste centers.  
                `,
                "Chemical Waste": `
                    <strong>Common Types:</strong> Expired pesticides, fertilizers, herbicides. <br>
                    <strong>Best Disposal Methods:</strong> 
                    - ✅ **Proper Storage:** Store in leak-proof containers away from water sources.  
                    - ✅ **Authorized Disposal:** Contact local agricultural offices for hazardous waste collection.  
                    - ❌ **Avoid Dumping:** Never dispose of chemicals in soil or water bodies.  
                    - ✅ **Reuse Guidelines:** Some fertilizers can be diluted and used safely if not expired.  
                `,
                "Metal Waste": `
                    <strong>Common Types:</strong> Rusted tools, machinery parts, wires. <br>
                    <strong>Best Disposal Methods:</strong> 
                    - ✅ **Recycling:** Scrap metal can be sold or sent for melting and reuse.  
                    - ✅ **Repurposing:** Old tools can be repaired or turned into new equipment.  
                    - ❌ **Avoid Dumping:** Metals rust and contaminate soil and water.  
                    - ✅ **Safe Storage:** Keep sharp metal waste in designated bins to prevent injuries.  
                `,
                "Glass Waste": `
                    <strong>Common Types:</strong> Broken greenhouse panels, glass bottles. <br>
                    <strong>Best Disposal Methods:</strong> 
                    - ✅ **Recycling:** Glass can be melted and remolded into new products.  
                    - ✅ **Repurposing:** Broken glass can be ground and used in construction.  
                    - ❌ **Avoid Open Disposal:** Sharp glass pieces pose a risk to people and animals.  
                    - ✅ **Safe Handling:** Use gloves and store glass waste in thick containers.  
                `
            };

            // Find the class with the highest confidence score
            const maxIndex = outputData.indexOf(Math.max(...outputData));
            const predictedClass = classLabels[maxIndex];
            const disposalInfo = disposalInstructions[predictedClass];

            // Display the prediction and disposal recommendation
            document.getElementById("result").innerHTML = `
                <strong>Prediction:</strong> ${predictedClass} <br>
                <strong>How to Dispose:</strong> <br> ${disposalInfo}
            `;
        } else {
            console.error("Prediction output missing expected key 'dense_1'");
        }
    } catch (error) {
        console.error("Prediction Error:", error);
    }
}

// Initialize the ONNX model when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadModel();
});
const translations = {
    en: {
        title: "Farm Waste Management",
        welcome: "Helping farmers manage agricultural waste effectively.",
        track: "Waste Tracking System",
        upload: "Upload Photos",
        resources: "Educational Resources",
        contact: "Contact Us",
        email: "Email: support@farmwaste.com"
    },
    hi: {
        title: "फार्म कचरा प्रबंधन",
        welcome: "किसानों को कृषि कचरे का प्रभावी ढंग से प्रबंधन करने में मदद करना।",
        track: "कचरा ट्रैकिंग प्रणाली",
        upload: "फोटो अपलोड करें",
        resources: "शैक्षिक संसाधन",
        contact: "संपर्क करें",
        email: "ईमेल: support@farmwaste.com"
    },
    pa: {
        title: "ਖੇਤੀਬਾੜੀ ਕਚਰਾ ਪ੍ਰਬੰਧਨ",
        welcome: "ਕਿਸਾਨਾਂ ਦੀ ਮਦਦ ਕਰਨਾ ਕਿ ਉਹ ਖੇਤੀਬਾੜੀ ਕਚਰੇ ਨੂੰ ਢੰਗ ਨਾਲ ਨਿਬਾ ਸਕਣ।",
        track: "ਕਚਰਾ ਟ੍ਰੈਕਿੰਗ ਸਿਸਟਮ",
        upload: "ਤਸਵੀਰਾਂ ਅੱਪਲੋਡ ਕਰੋ",
        resources: "ਸ਼ਿੱਖਿਆ ਸੰਸਾਧਨ",
        contact: "ਸਾਡੇ ਨਾਲ ਸੰਪਰਕ ਕਰੋ",
        email: "ਈਮੇਲ: support@farmwaste.com"
    },
    mr: {
        title: "शेतीतील कचरा व्यवस्थापन",
        welcome: "शेतकऱ्यांना कृषी कचऱ्याचे प्रभावीपणे व्यवस्थापन करण्यास मदत करणे.",
        track: "कचरा ट्रॅकिंग प्रणाली",
        upload: "फोटो अपलोड करा",
        resources: "शैक्षणिक संसाधने",
        contact: "संपर्क करा",
        email: "ईमेल: support@farmwaste.com"
    },
    bn: {
        title: "ফার্ম বর্জ্য ব্যবস্থাপনা",
        welcome: "কৃষকদের কৃষি বর্জ্য কার্যকরভাবে পরিচালনা করতে সাহায্য করা।",
        track: "বর্জ্য ট্র্যাকিং সিস্টেম",
        upload: "ছবি আপলোড করুন",
        resources: "শিক্ষাগত সম্পদ",
        contact: "যোগাযোগ করুন",
        email: "ইমেল: support@farmwaste.com"
    },
    ta: {
        title: "விவசாயக் கழிவு மேலாண்மை",
        welcome: "விவசாயிகள் விவசாயக் கழிவுகளை திறம்பட நிர்வகிக்க உதவுதல்.",
        track: "கழிவு கண்காணிப்பு அமைப்பு",
        upload: "புகைப்படங்களை பதிவேற்றம் செய்யவும்",
        resources: "கல்வி வளங்கள்",
        contact: "தொடர்பு கொள்ளுங்கள்",
        email: "மின்னஞ்சல்: support@farmwaste.com"
    },
    te: {
        title: "వ్యవసాయ వ్యర్థాల నిర్వహణ",
        welcome: "వ్యవసాయ వ్యర్థాలను సమర్థవంతంగా నిర్వహించడానికి రైతులకు సహాయపడటం.",
        track: "వ్యర్థాల ట్రాకింగ్ వ్యవస్థ",
        upload: "ఫోటోలను అప్‌లోడ్ చేయండి",
        resources: "విద్యా వనరులు",
        contact: "మా‌ను సంప్రదించండి",
        email: "ఇమెయిల్: support@farmwaste.com"
    },
    gu: {
        title: "ખેત વેસ્ટ મેનેજમેન્ટ",
        welcome: "ખેડૂતોએ ખેતી વેસ્ટનું અસરકારક રીતે મેનેજમેન્ટ કરવા માટે સહાય કરવી.",
        track: "વેસ્ટ ટ્રેકિંગ સિસ્ટમ",
        upload: "ફોટા અપલોડ કરો",
        resources: "શૈક્ષણિક સંસાધનો",
        contact: "અમારો સંપર્ક કરો",
        email: "ઈમેલ: support@farmwaste.com"
    }
};

// Function to change language
function changeLanguage() {
    let lang = document.getElementById("languageSelect").value;
    localStorage.setItem("selectedLang", lang); // Save preference

    document.getElementById("siteTitle").innerText = translations[lang].title;
    document.getElementById("welcomeText").innerText = translations[lang].welcome;
    document.getElementById("trackText").innerText = translations[lang].track;
    document.getElementById("uploadText").innerText = translations[lang].upload;
    document.getElementById("resourcesText").innerText = translations[lang].resources;
    document.getElementById("contactText").innerText = translations[lang].contact;
    document.getElementById("emailText").innerText = translations[lang].email;
}

// Load saved language on page load
window.onload = function() {
    let savedLang = localStorage.getItem("selectedLang") || "en";
    document.getElementById("languageSelect").value = savedLang;
    changeLanguage();
};
document.addEventListener("DOMContentLoaded", function () {
    displayWasteListings();

    function displayWasteListings() {
        let wasteList = JSON.parse(localStorage.getItem("wasteData")) || [];
        let wasteListContainer = document.getElementById("wasteList");

        if (wasteListContainer) {
            wasteListContainer.innerHTML = "";
            wasteList.forEach((waste, index) => {
                let listItem = document.createElement("li");
                listItem.innerHTML = `<strong>${waste.name}</strong> - ${waste.quantity} kg | Contact: ${waste.contact} 
                    <button onclick="buyWaste(${index})">Buy</button>`;
                wasteListContainer.appendChild(listItem);
            });
        }
    }

    window.buyWaste = function (index) {
        let wasteList = JSON.parse(localStorage.getItem("wasteData")) || [];
        alert(`Contact Farmer: ${wasteList[index].contact}`);
    };
});
