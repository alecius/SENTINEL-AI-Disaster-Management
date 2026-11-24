
// ==========================================
// SENTINEL - AI DISASTER COMMAND CENTRE
// ==========================================

let gps = {
    text: null,
    image: null
};

let map;
let markers;
let typeChart;
let severityChart;

let selectedImageURL = null;


// ==========================================
// HELPER FUNCTIONS
// ==========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function formatConfidence(value) {
    const number = Number(value);

    return Number.isFinite(number)
        ? Math.max(0, Math.min(100, number))
        : 0;
}


// ==========================================
// MAP
// ==========================================

function initMap() {

    if (!window.L) {
        document.getElementById("map").textContent =
            "Map unavailable. Check internet connection.";
        return;
    }

    map = L.map("map").setView([22.5, 79], 4);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "OpenStreetMap"
        }
    ).addTo(map);

    markers = L.layerGroup().addTo(map);
}


// ==========================================
// IMAGE PREVIEW
// ==========================================

document.getElementById("imageFile").addEventListener(
    "change",
    function(event) {

        const file = event.target.files[0];

        const preview = document.getElementById(
            "imagePreviewBox"
        );

        if (!file) return;

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            alert("Please upload JPG, PNG or WEBP.");
            event.target.value = "";
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            alert("Image must be smaller than 8 MB.");
            event.target.value = "";
            return;
        }

        if (selectedImageURL) {
            URL.revokeObjectURL(selectedImageURL);
        }

        selectedImageURL = URL.createObjectURL(file);

        preview.innerHTML = `
            <div class="preview-content">

                <img
                    src="${selectedImageURL}"
                    alt="Selected disaster image"
                >

                <div class="preview-details">

                    <b>${escapeHTML(file.name)}</b>

                    <span>
                        ${(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>

                </div>

                <span class="preview-status">
                    ✓ Image ready for AI analysis
                </span>

            </div>
        `;

        document.getElementById("imageResult").innerHTML = "";

        document.getElementById("imageReportSection")
            .classList.add("hidden");

    }
);


// ==========================================
// GPS LOCATION
// ==========================================

function getLocation(type) {

    if (!navigator.geolocation) {
        alert("GPS is not supported by this browser.");
        return;
    }

    const locationText = document.getElementById(
        type + "Location"
    );

    locationText.innerText = "Getting location...";

    navigator.geolocation.getCurrentPosition(

        position => {

            gps[type] = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };

            locationText.innerText =
                gps[type].latitude.toFixed(5) + ", " +
                gps[type].longitude.toFixed(5);

        },

        () => {

            locationText.innerText = "Location unavailable";

            alert("Location permission denied or unavailable.");

        },

        {
            enableHighAccuracy: true,
            timeout: 10000
        }

    );

}


// ==========================================
// TEXT RESULT
// ==========================================

function showResult(id, data) {

    const result = document.getElementById(id);

    const recommendations = data.recommendations || [];

    result.innerHTML = `

        <div class="result-card">

            <span class="report-label">
                AI ANALYSIS COMPLETE
            </span>

            <h3>Disaster Detection Result</h3>

            <div class="detection-box">

                <small>DETECTED CATEGORY</small>

                <h2>${escapeHTML(data.disaster_type)}</h2>

            </div>

            <div class="report-info-grid">

                <div>
                    <small>Severity</small>
                    <b>${escapeHTML(data.severity)}</b>
                </div>

                <div>
                    <small>Confidence</small>
                    <b>${formatConfidence(data.confidence)}%</b>
                </div>

                <div>
                    <small>Detection Source</small>
                    <b>${escapeHTML(data.source || "Text Analysis")}</b>
                </div>

            </div>

            <h3>Emergency Recommendations</h3>

            <ul>

                ${recommendations.map(item =>
                    `<li>${escapeHTML(item)}</li>`
                ).join("")}

            </ul>

            <small>
                AI-generated guidance. Human verification required.
            </small>

        </div>

    `;

}


// ==========================================
// TEXT ANALYSIS
// ==========================================

async function analyseText() {

    const text = document.getElementById(
        "reportText"
    ).value.trim();

    if (text.length < 5) {
        alert("Enter a disaster report.");
        return;
    }

    try {

        const response = await fetch(
            "/api/predict-text",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    text: text,

                    latitude: gps.text?.latitude ?? null,

                    longitude: gps.text?.longitude ?? null

                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert(data.detail || "Prediction failed.");
            return;
        }

        showResult("textResult", data);

        await refreshAll();

    } catch (error) {

        console.error(error);

        alert("Server connection failed.");

    }

}


// ==========================================
// IMAGE ANALYSIS
// ==========================================

async function analyseImage() {

    const file = document.getElementById(
        "imageFile"
    ).files[0];

    if (!file) {
        alert("Please select an image first.");
        return;
    }

    const button = document.getElementById(
        "analyseImageButton"
    );

    button.disabled = true;

    button.innerText = "⏳ AI analysing image...";

    const resultBox = document.getElementById(
        "imageResult"
    );

    resultBox.innerHTML = `

        <div class="result-card">

            <h3>AI Image Processing</h3>

            <p>
                Loading CNN model and analysing image...
            </p>

            <p>Please wait.</p>

        </div>

    `;

    const formData = new FormData();

    formData.append("file", file);

    if (gps.image) {

        formData.append(
            "latitude",
            gps.image.latitude
        );

        formData.append(
            "longitude",
            gps.image.longitude
        );

    }

    try {

        const response = await fetch(
            "/api/predict-image",
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();

        if (!response.ok) {

            resultBox.innerHTML = "";

            alert(data.detail || "Image prediction failed.");

            return;
        }

        showResult("imageResult", data);

        createImageReport(file, data);

        await refreshAll();

    } catch (error) {

        console.error(error);

        resultBox.innerHTML = "";

        alert(
            "Image analysis failed. Check your FastAPI server."
        );

    } finally {

        button.disabled = false;

        button.innerText = "🔍 Analyse Disaster Image";

    }

}


// ==========================================
// DETAILED IMAGE REPORT
// ==========================================


function createImageReport(file, data) {

    const section = document.getElementById("imageReportSection");

    if (!section) {
        console.error("Image report section not found");
        return;
    }

    // Show report
    section.classList.remove("hidden");

    // Image preview
    const reportImage = document.getElementById("reportImage");

    if (reportImage) {
        reportImage.src = selectedImageURL || URL.createObjectURL(file);
    }

    document.getElementById("reportFilename").innerText = file.name;

    // AI detection
    document.getElementById("reportDisaster").innerText =
        data.disaster_type || "Unknown";

    document.getElementById("reportConfidence").innerText =
        formatConfidence(data.confidence) + "%";

    document.getElementById("reportSeverity").innerText =
        data.severity || "Needs review";

    document.getElementById("reportSource").innerText =
        data.source || "CNN IMAGE CLASSIFIER";

    // Confidence progress bar
    const confidence = formatConfidence(data.confidence);

    document.getElementById("confidenceBar").style.width =
        confidence + "%";

    // GPS
    const latitude = gps.image?.latitude;
    const longitude = gps.image?.longitude;

    document.getElementById("reportLatitude").innerText =
        latitude ?? "Not provided";

    document.getElementById("reportLongitude").innerText =
        longitude ?? "Not provided";

    const mapLink = document.getElementById("mapLink");

    if (latitude != null && longitude != null) {

        mapLink.href =
            `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}`;

        mapLink.innerText = "View incident location";

    } else {

        mapLink.removeAttribute("href");
        mapLink.innerText = "Location unavailable";

    }

    // Recommendations
    const recommendations = data.recommendations || [];

    document.getElementById("reportRecommendations").innerHTML =
        recommendations.length
            ? recommendations.map(item =>
                `<li>${escapeHTML(item)}</li>`
              ).join("")
            : "<li>Verify the report with local authorities.</li>";

    // Report information
    document.getElementById("reportId").innerText =
        data.report_id ?? "See saved reports";

    document.getElementById("reportDate").innerText =
        new Date().toLocaleString();

    // Display report
    section.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    console.log("SENTINEL report updated:", data);
}


// ==========================================
// DOWNLOAD IMAGE REPORT
// ==========================================

function downloadImageReport() {

    const report = document.getElementById(
        "imageReportSection"
    );

    if (report.classList.contains("hidden")) {
        alert("Analyse an image first.");
        return;
    }

    window.print();

}


// ==========================================
// LOAD REPORT HISTORY
// ==========================================

async function loadReports() {

    const response = await fetch("/api/reports");

    if (!response.ok) {
        throw new Error("Could not load reports.");
    }

    const data = await response.json();

    const table = document.getElementById("reportRows");

    table.innerHTML = data.map(report => `

        <tr>

            <td>${escapeHTML(report.id)}</td>

            <td>${escapeHTML(report.disaster_type)}</td>

            <td>${escapeHTML(report.severity)}</td>

            <td>${escapeHTML(report.source)}</td>

            <td>${formatConfidence(report.confidence)}%</td>

            <td>
                ${
                    report.latitude == null
                    ? "Not provided"
                    : `${Number(report.latitude).toFixed(3)},
                       ${Number(report.longitude).toFixed(3)}`
                }
            </td>

            <td>
                ${
                    report.created_at
                    ? new Date(report.created_at).toLocaleString()
                    : "—"
                }
            </td>

        </tr>

    `).join("");


    // MAP MARKERS

    if (!markers || !window.L) return;

    markers.clearLayers();

    data.forEach(report => {

        if (
            report.latitude != null &&
            report.longitude != null
        ) {

            let color = "#57c7a4";

            if (report.severity === "Critical") {
                color = "#ff6474";
            }

            else if (report.severity === "High") {
                color = "#f5a14c";
            }

            else if (report.severity === "Medium") {
                color = "#f5d45b";
            }

            L.circleMarker(

                [
                    report.latitude,
                    report.longitude
                ],

                {
                    radius: 8,
                    color: color,
                    fillOpacity: 0.8
                }

            ).bindPopup(

                `${escapeHTML(report.disaster_type)} - ${escapeHTML(report.severity)}`

            ).addTo(markers);

        }

    });

}


// ==========================================
// STATISTICS AND CHARTS
// ==========================================

async function loadStats() {

    const response = await fetch("/api/stats");

    if (!response.ok) {
        throw new Error("Could not load statistics.");
    }

    const data = await response.json();

    document.getElementById("total").innerText =
        data.total;

    document.getElementById("critical").innerText =
        data.severities.Critical;

    document.getElementById("mapped").innerText =
        data.mapped;

    document.getElementById("types").innerText =
        Object.values(data.types).filter(x => x > 0).length;


    if (typeChart) typeChart.destroy();

    if (severityChart) severityChart.destroy();


    // DISASTER TYPE CHART

    typeChart = new Chart(

        document.getElementById("typeChart"),

        {

            type: "bar",

            data: {

                labels: Object.keys(data.types),

                datasets: [{

                    label: "Disaster Reports",

                    data: Object.values(data.types),

                    backgroundColor: [
                        "#48c6d9",
                        "#ff6474",
                        "#9b8cff",
                        "#f5b94c",
                        "#57c7a4"
                    ]

                }]

            },

            options: {

                responsive: true,

                plugins: {

                    legend: {
                        labels: {
                            color: "#ffffff"
                        }
                    }

                }

            }

        }

    );


    // SEVERITY CHART

    severityChart = new Chart(

        document.getElementById("severityChart"),

        {

            type: "doughnut",

            data: {

                labels: Object.keys(data.severities),

                datasets: [{

                    data: Object.values(data.severities),

                    backgroundColor: [
                        "#ff6474",
                        "#f5a14c",
                        "#f5d45b",
                        "#57c7a4",
                        "#8393a8"
                    ]

                }]

            },

            options: {

                responsive: true,

                plugins: {

                    legend: {

                        labels: {
                            color: "#ffffff"
                        }

                    }

                }

            }

        }

    );

}


// ==========================================
// RESOURCE MANAGEMENT
// ==========================================

async function loadResources() {

    const response = await fetch("/api/resources");

    if (!response.ok) {
        throw new Error("Could not load resources.");
    }

    const data = await response.json();

    document.getElementById("resourcesList").innerHTML =

        data.map(resource => `

            <p>

                <b>${escapeHTML(resource.name)}</b>

                : ${resource.available}/${resource.total}

            </p>

        `).join("");

}


// ==========================================
// REFRESH DASHBOARD
// ==========================================

async function refreshAll() {

    try {

        await Promise.all([

            loadReports(),

            loadStats(),

            loadResources()

        ]);

    } catch (error) {

        console.error("Dashboard refresh error:", error);

    }

}


// ==========================================
// START APPLICATION
// ==========================================

initMap();

refreshAll();
