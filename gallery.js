const claimModal = new bootstrap.Modal(document.getElementById("claimModal"));
const openClaimBtn = document.getElementById("openClaimBtn");
const claimForm = document.getElementById("claimForm");


openClaimBtn.addEventListener("click", function () {
    claimModal.show();
});


claimForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = new FormData(claimForm);

    fetch("/submit-claim", {  
        method: "POST",
        body: formData
    })
    .finally(() => {
        
        claimForm.reset();
        claimModal.hide();
    });
});