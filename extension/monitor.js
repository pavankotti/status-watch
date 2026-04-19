document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const targetUrl = params.get("target");
    // Grab the code, or default to the error string, or default to 500
    const statusCode = params.get("code") || params.get("error") || "500";

    if (targetUrl) document.getElementById("target-url").textContent = targetUrl;
    document.getElementById("status-code").textContent = statusCode;

    // Load saved email
    chrome.storage.local.get(["userContact"], (result) => {
        if (result.userContact) document.getElementById("contact").value = result.userContact;
    });

    document.getElementById("monitor-btn").addEventListener("click", async () => {
        const contact = document.getElementById("contact").value.trim();
        if (!contact) {
            alert("Please enter your email.");
            return;
        }

        chrome.storage.local.set({ userContact: contact });

        // Your specific worker endpoint
        const workerUrl = "https://status-watch-worker.status-watch.workers.dev/track";
        const btn = document.getElementById("monitor-btn");
        
        btn.textContent = "TRANSMITTING...";
        btn.disabled = true;

        try {
            const response = await fetch(workerUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: targetUrl, contact: contact })
            });

            if (!response.ok) throw new Error("Network response was not ok");

            document.getElementById("form-container").style.display = "none";
            document.getElementById("success-msg").style.display = "block";
        } catch (err) {
            console.error("Worker call failed:", err);
            btn.textContent = "FAILED. TRY AGAIN.";
            btn.disabled = false;
        }
    });
});