document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('passwordInput');
    const eyeIcon = document.getElementById('eyeIcon');
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');

    // Toggle Password Visibility
    togglePasswordBtn.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            eyeIcon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            eyeIcon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });

    // Handle Form Submission
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const role = document.getElementById('roleInput').value;
        const studentID = document.getElementById('studentID').value;

        // Message sa console para sa testing
        console.log(`Logging in ID: ${studentID} as ${role}`);

        if (role === 'admin') {
            window.location.href = "admin.html"; 
        } else {
            // Siguraduhin na may index.html ka para sa student view
            window.location.href = "index.html"; 
        }
    });
});