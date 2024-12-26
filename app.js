// Import required modules
require('dotenv').config();
const express = require('express');
const app = express();
const axios = require('axios');
const Replicate = require("replicate");
const { writeFile } = require("fs/promises");
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

const replicate = new Replicate({
  auth: process.env.Replicate, // Your API token
});

async function getVid() {
    const input = {
        prompt: "A woman with long brown hair and light skin smiles at another woman with long blonde hair. The woman with brown hair wears a black jacket and has a small, barely noticeable mole on her right cheek. The camera angle is a close-up, focused on the woman with brown hair's face. The lighting is warm and natural, likely from the setting sun, casting a soft glow on the scene. The scene appears to be real-life footage.",
        aspect_ratio: "16:9",
        negative_prompt: "low quality, worst quality, deformed, distorted, watermark"
    };
    
    const output = await replicate.run("lightricks/ltx-video:c441c271f0cfd578aa0cd14a8488329dd10b796313a9335573a4a63507a976a5", { input });
    
    for (const [index, item] of Object.entries(output)) {
        await writeFile(`output_${index}.mp4`, item);
    }
}

//getVid()



app.post('/upload', (req, res) => {
    const { imageUri } = req.body;
    if (imageUri) {
        console.log('Received image URI:', imageUri);
        // Here you can process the image URI, e.g., save it to a database or file system

        res.json({ message: 'Image received successfully!' });
    } else {
        res.status(400).json({ error: 'No image URI provided' });
    }
});



//Login system
const mongoURI = process.env.mongoURI;
const mongoose = require('mongoose');

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Atlas connected'))
  .catch(err => console.error('MongoDB connection error:', err));
  
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  credits: { type: Number, default: 0 },
});

const User = mongoose.model('User', userSchema);

const SECRET_KEY = process.env.JWT;

// Route to register a new user
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  //console.log(req.body)
  //console.log(email, password);

  try {
    var user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    else {
      
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({ email: email, password: hashedPassword, credits: 5});
      await user.save();

      console.log(user);

      const token = jwt.sign({ email: user.email, credits: 5 }, SECRET_KEY, { expiresIn: '24h' });

      res.json({ success: true, message: 'User registered successfully', token });
    }
  }
  catch (error) {
    console.log("error occured");
    console.log(error);
    res.json({ success: false, message: 'Error registering user' });
  }
});

// Route to authenticate a user
app.post('/login', async (req, res) => {
  const { email, password } = req.body;


  try {
    const user = await User.findOne({ email });
    console.log(user);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    else {
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ success: false,  message: 'Wrong password' });
      }
      else {

        // Generate a JWT token
        const token = jwt.sign({ email: user.email, credits: user.credits }, SECRET_KEY, { expiresIn: '24h' });
        res.status(200).json({ success: true, token });
      }
    }
  }
  catch (error) {
    res.status(500).json({ success: false, message: 'Error logging in' });
  }

});

const tasks = {}

app.post('/protected', async (req, res) => {
    const token = req.body.token;
    const model = req.body.model;
    const prompt = req.body.prompt;
    const image = req.body.image;

    if (!token) {
        return res.status(401).json({ success: false, error: "Access denied. No token provided." });
    }

    try {
        // Verify the token
        const user = jwt.verify(token, SECRET_KEY);

        const userCredits = user.credits;
        //Lehet inkább igazi databasebol kell majd checkelni hogy ne lehessen csalni
        
        let creditCost;
        if (model == "starterBtn") {
            creditCost = 1;
        }
        if (model == "proBtn") {
            creditCost = 10;
        }

        if (userCredits < creditCost) {
            return res.json({
                success: false,
                error: "Not enough credits."
            });
        }
        
        const email = user.email;
        const newCredits = userCredits - creditCost;

        const updatedUser = await User.findOneAndUpdate(
            { email }, 
            { $set: { credits: newCredits } }, 
            { new: true }
        );

        console.log(updatedUser)

        const newToken = jwt.sign({ email: email, credits: updatedUser.credits }, SECRET_KEY, { expiresIn: '24h' });


        const taskId = Date.now().toString(); // Unique task ID

        tasks[taskId] = { status: "processing", result: null };

        res.json({
            success: true,
            token: newToken,
            taskId: taskId
        });

        (async () => {
            try {

                let input;
                if (image) {
                    if (model == "starterBtn") {
                        input = {prompt, image}
                    }
                    else {
                        input = {prompt, first_frame_image: image, aspect_ratio: "9:16"}
                    }
                    
                }
                else {
                    input = {prompt}
                }

                let modelNumber;
                if (model == "starterBtn") {
                    modelNumber = "lightricks/ltx-video:c441c271f0cfd578aa0cd14a8488329dd10b796313a9335573a4a63507a976a5";
                }
                if (model == "proBtn") {
                    modelNumber = "minimax/video-01";
                }

                

                const output = await replicate.run(
                    modelNumber,
                    { input }
                );

                // The output is a ReadableStream
                const videoStream = Array.isArray(output) ? output[0] : output;

                // Collect the stream data
                const chunks = [];
                const reader = videoStream.getReader();
                let done, value;

                while (true) {
                    ({ done, value } = await reader.read());
                    if (done) break;
                    chunks.push(value);
                }

                // Convert the chunks into a Buffer
                const videoBuffer = Buffer.concat(chunks);

                tasks[taskId] = { status: "done", result: videoBuffer };
            } catch (err) {
                tasks[taskId] = { status: "failed", error: err.message };
            }
        })();
        

    } catch (err) {
        console.log(err);
        res.status(403).json({ success: false, error: "Invalid or expired token." });
    }
});

app.get("/task-status/:taskId", (req, res) => {
    const { taskId } = req.params;

    if (!tasks[taskId]) {
        return res.status(404).json({ error: "Task not found" });
    }

    const task = tasks[taskId];
    res.json(task);
});

app.get("/get-video/:taskId", (req, res) => {
    const { taskId } = req.params;

    if (!tasks[taskId] || tasks[taskId].status !== "done") {
        return res.status(404).json({ error: "Video not ready" });
    }

    const videoBuffer = tasks[taskId].result;
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", videoBuffer.length); // Set content length for better handling
    res.send(videoBuffer);
});



//Stripe
const Stripe = require('stripe');
const stripe = Stripe(process.env.Stripe);

// Create Stripe Checkout session
app.post('/create-checkout-session', async (req, res) => {

    try {
        const email = req.body.email;
        const credits = req.body.credits;

        if (credits == 50) {
            priceId = "price_1QZWQBGVCkssEEUNZA8fWRbe";
        }
        else if (credits == 100) {
            priceId = "price_1Qa2akGVCkssEEUNHnaKC1hY";
        }
        else if (credits == 200) {
            priceId = "price_1Qa2bpGVCkssEEUNhi4yEUzD";
        }
        else {
            return res.status(400).json({ error: 'Invalid credits amount' });
        }


        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price: priceId, // The price ID from your Stripe Dashboard
                    quantity: 1,
                },
            ],
            success_url: `${req.headers.origin}/credits?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/credits`,
            customer_email: email
        });

        res.json({ url: session.url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const alreadyCredited = [];
app.get('/checkout-session/:id', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(req.params.id);

        console.log(session)

        if (session.payment_status === 'paid' && !alreadyCredited.includes(session.id) ) {
            let token;
            const email = session.customer_details.email;

            if (session.amount_subtotal == 699) {
                console.log("Credit 50")
                const user = await User.findOneAndUpdate(
                    { email: email },
                    { $inc: { credits: 50 } }, // Increment the credits by 50
                    { new: true } // Return the updated document
                  );

                token = jwt.sign({ email: email, credits: user.credits }, SECRET_KEY, { expiresIn: '24h' });
            }
            if (session.amount_subtotal == 9.99) {
                console.log("Credit 100")
                const user = await User.findOneAndUpdate(
                    { email: email },
                    { $inc: { credits: 100 } }, // Increment the credits by 50
                    { new: true } // Return the updated document
                  );
                token = jwt.sign({ email: email, credits: user.credits }, SECRET_KEY, { expiresIn: '24h' });
            }
            if (session.amount_subtotal == 1699) {
                console.log("Credit 200")
                const user = await User.findOneAndUpdate(
                    { email: email },
                    { $inc: { credits: 200 } }, // Increment the credits by 50
                    { new: true } // Return the updated document
                );
                token = jwt.sign({ email: email, credits: user.credits }, SECRET_KEY, { expiresIn: '24h' });
            }
            
            alreadyCredited.push(session.id)
            console.log(alreadyCredited)
            //Itt new jwt is kell
            return res.json({success: true, jwt: token})
        }
        else {
            console.log("already credited")
        }

        res.json({success: false});
    } catch (error) {
        console.error('Error retrieving session:', error);
        res.status(500).send('Internal Server Error');
    }
});



app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/credits', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'credits.html'));
});

app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/tos', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tos.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});