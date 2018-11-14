/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = 'Welcome to the Unofficial Pottermore Quiz! To get sorted into your Hogwarts house unofficially, say begin quiz.';
    CURRENT_STANDINGS = {
      "g": 0,
      "r": 0,
      "h": 0,
      "s": 0
    };
    CURRENT_INDEX = 0;

    handlerInput.attributesManager.setSessionAttributes(CURRENT_STANDINGS);

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Unofficial Pottermore Quiz', speechText)
      .addDirective({
        type: "Alexa.Presentation.APL.RenderDocument",
        document: require('./launchrequest.json'),
        datasources: {}
      })
      .getResponse();
  },
};

const QuizIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'QuizIntent'
      || handlerInput.requestEnvelope.request.type === 'Alexa.Presentation.APL.UserEvent';
  },
  handle(handlerInput) {
    let speechText = "";

    if (CURRENT_INDEX != 0) {
      let spokenAnswer = "";

      if (handlerInput.requestEnvelope.request.type === 'Alexa.Presentation.APL.UserEvent') {
        spokenAnswer = handlerInput.requestEnvelope.request.arguments[0];
      } else {
        const answerSlot = handlerInput.requestEnvelope.request.intent.slots.answer;

        if (answerSlot.resolutions) {
          spokenAnswer = answerSlot.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        } else {
          spokenAnswer = QUESTIONS_ANSWERS[CURRENT_INDEX - 1]["choices"][0];
        }
      }

      //Updates stats based upon question just answered
      const answerIndex = QUESTIONS_ANSWERS[CURRENT_INDEX - 1]["choices"].indexOf(spokenAnswer);
      const stats = QUESTIONS_ANSWERS[CURRENT_INDEX - 1]["stats"][answerIndex];
      updateStats.call(this, stats["g"], stats["r"], stats["h"], stats["s"]);
    }

    let question = "";
    let choices = [];

    let myDoc = {};
    let myData = {};

    if (CURRENT_INDEX < QUESTIONS_ANSWERS.length) {
      question = QUESTIONS_ANSWERS[CURRENT_INDEX]["question"];
      speechText += question + " Choose: ";

      let listChoicesIndex = 0;
      choices = QUESTIONS_ANSWERS[CURRENT_INDEX]["choices"];
      while (listChoicesIndex < choices.length) {
        speechText += choices[listChoicesIndex] + ", ";
        listChoicesIndex++;
      }

      myDoc = require('./questionintent.json');
      myData = {
        "quizData": {
          "type": "object",
          "properties": {
            "question": question,
            "choices": choices
          }
        }
      };

      CURRENT_INDEX++;
    } else {
      const resultInfo = getTotals.call(this);
      speechText += resultInfo.outputSpeech + ". You can retake the quiz by saying, begin quiz.";

      myDoc = require('./results.json');
      myData = {
        "quizData": {
          "type": "object",
          "properties": {
            "result": resultInfo.result,
            "outputSpeech": resultInfo.outputSpeech,
            "percentages": resultInfo.percentages
          }
        }
      };
      CURRENT_INDEX = 0;
    }

    handlerInput.attributesManager.setSessionAttributes(CURRENT_STANDINGS);

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Unofficial Pottermore Quiz', speechText)
      .addDirective({
        type: "Alexa.Presentation.APL.RenderDocument",
        token: 'questionToken',
        document: myDoc,
        datasources: myData
      })
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'You can say hello to me!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    QuizIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();

let CURRENT_STANDINGS = {
  "g": 0,
  "r": 0,
  "h": 0,
  "s": 0
}

let CURRENT_INDEX = 0;

function updateStats(g, r, h, s) {
  CURRENT_STANDINGS["g"] += g;
  CURRENT_STANDINGS["r"] += r;
  CURRENT_STANDINGS["h"] += h;
  CURRENT_STANDINGS["s"] += s;
  console.log("Update Stats: " + JSON.stringify(CURRENT_STANDINGS));
}

function getTotals() {
  let totals = CURRENT_STANDINGS["g"]
      + CURRENT_STANDINGS["r"]
      + CURRENT_STANDINGS["h"]
      + CURRENT_STANDINGS["s"];
  console.log("Get Totals totals: " + totals);
  console.log("Get Totals current standings: " + JSON.stringify(CURRENT_STANDINGS));

  let maximum = Math.max(CURRENT_STANDINGS["g"], CURRENT_STANDINGS["r"], CURRENT_STANDINGS["h"], CURRENT_STANDINGS["s"]);
  console.log("Get Totals maximum: " + JSON.stringify(maximum));

  let outputSpeech = "";
  let result = "";
  //27 questions, 100 points per
  let percentage = Math.round(100 * maximum/2700);
  console.log("Get Totals percentage: " + percentage);

  switch(maximum) {
      case CURRENT_STANDINGS["g"]:
          outputSpeech += "You are a Gryffindor! You answered "
              + percentage
              + " percent of the questions as a Gryffindor would. "
              + "With a lion as its crest and Professor McGonagall "
              + "at its head, Gryffindor is the house which most values "
              + "the virtues of courage, bravery and determination.";
          result = "Gryffindor";
          break;
      case CURRENT_STANDINGS["r"]:
          outputSpeech += "You are a Ravenclaw! You answered "
              + percentage
              + " percent of the questions as a Ravenclaw would. "
              + "Ravenclaws prize wit, learning, and wisdom. It's "
              + "an ethos etched into founder Rowena Ravenclaw diadem: "
              + "wit beyond measure is man's greatest treasure ";
          result = "Ravenclaw";
          break;
      case CURRENT_STANDINGS["h"]:
          outputSpeech += "You are a Hufflepuff! You answered "
              + percentage
              + " percent of the questions as a Hufflepuff would. "
              + "Hufflepuffs value hard work, patience, loyalty, and "
              + "fair play. The house has produced its share of great "
              + "wizards – not least Newt Scamander, author of Fantastic "
              + "Beasts and Where to Find Them";
          result = "Hufflepuff";
          break;
      case CURRENT_STANDINGS["s"]:
          outputSpeech += "You are a Slytherin! You answered "
              + percentage
              + " percent of the questions as a Slytherin would. "
              + "Slytherin produces more than its share of Dark wizards, "
              + "but also turns out leaders who are proud, ambitious and cunning. "
              + "Merlin is one particularly famous Slytherin";
          result = "Slytherin";
          break;
      default:
          outputSpeech += "You are a muggle! You answered "
              + percentage
              + " percent of the questions as a muggle would.";
          result = "muggle";
          break;
  }

  let gPercent = Math.round(100 * CURRENT_STANDINGS["g"]/2700);
  let rPercent = Math.round(100 * CURRENT_STANDINGS["r"]/2700);
  let hPercent = Math.round(100 * CURRENT_STANDINGS["h"]/2700);
  let sPercent = Math.round(100 * CURRENT_STANDINGS["s"]/2700);

  let resultInfo = {
    "outputSpeech": outputSpeech,
    "result": result,
    "percentages": [
                {
                    "name": "Gryffindor",
                    "percent": gPercent
                },
                {
                    "name": "Ravenclaw",
                    "percent": rPercent
                },
                {
                    "name": "Hufflepuff",
                    "percent": hPercent
                },
                {
                    "name": "Slytherin",
                    "percent": sPercent
                }
              ]
  };

  return resultInfo;
}

const QUESTIONS_ANSWERS = [
  {
    "question" : "Dawn or dusk?",
    "choices": ["dawn", "dusk"],
    "stats": [
      {
        "g": 100,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 100
      }
    ]
  },
  {
    "question": "Forest or river?",
    "choices": ["forest", "river"],
    "stats": [
      {
        "g": 100,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 100
      }
    ]
  },
  {
    "question": "Moon or stars?",
    "choices": ["moon", "stars"],
    "stats": [
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 100
      },
      {
        "g": 100,
        "r": 0,
        "h": 100,
        "s": 0
      }
    ]
  },
  {
    "question": "Which of the following would you most hate people to call you?",
    "choices": [
      "ordinary",
      "ignorant",
      "cowardly",
      "selfish"
    ],
    "stats": [
      {
        "g": 0,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 0
      }
    ]
  },
  {
    "question": "After you have died, what would you most like people to do when they hear your name?",
    "choices": [
      "miss you but smile",
      "ask for more stories about your adventures",
      "think with admiration of your achievements",
      "i do not care what people think of me after i am dead its what they think of me while i am alive that counts"
    ],
    "stats": [
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 0,
        "s": 100
      }
    ]
  },
  {
    "question": "How would you like to be known to history?",
    "choices": [
      "the wise",
      "the good",
      "the great",
      "the bold"
    ],
    "stats": [
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 0
      }
    ]
  },
  {
    "question": "Given the choice, would you rather invent a potion that would guarantee you:",
    "choices": [
      "love",
      "glory",
      "wisdom",
      "power"
    ],
    "stats": [
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 0,
        "s": 100
      }
    ]
  },
  {
    "question": "Once every century, the Flutterby bush produces flowers that adapt their scent to attract the unwary.  If it lured you, it would smell of:",
    "choices": [
      "a crackling log fire",
      "the sea",
      "fresh parchment",
      "home"
    ],
    "stats": [
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 0
      }
    ]
  },
  {
    "question": "Four goblets are placed before you.  Which would you choose to drink?",
    "choices": [
      "the foaming frothing silvery liquid that sparkles as though containing ground diamonds",
      "the smooth thick richly purple drink that gives off a delicious smell of chocolate and plums",
      "the golden liquid so bright that it hurts the eye and which makes sunspots dance all around the room",
      "the mysterious black liquid that gleams like ink and gives off fumes that make you see strange visions"
    ],
    "stats": [
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 0,
        "s": 100
      }
    ]
  },
  {
    "question": "What kind of instrument most pleases your ear?",
    "choices": [
      "the violin",
      "the trumpet",
      "the piano",
      "the drum"
    ],
    "stats": [
      {
        "g": 0,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 0
      }
    ]
  },
  {
    "question": "You enter an enchanted garden.  What would you be most curious to examine first?",
    "choices": [
      "the silver leafed tree bearing golden apples",
      "the fat red toadstools that appear to be talking to each other",
      "the bubbling pool in the depths of which something luminous is swirling",
      "the statue of an old wizard with a strangely twinkling eye"
    ],
    "stats": [
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 0
      }
    ]
  },
  {
    "question": "Four boxes are placed before you. Which would you try and open?",
    "choices": [
      "the small tortoiseshell box embellished with gold inside which some small creature seems to be squeaking",
      "the gleaming jet black box with a silver lock and key marked with a mysterious rune that you know to be the mark of merlin",
      "the ornate golden casket standing on clawed feet whose inscription warns that both secret knowledge and unbearable temptation lie within",
      "the small pewter box unassuming and plain with a scratched message upon it that reads I open only for the worthy"
    ],
    "stats": [
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 0
      }
    ]
  },
  {
    "question": "A troll has gone beserk at Hogwarts and is about to destroy irreplaceable items, including a cure for dragon pox, student records going back 1000 years, and a mysterious book full of strange runes, believed to have belonged to Merlin. In which order would you rescue these objects?",
    "choices": [
      "first the cure second the student records finally the book",
      "first the student records second the book finally the cure",
      "first the book second the cure finally the student records",
      "first the cure second the book finally the student records",
      "first the student records second the cure finally the book",
      "first the book second the student records finally the cure"
    ],
    "stats": [
      {
        "g": 100,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 100
      }
    ]
  },
  {
    "question": "Which of the following do you find most difficult to deal with?",
    "choices": [
      "hunger",
      "cold",
      "loneliness",
      "boredom",
      "being ignored"
    ],
    "stats": [
      {
        "g": 0,
        "r": 100,
        "h": 100,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 100
      },
      {
        "g": 100,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 100
      }
    ]
  },
  {
    "question": "Which would you rather be:",
    "choices": [
      "envied",
      "imitated",
      "trusted",
      "praised",
      "liked",
      "feared"
    ],
    "stats": [
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 100
      },
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 100,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 50
      },
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 0,
        "s": 100
      }
    ]
  },
  {
    "question": "If you could have any power, which would you choose?",
    "choices": [
      "the power to read minds",
      "the power of invisibility",
      "the power of superhuman strength",
      "the power to speak to animals",
      "the power to change the past",
      "the power to change your appearance at will"
    ],
    "stats": [
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 100
      },
      {
        "g": 100,
        "r": 0,
        "h": 50,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 50
      },
      {
        "g": 0,
        "r": 100,
        "h": 100,
        "s": 0
      },
      {
        "g": 50,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 50,
        "r": 100,
        "h": 0,
        "s": 0
      }
    ]
  },
  {
    "question": "What are you most looking forward to learning at Hogwarts?",
    "choices": [
      "apparition and disapparition being able to materialize and dematerialize at will",
      "transfiguration turning one object into another object",
      "flying on a broomstick",
      "hexes and jinxes",
      "all about magical creatures and how to befriend and care for them",
      "secrets about the castle",
      "every area of magic i can learn"
    ],
    "stats": [
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 100,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 0
      }
    ]
  },
  {
    "question": "Which of the following would you most like to study?",
    "choices": [
      "centaurs",
      "goblins",
      "merpeople",
      "ghosts",
      "vampires",
      "werewolves",
      "trolls"
    ],
    "stats": [
      {
        "g": 100,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 50
      },
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 100
      },
      {
        "g": 100,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 100,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 100
      }
    ]
  },
  {
    "question": "You and two friends need to cross a bridge guarded by a river troll who insists on fighting one of you before he will let all of you pass.  Do you:",
    "choices": [
      "attempt to confuse the troll into letting all three of you pass without fighting",
      "suggest drawing lots to decide which of you will fight",
      "suggest that all three of you should fight without telling the troll",
      "volunteer to fight"
    ],
    "stats": [
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 0
      }
    ]
  },
  {
    "question": "One of your house mates has cheated in a Hogwarts exam by using a Self-Spelling Quill. Now he has come top of the class in Charms, beating you into second place. Professor Flitwick is suspicious and asks you whether or not your classmate used a forbidden quill.  What do you do?",
    "choices": [
      "lie and say you do not know but hope that somebody else tells professor flitwick the truth",
      "tell professor flitwick that he ought to ask your classmate and resolve to tell your classmate that if he does not tell the truth you will",
      "tell professor flitwick the truth if your classmate is prepared to win by cheating he deserves to be found out",
      "you would not wait to be asked to tell professor flitwick the truth you would go to him immediately"
    ],
    "stats": [
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 0,
        "s": 100
      }
    ]
  },
  {
    "question": "A Muggle confronts you and says that they are sure you are a witch or wizard.  Do you:",
    "choices": [
      "ask what makes them think so",
      "agree and ask whether they would like a free sample of a jinx",
      "agree and walk away leaving them to wonder whether you are bluffing",
      "tell them that you are worried about their mental health and offer to call a doctor"
    ],
    "stats": [
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 0
      }
    ]
  },
  {
    "question": "Which nightmare would frighten you most?",
    "choices": [
      "standing on top of something very high and realizing suddenly that there are no hand or footholds nor any barrier to stop you falling",
      "an eye at the keyhole of the dark windowless room in which you are locked",
      "waking up to find that neither your friends nor your family have any idea who you are",
      "being forced to speak in such a silly voice that hardly anyone can understand you and everyone laughs at you"
    ],
    "stats": [
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 0,
        "s": 100
      }
    ]
  },
  {
    "question": "Which road tempts you most?",
    "choices": [
      "the wide sunny grassy lane",
      "the narrow dark lantern lit alley",
      "the twisting leaf strewn path through woods",
      "the cobbled street lined with ancient buildings"
    ],
    "stats": [
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 0
      }
    ]
  },
  {
    "question": "Late at night, walking alone down the street, you hear a peculiar cry that you believe to have a magical source.  Do you:",
    "choices": [
      "proceed with caution keeping one hand on your concealed wand and an eye out for any disturbance",
      "draw your wand and try to discover the source of the noise",
      "draw your wand and stand your ground",
      "withdraw into the shadows while mentally reviewing the most appropriate defensive and offensive spells should trouble occur"
    ],
    "stats": [
      {
        "g": 0,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 0
      },
      {
        "g": 0,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 0
      }
    ]
  },
  {
    "question": "If you were attending Hogwarts, which pet would you choose to take with you?",
    "choices": [
      "tabby cat",
      "siamese cat",
      "ginger cat",
      "black cat",
      "white cat",
      "tawny owl",
      "screech owl",
      "brown owl",
      "snowy owl",
      "barn owl",
      "common toad",
      "natterjack toad",
      "dragon toad",
      "harlequin toad",
      "three toed tree toad"
    ],
    "stats": [
      {
        "g": 50,
        "r": 0,
        "h": 0,
        "s": 50
      },
      {
        "g": 25,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 25,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 25,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 25,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 25,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 25,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 25,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 25,
        "r": 50,
        "h": 50,
        "s": 0
      },
      {
        "g": 25,
        "r": 100,
        "h": 0,
        "s": 0
      },
      {
        "g": 25,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 25,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 50,
        "r": 0,
        "h": 50,
        "s": 0
      },
      {
        "g": 25,
        "r": 0,
        "h": 100,
        "s": 0
      },
      {
        "g": 25,
        "r": 50,
        "h": 50,
        "s": 0
      }
    ]
  },
  {
    "question" : "Black or white?",
    "choices": [
      "black",
      "white"
    ],
    "stats": [
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 100
      },
      {
        "g": 0,
        "r": 100,
        "h": 100,
        "s": 0
      }
    ]
  },
  {
    "question" : "Heads or tails?",
    "choices": [
      "heads",
      "tails"
    ],
    "stats": [
      {
        "g": 0,
        "r": 100,
        "h": 100,
        "s": 0
      },
      {
        "g": 100,
        "r": 0,
        "h": 0,
        "s": 100
      }
    ]
  },
  {
    "question" : "Left or right?",
    "choices": [
      "left",
      "right"
    ],
    "stats": [
      {
        "g": 0,
        "r": 100,
        "h": 0,
        "s": 100
      },
      {
        "g": 100,
        "r": 0,
        "h": 100,
        "s": 0
      }
    ]
  }
];
