  const imageInput = document.getElementById("imageInput");
  const imageError = document.getElementById("imageError");

  const MAX_SIZE = 1 * 1024 * 1024; // 2MB

  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];

    if (!file) return;

    // Size check
    if (file.size > MAX_SIZE) {
      imageError.textContent = "Image too large. Max size is 1MB.";
      imageError.classList.remove("d-none");
      imageInput.value = ""; // reset file input
    } else {
      imageError.textContent = "";
      imageError.classList.add("d-none");
    }
  });
