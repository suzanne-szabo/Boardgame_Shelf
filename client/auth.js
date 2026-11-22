const API_URL = "http://localhost:8080";

const registerForm = document.getElementById("register-form");
const registerMessage = document.getElementById("register-message");

const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");

const loginSection = document.getElementById("login-section");
const registerSection = document.getElementById("register-section");

function showRegister() {
    loginSection.classList.add("hidden");
    registerSection.classList.remove("hidden");
    registerMessage.textContent = "";
    document.getElementById("register-first-name").focus();
}

function showLogin() {
    registerSection.classList.add("hidden");
    loginSection.classList.remove("hidden");
    document.getElementById("login-email").focus();
}

document.getElementById("show-register-btn").addEventListener("click", showRegister);
document.getElementById("show-login-btn").addEventListener("click", showLogin);


async function startSession(credentials) {
    const response = await fetch(`${API_URL}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include"
    });
    return response.ok;
}

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = { first_name: document.getElementById("register-first-name").value.trim(),
        last_name: document.getElementById("register-last-name").value.trim(),
        email: document.getElementById("register-email").value.trim(),
        password: document.getElementById("register-password").value};

    try {
        const response = await fetch(`${API_URL}/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(user)
        });
        const result = await response.json();
        if (!response.ok) { registerMessage.textContent = result.error || "Something went wrong while registering."; return; }

        registerMessage.textContent = "Account created! Taking you to your shelf…";
        registerForm.reset();

        
        const loggedIn = await startSession({ email: user.email, password: user.password });
        if (loggedIn) {
            setTimeout(() => window.location.href = "gameshelf.html", 1200);
        } else {
            document.getElementById("login-email").value = user.email;
            showLogin();
            loginMessage.textContent = "Account created! Please log in.";
        }
    } catch(error) {
        console.error("Registration error:", error);
        registerMessage.textContent = "Unable to connect to the server .";
    }
    });

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const credentials = { email: document.getElementById("login-email").value.trim(),
        password: document.getElementById("login-password").value};
        loginMessage.textContent = "";
    try { 
        const response = await fetch(`${API_URL}/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
            credentials: "include"
        });
        if (response.status === 401) {loginMessage.textContent = "Unable to login. Please check your email and passord." +
            "If you don't have an account, please create one first."; return;}

        if (!response.ok) {
            loginMessage.textContent = "Something went wrong. Please try again.";
            return;
        }

        window.location.href = "gameshelf.html";

    } catch(error) {
        console.error("Login error:", error);
        loginMessage.textContent = "Unable to connect to the server.";
    }
});


async function checkSession() {
    try {const response = await fetch(`${API_URL}/sessions`, {
            credentials: "include"
        });

        if (response.ok) {
            window.location.replace("gameshelf.html");
        }
    } catch (error) {
        console.error("Session check failed:", error);
    }
}

checkSession();
