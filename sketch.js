// sketch.js
let nameInput, cohortSelect, countInput, submitButton;
let state = 'register';
let userName = '', cohort = '', cohortSize = 0;
let currentRound = 1;
let currentPrompt = '';
let answerInput, answerSubmit;
let db;
let totalRounds = 5;
let screenDiv;

let roundData = [
  {
    question: "If [Student Name] were the admissions director at an elite university facing the 2026 enrollment cliff, what would be their most controversial policy to attract students?",
    concepts: ["Enrollment cliff", "Elite vs. open-access colleges", "Financial pressures"]
  },
  {
    question: "If [Student Name] had to design a completely new way to measure 'merit' for college admissions (no SATs allowed), what would be their wildest but brilliant idea?",
    concepts: ["Standardized testing", "Merit as a construct", "Alternative assessments"]
  },
  {
    question: "If [Student Name] discovered their university was secretly giving 'merit aid' to rich students, what would be their most creative way to expose this as 'affirmative action for the wealthy'?",
    concepts: ["Merit vs. need aid", "Hidden subsidies", "Privilege"]
  },
  {
    question: "If [Student Name] had to solve college inequality by choosing 1 of these definitions of fairness, which one would be picked ? There are different philosophical ideas around fairness applicable to university admissions. Libertarian believe that the market should decide access to education, with minimal government involvement. Utilitarian supporting policies that produce the greatest overall benefit for society, even if not everyone is treated the same. Kantian treating everyone equally regardless of the outcome Aristotle focused on building good character and virtues, moral growth through education. ",
    concepts: ["Justice theories", "Fairness approaches"]
  },
  {
    question: "If [Student Name] became the Education Secretary and could only pass ONE law to fix higher education inequality, what would be their most dramatic but practical reform?",
    concepts: ["Reforms", "Funding", "Policy"]
  }
];

function setup() {
  noCanvas();
  screenDiv = createDiv('').id('app').style('padding', '20px').style('max-width', '500px').style('margin', 'auto');
  applyStyles();
  firebase.initializeApp({
    apiKey: "AIzaSyAyS0F6m9XkB-wC59GeupVAAa0ZHBxLvXc",
    authDomain: "trial-f2fc8.firebaseapp.com",
    projectId: "trial-f2fc8"
  });
  db = firebase.firestore();
  renderRegistrationScreen();
}

function applyStyles() {
  let style = createElement('style', `
    h2 { font-size: 1.5rem; text-align: center; }
    input, select, textarea, button {
      display: block;
      width: 100%;
      margin: 10px 0;
      padding: 10px;
      border-radius: 10px;
      border: 1px solid #ccc;
      font-size: 1rem;
    }
    button {
      background-color: #2ecc71;
      color: white;
      font-weight: bold;
      cursor: pointer;
      transition: 0.3s;
    }
    button:hover {
      background-color: #27ae60;
    }
    .vote-button {
      background-color: #3498db;
    }
    .vote-button:hover {
      background-color: #2980b9;
    }
    p { text-align: center; font-size: 1rem; }
  `);
  document.head.appendChild(style.elt);
}

function renderRegistrationScreen() {
  screenDiv.html('');
  createElement('h2', 'Register for Cohort Quiz').parent(screenDiv);
  cohortSelect = createSelect().parent(screenDiv);
  cohortSelect.option('Maria');
  cohortSelect.option('Yash');
  cohortSelect.option('Belema');
  nameInput = createInput('').attribute('placeholder', 'Enter your name').parent(screenDiv);
  countInput = createInput('').attribute('placeholder', 'Total cohort size').attribute('type', 'number').parent(screenDiv);
  submitButton = createButton('Join').parent(screenDiv);
  submitButton.mousePressed(registerUser);
}

async function registerUser() {
  cohort = cohortSelect.value();
  userName = nameInput.value();
  cohortSize = int(countInput.value());
  if (!cohort || !userName || cohortSize <= 0) {
    alert('Please fill all fields correctly');
    return;
  }
  await db.collection('registrations').add({
    name: userName,
    cohort: cohort,
    roundUsed: false,
    timestamp: new Date()
  });
  waitForCohort();
}

function waitForCohort() {
  screenDiv.html(`<h2>Welcome ${userName}!</h2><p>Waiting for all ${cohortSize} members of cohort <strong>${cohort}</strong>...</p>`);
  let interval = setInterval(async () => {
    let snap = await db.collection('registrations').where('cohort', '==', cohort).get();
    if (snap.size >= cohortSize) {
      clearInterval(interval);
      nextRound();
    }
  }, 3000);
}



// async function nextRound() {
//   screenDiv.html('');
//   if (currentRound > totalRounds) {
//     screenDiv.html('<h2>🎉 Quiz complete! Thank you for playing.</h2>');
//     return;
//   }

//   let promptRef = db.collection('prompts').doc(`${cohort}_round${currentRound}`);
//   let doc = await promptRef.get();

//   if (!doc.exists) {
//     // First user to generate the prompt
//     let studentName = await selectUnusedName();
//     currentPrompt = roundData[currentRound - 1].question.replace('[Student Name]', studentName);
//     await promptRef.set({
//       cohort,
//       round: currentRound,
//       prompt: currentPrompt,
//       timestamp: new Date()
//     });
//   } else {
//     currentPrompt = doc.data().prompt;
//   }

//   createElement('h2', `Round ${currentRound}`).parent(screenDiv);
//   createP(currentPrompt).parent(screenDiv);
//   answerInput = createInput('').attribute('placeholder', 'Type your answer').parent(screenDiv);
//   answerSubmit = createButton('Submit Answer').parent(screenDiv);
//   answerSubmit.mousePressed(() => submitAnswer());
// }

async function nextRound() {
  screenDiv.html('');
  if (currentRound > totalRounds) {
    screenDiv.html('<h2>🎉 Quiz complete! Thank you for playing.</h2>');
    return;
  }

  const promptRef = db.collection('prompts').doc(`${cohort}_round${currentRound}`);
  const promptDoc = await promptRef.get();

  if (!promptDoc.exists) {
    // Only first user will enter this block and run the transaction
    try {
      await db.runTransaction(async (transaction) => {
        // Re-check inside transaction
        const freshPromptDoc = await transaction.get(promptRef);
        if (freshPromptDoc.exists) return; // someone beat us

        // Get unused name
        const regSnap = await db.collection('registrations')
          .where('cohort', '==', cohort)
          .where('roundUsed', '==', false)
          .limit(1)
          .get();

        if (regSnap.empty) {
          throw new Error('No unused names available.');
        }

        const doc = regSnap.docs[0];
        const studentName = doc.data().name;

        // Mark student as used
        transaction.update(doc.ref, { roundUsed: true });

        // Write prompt to promptRef
        const promptText = roundData[currentRound - 1].question.replace('[Student Name]', studentName);
        transaction.set(promptRef, {
          cohort,
          round: currentRound,
          prompt: promptText,
          studentName,
          timestamp: new Date()
        });

        currentPrompt = promptText;
      });
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  }

  // Fetch the final prompt (whether we wrote it or someone else did)
  const finalPromptDoc = await promptRef.get();
  currentPrompt = finalPromptDoc.data().prompt;

  createElement('h2', `Round ${currentRound}`).parent(screenDiv);
  createP(currentPrompt).parent(screenDiv);
  answerInput = createInput('').attribute('placeholder', 'Type your answer').parent(screenDiv);
  answerSubmit = createButton('Submit Answer').parent(screenDiv);
  answerSubmit.mousePressed(() => submitAnswer());
}



async function selectUnusedName() {
  let query = await db.collection('registrations')
    .where('cohort', '==', cohort)
    .where('roundUsed', '==', false).limit(1).get();
  if (query.empty) return userName;
  let doc = query.docs[0];
  await db.collection('registrations').doc(doc.id).update({ roundUsed: true });
  return doc.data().name;
}

// async function submitAnswer(studentName) {
//   let answer = answerInput.value().trim();
//   if (!answer) return alert('Please enter an answer.');
//   await db.collection('answers').add({
//     answer,
//     author: userName,
//     round: currentRound,
//     cohort,
//     prompt: currentPrompt,
//     timestamp: new Date()
//   });
//   screenDiv.html('<p>✅ Answer submitted! Waiting for others...</p>');
//   let interval = setInterval(async () => {
//     let snapshot = await db.collection('answers')
//       .where('cohort', '==', cohort)
//       .where('round', '==', currentRound)
//       .get();
//     if (snapshot.size >= cohortSize) {
//       clearInterval(interval);
//       showVotingScreen(snapshot);
//     }
//   }, 3000);
// }

async function submitAnswer() {
  let answer = answerInput.value().trim();
  if (!answer) return alert('Please enter an answer.');
  await db.collection('answers').add({
    answer,
    author: userName,
    round: currentRound,
    cohort,
    prompt: currentPrompt,
    timestamp: new Date()
  });
  screenDiv.html('<p>✅ Answer submitted! Waiting for others...</p>');

  let interval = setInterval(async () => {
    let snapshot = await db.collection('answers')
      .where('cohort', '==', cohort)
      .where('round', '==', currentRound)
      .get();
    if (snapshot.size >= cohortSize) {
      clearInterval(interval);
      showVotingScreen(snapshot);
    }
  }, 3000);
}



function showVotingScreen(snapshot) {
  screenDiv.html(`<h2>Vote - Round ${currentRound}</h2><p>Tap your favorite answer:</p>`);
  snapshot.forEach(doc => {
    let ans = doc.data();
    let btn = createButton(ans.answer).class('vote-button').parent(screenDiv);
    btn.mousePressed(() => submitVote(doc.id));
  });
}

async function submitVote(answerId) {
  await db.collection('votes').add({
    voter: userName,
    cohort,
    round: currentRound,
    answerId,
    timestamp: new Date()
  });
  screenDiv.html('<p>✅ Vote submitted! Waiting for results...</p>');
  let interval = setInterval(async () => {
    let snapshot = await db.collection('votes')
      .where('cohort', '==', cohort)
      .where('round', '==', currentRound)
      .get();
    if (snapshot.size >= cohortSize) {
      clearInterval(interval);
      showResults();
    }
  }, 3000);
}



// async function showResults() {
//   let votes = await db.collection('votes')
//     .where('cohort', '==', cohort)
//     .where('round', '==', currentRound)
//     .get();

//   let tally = {};
//   votes.forEach(v => {
//     let aId = v.data().answerId;
//     tally[aId] = (tally[aId] || 0) + 1;
//   });

//   let maxVotes = Math.max(...Object.values(tally));
//   let winningIds = Object.keys(tally).filter(id => tally[id] === maxVotes);

//   screenDiv.html(`<h2>🏆 Winner(s) - Round ${currentRound}</h2>`);
//   for (let id of winningIds) {
//     let answerDoc = await db.collection('answers').doc(id).get();
//     let data = answerDoc.data();
//     screenDiv.child(createP(`<strong>Answer:</strong> ${data.answer}`));
//     screenDiv.child(createP(`<strong>By:</strong> ${data.author}`));
//   }

//   currentRound++;
//   setTimeout(() => nextRound(), 8000);
// }

async function showResults() {
  let votes = await db.collection('votes')
    .where('cohort', '==', cohort)
    .where('round', '==', currentRound)
    .get();

  let tally = {};
  votes.forEach(v => {
    let aId = v.data().answerId;
    tally[aId] = (tally[aId] || 0) + 1;
  });

  let maxVotes = Math.max(...Object.values(tally));
  let winningIds = Object.keys(tally).filter(id => tally[id] === maxVotes);

  screenDiv.html(`<h2>🏆 Winner(s) - Round ${currentRound}</h2>`);

  let winnerDocs = await Promise.all(
    winningIds.map(id => db.collection('answers').doc(id).get())
  );

  for (let doc of winnerDocs) {
    let data = doc.data();
    screenDiv.child(createP(`<strong>Answer:</strong> ${data.answer}`));
    screenDiv.child(createP(`<strong>By:</strong> ${data.author}`));
  }

  currentRound++;
  setTimeout(() => nextRound(), 8000);
}
