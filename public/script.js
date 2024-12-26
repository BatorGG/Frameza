const baseURL = "https://frameza.onrender.com"
const fileUploadBox = document.getElementById('fileUploadBox');
const fileInput = document.getElementById('fileInput');
const fileNameSpan = document.getElementById('fileName');
const imagePreview = document.getElementById('imagePreview');
let selectedFile;



function handleFile(file) {
    if (file) {
        // Update selected file
        selectedFile = file;
        // Update file name display
        fileNameSpan.textContent = `Selected file: ${file.name}`;
        // Create a FileReader to read the file
        const reader = new FileReader();
        reader.onload = function (e) {
            // Set the image preview source to the file's data URL
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block'; // Ensure the image is displayed
            document.getElementById("removeFile").style.display = 'block';
        };
        reader.onerror = function () {
            console.error('Error reading file');
        };
        reader.readAsDataURL(file); // Read the file as a data URL
    } else {
        // Reset file name and hide preview if no file is selected
        fileNameSpan.textContent = 'No file chosen';
        imagePreview.style.display = 'none';
        imagePreview.src = '';
    }
}

// Function to upload the image
function uploadImage() {
    if (selectedFile) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const imageUri = e.target.result;
            fetch('/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ imageUri })
            })
                .then(response => response.json())
                .then(data => {
                    console.log('Success:', data);
                })
                .catch(error => {
                    console.error('Error:', error);
                });
        };
        reader.readAsDataURL(selectedFile);
    } else {
        alert('Please select an image first.');
    }
}

function getImageUri(selectedFile) {
    return new Promise((resolve, reject) => {
        if (!selectedFile) {
            resolve(null);
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const imageUri = e.target.result;
            resolve(imageUri);
        };

        reader.onerror = function (error) {
            reject(error);
        };

        reader.readAsDataURL(selectedFile);
    });
}


document.addEventListener('DOMContentLoaded', () => {

    try {
        dashboard();
    }
    catch (e) {
        console.log(e)
    }

    try {
        credits();
    }
    catch (e) {
        console.log(e)
    }
   
    document.getElementsByClassName("logo")[0].addEventListener('click', () => {
        window.location.href = baseURL;
    });

    if (window.location.pathname == "/privacy" || window.location.pathname == "/tos") {
        const div = document.querySelector('#content');
        const text = div.textContent;
        div.innerHTML = text.replace(/\n/g, '<br>');
    }
    
});



//Login system
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

const loginBtn = document.getElementById("login");
if (loginBtn) {
  loginBtn.addEventListener('click', () => {

    loginBtn.innerText = "Please wait..."
  
    const email = document.getElementById("username").value;
    const password = document.getElementById("password").value;

  
    fetch(baseURL + '/login', {
      method: 'POST',
      body: JSON.stringify({ 
        email: email,
        password: password
      }),
      headers: { 'Content-Type': 'application/json' }
    }).then(response => response.json())
      .then((data) => {
        console.log('Success:', data)

          if (data.success) {
            const token = data.token;
            // Store the token in chrome.storage
            localStorage.setItem('jwt', token);
            window.location.href = baseURL + "/dashboard";
          }
          else {
            document.getElementById("error-message").innerText = data.message;
            loginBtn.innerText = "Login"
          }
          
      })
      .catch((error) => {
        document.getElementById("error-message").innerText = "Login error";
        loginBtn.innerText = "Login"
        console.error('Error:', error)
      });
  
});
} 

const registerBtn = document.getElementById("register");
if (registerBtn) {
  registerBtn.addEventListener('click', () => {

    const email = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const passwordAgain = document.getElementById("passwordAgain").value;
    const errorMessage = document.getElementById("error-message")

    if (!validateEmail(email)) {
      errorMessage.innerText = "Invalid email address"
    }
    else if (password.length < 5) {
      errorMessage.innerText = "Password too short"
    }
    else if (password != passwordAgain) {
      errorMessage.innerText = "Passwords must match"
    }
    else {

      registerBtn.innerText = "Please wait..."
  
      fetch(baseURL + "/register", {
        method: 'POST',
        body: JSON.stringify({ 
          email: email,
          password: password
        }),
        headers: { 'Content-Type': 'application/json' }
      }).then(response => response.json())
        .then((data) => {
          console.log('Success:', data)
            
            if (data.success) {
              // Store the token in chrome.storage
              const token = data.token;
              localStorage.setItem('jwt', token);
              window.location.href = baseURL + "/dashboard";
            }
            else {
              errorMessage.innerText = data.message;
              registerBtn.innerText = "Register"
            }
            
        })
        .catch((error) => {
          errorMessage.innerText = data.message;
          registerBtn.innerText = "Register";
          console.error('Error:', error);
        });
    }
  
  });
  
}


//Dashboard
function decodeJWT(token) {
    if (!token) return null;
    const payloadBase64 = token.split('.')[1];
    const decodedPayload = JSON.parse(atob(payloadBase64)); // Decodes the token
    return decodedPayload;
}

function dashboard() {
    console.log("Dashboard ran")
    const creditDisplay = document.getElementById("credits");
    if (window.location.pathname != "/dashboard") {
        return
    }

    const token = localStorage.getItem('jwt');
    const decodedToken = decodeJWT(token);

    if (!decodedToken) {
        window.location.href = baseURL
        return
    }

    const credits = decodedToken.credits

    creditDisplay.innerText = credits + " Credits"

    creditDisplay.addEventListener('click', () => {
        window.location.href = baseURL + "/credits";
    });
    
    const taskId = localStorage.getItem("taskId");
    if (taskId) {
        checkForVideo(taskId);
    }


    document.getElementById("logout").addEventListener('click', () => {
        localStorage.removeItem("jwt");
        window.location.href = baseURL;
    })

    const starterBtn = document.getElementById('starterBtn');
    const proBtn = document.getElementById('proBtn');

    starterBtn.addEventListener('click', () => {
        starterBtn.classList.add('active');
        proBtn.classList.remove('active');
        document.getElementById("creditCost").innerText = "Cost: 1 Credit"
    });

    proBtn.addEventListener('click', () => {
        proBtn.classList.add('active');
        starterBtn.classList.remove('active');
        document.getElementById("creditCost").innerText = "Cost: 10 Credits"
    });


    const textarea = document.getElementById('auto-resize');

    textarea.addEventListener('input', function () {
        // Reset the height to auto to shrink the textarea if text is deleted
        textarea.style.height = 'auto';

        // Calculate the new height based on the scrollHeight property
        const newHeight = Math.min(textarea.scrollHeight, parseInt(getComputedStyle(textarea).maxHeight));

        // Set the new height
        textarea.style.height = `${newHeight}px`;
    });


    document.getElementById("run").addEventListener('click', async () => {
        const tokenn = localStorage.getItem('jwt');
        console.log(tokenn)

        const activeElement = [starterBtn, proBtn].find(el => el.classList.contains('active'));
        console.log()
        const prompt = document.getElementById("auto-resize").value;
        const image = await getImageUri(selectedFile);

        fetch(baseURL + "/protected", {
            method: 'POST',
            body: JSON.stringify({ 
                token: tokenn,
                model: activeElement.id,
                prompt,
                image

            }),
            headers: { 'Content-Type': 'application/json' }
          }).then(response => response.json())
            .then((data) => {
                console.log('Success:', data)
                if (data.success) {
                    document.getElementById("errorText").innerText = "Video generation has started, this might take up to 10 minutes.";

                    localStorage.setItem("jwt", data.token)
                    const newDecodedToken = decodeJWT(data.token);
                    creditDisplay.innerText = newDecodedToken.credits + " Credits"

                    const taskId = data.taskId;
                    localStorage.setItem("taskId", taskId)

                    checkForVideo(taskId);

                }
                else {
                    document.getElementById("errorText").innerText = data.error;
                }
                
                
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    });

    fileUploadBox.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileUploadBox.addEventListener('dragover', (event) => {
        event.preventDefault();
        fileUploadBox.classList.add('dragover');
    });
    
    fileUploadBox.addEventListener('dragleave', () => {
        fileUploadBox.classList.remove('dragover');
    });
    
    fileUploadBox.addEventListener('drop', (event) => {
        event.preventDefault();
        fileUploadBox.classList.remove('dragover');
        const file = event.dataTransfer.files[0];
        handleFile(file);
    });
    
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        handleFile(file);
    });

    const removeFile = document.getElementById("removeFile");
    removeFile.addEventListener('click', (event) => {
        event.stopPropagation()
        selectedFile = null;
        handleFile(null);
        removeFile.style.display = 'none';

    });
}

function checkForVideo(taskId) {
    document.getElementById("errorText").innerText = "Checking for video status."

    const interval = setInterval(async () => {
        const statusResponse = await fetch(`/task-status/${taskId}`);
        const task = await statusResponse.json();
        document.getElementById("errorText").innerText = "Video still generating, this might take up to 10 minutes."

        if (task.status === "done") {
            clearInterval(interval);

            // Get video
            const videoResponse = await fetch(`/get-video/${taskId}`);
            const videoBlob = await videoResponse.blob();
            const videoUrl = URL.createObjectURL(videoBlob);

            const videoElement = document.getElementById("generatedVideo");
            videoElement.src = videoUrl;
            videoElement.style.display = "block";
            document.getElementById("errorText").innerText = ""

            localStorage.removeItem("taskId")
        } else if (task.status === "failed") {
            clearInterval(interval);
            console.error("Video generation failed:", task.error);
            document.getElementById("errorText").innerText = "Video generation failed."
            localStorage.removeItem("taskId")
        }
    }, 5000); // Poll every 5 seconds   
}

function goToLogin() {
    const token = localStorage.getItem('jwt');
    const decodedToken = decodeJWT(token);
  
    if (decodedToken && decodedToken.exp * 1000 > Date.now()) {
      window.location.href = baseURL + "/dashboard";
    }
    else {
      window.location.href = baseURL + "/login";
    }
    
}

function goToRegister() {
    window.location.href = baseURL + "/register";
}

function credits() {

    const token = localStorage.getItem('jwt');
    const decodedToken = decodeJWT(token);

    if (window.location.pathname != "/credits") {
        return
    }

    if (!decodedToken) {
        window.location.href = baseURL
        return
    }

    const credits = decodedToken.credits

    const creditDisplay = document.getElementById("credits");
    creditDisplay.innerText = credits + " Credits"

    document.getElementById("button1").addEventListener('click', () => {
        checkout(50);
        
    })
    document.getElementById("button2").addEventListener('click', () => {
        checkout(100);
        
    })
    document.getElementById("button3").addEventListener('click', () => {
        checkout(200);
        
    })

    document.getElementById("goBack").addEventListener('click', () => {
        window.location.href = baseURL + "/dashboard";
    });

    

    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId) {
    fetch(baseURL + `/checkout-session/${sessionId}`)
        .then(response => response.json())
        .then(data => {
        if (data.success) {
            console.log('Payment successful!');
            // Update UI or credit the user's account
            localStorage.setItem("jwt", data.jwt)
            const decodedToken = decodeJWT(data.jwt)
            document.getElementById("credits").innerText = decodedToken.credits + " Credits"
            window.history.replaceState(null, '', window.location.pathname);
        } else {
            console.error('Payment not completed.');
        }
        })
        .catch(error => console.error('Error fetching session:', error));
    }
}

function checkout(credits) {
    const token = localStorage.getItem("jwt")

    if (!token) {
        return
    }

    const decodedToken = decodeJWT(token)
    const email = decodedToken.email;
    console.log(email)

    fetch(baseURL + '/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
            email: email,
            credits: credits
        }),
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => response.json())
        .then(session => {
            // Redirect to Stripe Checkout
            window.location.href = session.url
        })
        .catch(error => console.error('Error:', error));
}
