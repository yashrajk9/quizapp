// Initialize Firebase (your config pasted here)
const firebaseConfig = {
  apiKey: "AIzaSyAyS0F6m9XkB-wC59GeupVAAa0ZHBxLvXc",
  authDomain: "trial-f2fc8.firebaseapp.com",
  projectId: "trial-f2fc8",
  storageBucket: "trial-f2fc8.firebasestorage.app",
  messagingSenderId: "989475660062",
  appId: "1:989475660062:web:8b56e95fbe7e3aaa18290f"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let input, button, statusMsg;

function setup() {
  noCanvas();

  createP("Q1: What is 5 + 7?").style("font-size", "18px");

  input = createInput();
  input.position(100, 80);

  button = createButton("Submit");
  button.position(100, 120);
  button.mousePressed(submitAnswer);

  statusMsg = createP("").style("color", "green").position(100, 160);
}

function submitAnswer() {
  const answer = input.value().trim();
  if (answer === '') {
    statusMsg.html("❗ Please enter an answer.");
    return;
  }

  db.collection("quizAnswers").add({
    answer: answer,
    timestamp: new Date()
  }).then(() => {
    statusMsg.html("✅ Answer submitted!");
    input.value('');
  }).catch((error) => {
    statusMsg.html("❌ Error: " + error.message);
  });
}
