import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore/lite";
import TelegramBot from "node-telegram-bot-api";
import constants from "./constants.js";
import express from 'express';
import "dotenv/config";

// const initializeApp = require('firebase/app');
// const getFirestore = require("firebase/firestore/lite");
// const telegramBot = require('node-telegram-bot-api');
// require('dotenv').config();
const TOKEN = process.env.TOKEN;
// const constants = require('./constants.js');
// const express = require('express');

const aboutMessage = constants.aboutMessage;
const helpMessage = constants.helpMessage;
const startMessage = constants.startMessage;
const importantMessage = constants.importantMessage;
const verifyAdminMessage = constants.verifyAdminMessage;
const pairingNotFoundMessage = constants.pairingNotFoundMessage;
const messageSentMessage = constants.messageSentMessage;
const accessAngelSuccessMessage = constants.accessAngelSuccessMessage;
const accessMortalSuccessMessage = constants.accessMortalSuccessMessage;
const adminPairingsRetrievedMessage = constants.adminPairingsRetrievedMessage;

////////////// FIREBASE//////////////////////
// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
	apiKey: "AIzaSyDGgITz-LyxZTJ8gj9Vols2TbC-BhIFFW8",
	authDomain: "chelonia-anm-test.firebaseapp.com",
	projectId: "chelonia-anm-test",
	storageBucket: "chelonia-anm-test.appspot.com",
	messagingSenderId: "341282574599",
	appId: "1:341282574599:web:49d8fca564bbb0783af5a2"
};

// Initialize Firebase
const admin = initializeApp(firebaseConfig); //used to be app
const db = getFirestore(admin);

////////////// FIREBASE//////////////////////


////////////////// EXPRESS ROUTING SETUP //////////////////////////////////////////////
const app = express();
// cron job - ping every 2 mins to maintain instance
app.get('/', (req, res) => {
	res
		.status(200)
		.send('Hello, world!')
		.end();
});


// cron job - restart bot polling every 10 mins
// workaround? It dies randomly for no reason...
app.get('/restart', (req, res) => {
	/*
	bot = null;
	sleep(10000);
	bot = new telegramBot(token, {polling: true});
	*/

	bot.stopPolling();
	sleep(2000);
	bot.startPolling();
	//console.log("Restarted bot.");

	res
		.status(200)
		.send("Restarted bot.")
		.end();
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
	console.log(`App listening on port ${PORT}`);
	console.log('Press Ctrl+C to quit.');
});

///////////////////////////////// EXPRESS CRON ///////////////////////////////////////////////////////

const bot = new TelegramBot(TOKEN, { polling: true });

// bot.on('message', (message) => {
//     console.log(message.text);
//     let chat_id = message.from.id;
//     //DIALOGFLOW
//     bot.sendMessage(chat_id, "HELLO FROM NODEJS");
// })

bot.onText(/\/echo (.+)/, (msg, match) => {
	// 'msg' is the received Message from Telegram
	// 'match' is the result of executing the regexp above on the text content
	// of the message
	const chatId = msg.chat.id;
	const resp = match[1]; // the captured "whatever"

	// send back the matched "whatever" to the chat
	bot.sendMessage(chatId, resp);
});

// Listen for any kind of message. There are different kinds of messages.
bot.on('message', (msg) => {
	const chatId = msg.chat.id;
	let dummyResponse; // to pass to processAction if Dialogflow is bypassed

	if (msg.text.slice(0, 7).toLowerCase() == "/angel " && msg.text.slice(7) != '') {
		console.log(chatId + ": " + msg.text);
		sendMessageToAngel(chatId, msg.text.slice(7));
	} else if (msg.text.slice(0, 3).toLowerCase() == "/a " && msg.text.slice(3) != '') {
		console.log(chatId + ": " + msg.text);
		sendMessageToAngel(chatId, msg.text.slice(3));
	} else if (msg.text.slice(0, 8).toLowerCase() == "/mortal " && msg.text.slice(8) != '') {
		console.log(chatId + ": " + msg.text);
		sendMessageToMortal(chatId, msg.text.slice(8));
	} else if (msg.text.slice(0, 3).toLowerCase() == "/m " && msg.text.slice(3) != '') {
		console.log(chatId + ": " + msg.text);
		sendMessageToMortal(chatId, msg.text.slice(3));
	} else {

		switch (msg.text) {

			case "/about":
				bot.sendMessage(chatId, aboutMessage);
				break;

			case "/help":
				bot.sendMessage(chatId, helpMessage);
				break;

			case "/start":
				bot.sendMessage(chatId, startMessage);
				break;

			case "/impt":
				bot.sendMessage(chatId, importantMessage);
				break;

			case "/admin":
				bot.sendMessage(chatId, verifyAdminMessage);
				break;

			case `${CheloniaPassword} Chelonia`:
				assignPairings("Chelonia", chatId);
				break;

			case `${AonyxPassword} Aonyx`:
				assignPairings("Aonyx", chatId, false);
				break;

			case `listUsers ${CheloniaPassword}`:
				listUsers("Chelonia", chatId);
				break;

			case `listUsers ${AonyxPassword}`:
				listUsers("Aonyx", chatId);
				break;

			case `getPairings ${CheloniaPassword}`:
				getPairings("Chelonia", chatId);
				break;

			case `getPairings ${AonyxPassword}`:
				getPairings("Aonyx", chatId);
				break;

			case "/unregister":
				unregisterUser(chatId);
				break;

			// case "test":
			// case "/test":
			// 	getPairings(chatId, "B");
			// 	break;

			default:
				awaitAndSendResponse(msg).catch(err => console.error(`Error awaitAndSendResponse: ${err}`));

		}
	}
});

bot.on('callback_query', (query) => {
	const queryId = query.id;
	const callbackData = query.data.split(' ');
	bot.answerCallbackQuery(queryId);

	processCallbackQuery(query);
});

async function awaitAndSendResponse(msg) {
	const chatId = msg.chat.id;
	bot.sendChatAction(chatId, "typing");
	const projectId = 'chelonia-angel-mortal-db';

	const sessionClient = new dialogflow.SessionsClient();
	let sessionPath = null;
	if (activeSessions[chatId]) {
		sessionPath = activeSessions[chatId].sessionPath;
		activeSessions[chatId] = {
			time: Date.now(),
			sessionPath: sessionPath
		};
	} else {
		const sessionId = uuid.v4();
		sessionPath = sessionClient.sessionPath(projectId, sessionId);
		activeSessions[chatId] = {
			time: Date.now(),
			sessionPath: sessionPath
		};
	}

	// The text query request.
	const request = {
		session: sessionPath,
		queryInput: {
			text: {
				text: msg.text,
				languageCode: 'en-US',
			},
		},
	};

	// Send request and log result
	const responses = await sessionClient.detectIntent(request);
	//console.log('Detected intent');
	const result = responses[0].queryResult;
	/*console.log(`  Query: ${result.queryText}`);
	console.log(`  Response: ${result.fulfillmentText}`);
	if (result.intent) {
		console.log(`  Intent: ${result.intent.displayName}`);
	} else {
		console.log(`  No intent matched.`);
	}*/

	// initialise text response to send back to user
	var responseText;
	var responseOptions = { parse_mode: "Markdown" };
	var sendingStyle = null;
	if (result.fulfillmentText) {
		responseText = result.fulfillmentText;
	}

	// if matched intent contains an action, call processAction
	if (result.action) {
		const actionResponse = await processAction(responses, chatId);

		// update each field only if processAction returns a non-null value
		if (actionResponse.message) {
			responseText = actionResponse.message;
		}
		if (actionResponse.options) {
			responseOptions = actionResponse.options;
		}
		if (actionResponse.sendingStyle) {
			sendingStyle = actionResponse.sendingStyle;
		}
	}

	/* Not currently needed
	// console.log(responses[0].queryResult.outputContexts);
	responses[0].queryResult.outputContexts.forEach(context => {
	  // There is a bug in gRPC that the returned google.protobuf.Struct
	  // value contains fields with value of null, which causes error
	  // when encoding it back. Converting to JSON and back to proto
	  // removes those values.
	  context.parameters = structjson.jsonToStructProto(
		structjson.structProtoToJson(context.parameters)
	  );
	});
	*/

	// send message back to Telegram
	if (sendingStyle === "sendAsJoke") {
		sendMultipleMessages(chatId, responseText, 2000);
	} else {
		bot.sendMessage(chatId, responseText, responseOptions);
	}
}